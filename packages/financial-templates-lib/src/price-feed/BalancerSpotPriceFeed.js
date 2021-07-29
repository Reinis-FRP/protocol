const { PriceFeedInterface } = require("./PriceFeedInterface");
const { BlockFinder } = require("./utils");
const { ConvertDecimals } = require("@uma/common");
const assert = require("assert");

class BalancerSpotPriceFeed extends PriceFeedInterface {
  /**
   * @notice Constructs new price feed object that tracks the price of one Balancer pool tokens in terms of another pool token.
   * @param {Object} logger Winston module used to send logs.
   * @param {Object} balancerAbi BalancerSpot abi object to create a contract instance.
   * @param {Object} erc20Abi ERC20 abi object to create a contract instance.
   * @param {Object} web3 Provider from Truffle instance to connect to Ethereum network.
   * @param {String} poolAddress Ethereum address of the Balancer pool.
   * @param {String} quoteAddress Ethereum address of the quote token.
   * @param {String} baseAddress Ethereum address of the base token.
   * @param {Function} getTime Returns the current time.
   * @param {Function} [blockFinder] Optionally pass in a shared blockFinder instance (to share the cache).
   * @param {Integer} [minTimeBetweenUpdates] Minimum amount of time that must pass before update will actually run
   *                                        again.
   * @param {Integer} [priceFeedDecimals] Precision that the caller wants precision to be reported in.
   * @return None or throws an Error.
   */
  constructor({
    logger,
    balancerAbi,
    erc20Abi,
    web3,
    poolAddress,
    quoteAddress,
    baseAddress,
    getTime,
    blockFinder,
    minTimeBetweenUpdates = 60,
    priceFeedDecimals = 18,
  }) {
    super();

    // Assert required inputs.
    assert(logger, "logger required");
    assert(balancerAbi, "balancerAbi required");
    assert(erc20Abi, "erc20Abi required");
    assert(web3, "web3 required");
    assert(poolAddress, "BalancerSpotPriceFeed requires poolAddress");
    assert(quoteAddress, "BalancerSpotPriceFeed requires quoteAddress");
    assert(baseAddress, "BalancerSpotPriceFeed requires baseAddress");
    assert(getTime, "getTime required");

    this.logger = logger;
    this.web3 = web3;

    this.pool = new web3.eth.Contract(balancerAbi, poolAddress);
    this.poolAddress = poolAddress;
    this.quoteAddress = quoteAddress;
    this.baseAddress = baseAddress;
    this.erc20Abi = erc20Abi;
    this.uuid = `BalancerSpot-${poolAddress}`;
    this.getTime = getTime;
    this.priceFeedDecimals = priceFeedDecimals;
    this.minTimeBetweenUpdates = minTimeBetweenUpdates;
    this.blockFinder = blockFinder || BlockFinder(web3.eth.getBlock);
    this.toBN = this.web3.utils.toBN;
    this.fromWei = this.web3.utils.fromWei;
    this.tokenDetails = {};
  }

  getCurrentPrice() {
    return this.price;
  }

  async getHistoricalPrice(time, verbose = false) {
    const block = await this.blockFinder.getBlockForTimestamp(time);
    return this._getPrice(block, verbose);
  }

  getLastUpdateTime() {
    return this.lastUpdateTime;
  }

  getLookback() {
    // Return infinity since this price feed can technically look back as far as needed.
    return Infinity;
  }

  getPriceFeedDecimals() {
    return this.priceFeedDecimals;
  }

  async update() {
    const currentTime = await this.getTime();
    if (this.lastUpdateTime === undefined || currentTime >= this.lastUpdateTime + this.minTimeBetweenUpdates) {
      this.price = await this._getPrice(await this.web3.eth.getBlock("latest"));
      this.lastUpdateTime = currentTime;
    }
  }

  async _getPrice(block, verbose = false) {
    const blockNumber = block.number;
    const baseBalance = await this._getBalance(blockNumber, this.baseAddress);
    const quoteBalance = await this._getBalance(blockNumber, this.quoteAddress);
    const baseWeight = await this._getWeight(blockNumber, this.baseAddress);
    const quoteWeight = await this._getWeight(blockNumber, this.quoteAddress);
    let price;
    try {
      price = quoteBalance
        .mul(this.toBN("10").pow(this.toBN(18)))
        .div(baseBalance)
        .mul(baseWeight)
        .div(quoteWeight);
      if (price.isZero()) {
        price = null;
      }
    } catch (err) {
      price = null;
    }

    if (verbose) {
      console.log(await this._printVerbose(block, price, baseWeight, baseBalance, quoteWeight, quoteBalance));
    }

    return await this._convertToPriceFeedDecimals(price);
  }

  // Prints verbose logs

  async _printVerbose(block, price, baseWeight, baseBalance, quoteWeight, quoteBalance) {
    const baseSymbol = (await this._tokenDetails(this.baseAddress)).symbol;
    const quoteSymbol = (await this._tokenDetails(this.quoteAddress)).symbol;
    let output = "";
    output += `\n(Balancer:${baseSymbol}/${quoteSymbol}) Historical pricing @ ${block.timestamp}:`;
    output += `\n  - ✅ Spot Price: ${this.fromWei(price)}`;
    output += `\n  - ⚠️  If you want to manually verify the specific spot price, you can query this data on-chain at block #${block.number} from Ethereum archive node`;
    output += `\n  - call getFinalTokens() method on pool contract ${this.poolAddress} to get reserve token addresses`;
    output += "\n  - call getBalance and getNormalizedWeight with reserve tokens as parameters, this should get:";
    output += `\n    - base token with ${this.fromWei(baseWeight) * 100}% had ${this.fromWei(
      baseBalance
    )} ${baseSymbol}`;
    output += `\n    - quote token with ${this.fromWei(quoteWeight) * 100}% had ${this.fromWei(
      quoteBalance
    )} ${quoteSymbol}`;
    output += `\n    - price can be derived as (${this.fromWei(quoteBalance)}/${this.fromWei(
      quoteWeight
    )})/(${this.fromWei(baseBalance)}/${this.fromWei(baseWeight)})`;
    return output;
  }

  // Gets historical token balance in Balancer pool
  async _getBalance(blockNumber, address) {
    let balance;
    try {
      balance = this.toBN(await this.pool.methods.getBalance(address).call(undefined, blockNumber));
      if (balance.isZero()) {
        balance = null;
      }
    } catch (err) {
      balance = null;
    }
    return await this._convertTokenDecimals(balance, address);
  }

  // Gets token weight in Balancer pool.
  async _getWeight(blockNumber, address) {
    let weight;
    try {
      weight = this.toBN(await this.pool.methods.getNormalizedWeight(address).call(undefined, blockNumber));
      if (weight.isZero()) {
        weight = null;
      }
    } catch (err) {
      weight = null;
    }
    return weight;
  }

  // Caches token decimals and symbol.
  async _tokenDetails(address) {
    if (!this.tokenDetails[address]) {
      const token = new this.web3.eth.Contract(this.erc20Abi, address);

      this.tokenDetails[address] = {};
      try {
        this.tokenDetails[address].decimals = await token.methods.decimals().call();
      } catch (err) {
        this.tokenDetails[address].decimals = 18;
      }
      try {
        this.tokenDetails[address].symbol = await token.methods.symbol().call();
      } catch (err) {
        this.tokenDetails[address].symbol = "";
      }
    }
    return this.tokenDetails[address];
  }

  // Converts raw price adjusted by pool token decimal difference.
  async _convertPairDecimals(value) {
    const convertPairDecimals = ConvertDecimals(
      parseInt((await this._tokenDetails(this.quoteAddress)).decimals),
      parseInt((await this._tokenDetails(this.baseAddress)).decimals),
      this.web3
    );
    return convertPairDecimals(value);
  }

  // Converts raw value from the token decimals to 18 decimals usable by fromWei utility.
  async _convertTokenDecimals(value, address) {
    const convertTokenDecimals = ConvertDecimals(parseInt((await this._tokenDetails(address)).decimals), 18, this.web3);
    return convertTokenDecimals(value);
  }

  // Converts decimals from 18 decimals to the configured price feed decimals.
  async _convertToPriceFeedDecimals(value) {
    const convertOutputDecimals = ConvertDecimals(18, this.priceFeedDecimals, this.web3);
    return convertOutputDecimals(value);
  }
}

module.exports = { BalancerSpotPriceFeed };
