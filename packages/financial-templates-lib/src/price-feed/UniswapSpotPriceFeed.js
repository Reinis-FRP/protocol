const { PriceFeedInterface } = require("./PriceFeedInterface");
const { BlockFinder } = require("./utils");
const { ConvertDecimals } = require("@uma/common");
const assert = require("assert");

class UniswapSpotPriceFeed extends PriceFeedInterface {
  /**
   * @notice Constructs new price feed object that tracks the price of one Uniswap pool tokens in terms of another pool token.
   * @param {Object} logger Winston module used to send logs.
   * @param {Object} uniswapAbi Uniswap Market Truffle ABI object to create a contract instance to query prices.
   * @param {Object} erc20Abi ERC20 abi object to create a contract instance.
   * @param {Object} web3 Provider from Truffle instance to connect to Ethereum network.
   * @param {String} uniswapAddress Ethereum address of the Uniswap market the price feed is monitoring.
   * @param {Function} getTime Returns the current time.
   * @param {Bool} invertPrice Indicates if the Uniswap pair is computed as reserve0/reserve1 (true) or reserve1/reserve0 (false).
   * @param {Function} [blockFinder] Optionally pass in a shared blockFinder instance (to share the cache).
   * @param {Integer} [priceFeedDecimals] Precision that the caller wants precision to be reported in.
   * @return None or throws an Error.
   */
  constructor({
    logger,
    uniswapAbi,
    erc20Abi,
    web3,
    uniswapAddress,
    getTime,
    invertPrice,
    blockFinder,
    priceFeedDecimals = 18,
  }) {
    super();

    // Assert required inputs.
    assert(logger, "logger required");
    assert(uniswapAbi, "uniswapAbi required");
    assert(erc20Abi, "erc20Abi required");
    assert(web3, "web3 required");
    assert(uniswapAddress, "UniswapSpotPriceFeed requires uniswapAddress");
    assert(getTime, "getTime required");

    this.logger = logger;
    this.web3 = web3;

    this.pool = new web3.eth.Contract(uniswapAbi, uniswapAddress);
    this.uniswapAddress = uniswapAddress;
    this.erc20Abi = erc20Abi;
    this.uuid = `UniswapSpot-${uniswapAddress}`;
    this.getTime = getTime;
    this.invertPrice = invertPrice;
    this.priceFeedDecimals = priceFeedDecimals;
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
    const reserves = await this.pool.methods.getReserves().call(undefined, block.number);
    const token0 = await this.pool.methods.token0().call();
    const token1 = await this.pool.methods.token1().call();
    const reserve0 = this.toBN(await this._convertTokenDecimals(reserves[0], token0));
    const reserve1 = this.toBN(await this._convertTokenDecimals(reserves[1], token1));
    let price;
    try {
      price = this.invertPrice
        ? reserve0.mul(this.toBN("10").pow(this.toBN(18))).div(reserve1)
        : reserve1.mul(this.toBN("10").pow(this.toBN(18))).div(reserve0);
      if (price.isZero()) {
        price = null;
      }
    } catch (err) {
      price = null;
    }

    if (verbose) {
      console.log(await this._printVerbose(block, price, reserve0, token0, reserve1, token1));
    }

    return await this._convertToPriceFeedDecimals(price);
  }

  // Prints verbose logs

  async _printVerbose(block, price, reserve0, token0, reserve1, token1) {
    let baseAddress;
    let baseBalance;
    let quoteAddress;
    let quoteBalance;
    if (this.invertPrice) {
      baseAddress = token1;
      baseBalance = reserve1;
      quoteAddress = token0;
      quoteBalance = reserve0;
    } else {
      baseAddress = token0;
      baseBalance = reserve0;
      quoteAddress = token1;
      quoteBalance = reserve1;
    }
    const baseSymbol = (await this._tokenDetails(baseAddress)).symbol;
    const quoteSymbol = (await this._tokenDetails(quoteAddress)).symbol;
    let output = "";
    output += `\n(Uniswap:${baseSymbol}/${quoteSymbol}) Historical pricing @ ${block.timestamp}:`;
    output += `\n  - ✅ Spot Price: ${this.fromWei(price)}`;
    output += `\n  - ⚠️  If you want to manually verify the specific spot price, you can query this data on-chain at block #${block.number} from Ethereum archive node`;
    output += `\n  - call token0() and token1() on pool contract ${this.uniswapAddress} to get reserve token addresses`;
    output += `\n  - base token had ${this.fromWei(baseBalance)} ${baseSymbol}`;
    output += `\n  - quote token had ${this.fromWei(quoteBalance)} ${quoteSymbol}`;
    output += `\n    - price can be derived as ${this.fromWei(quoteBalance)}/${this.fromWei(baseBalance)}`;
    return output;
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

module.exports = { UniswapSpotPriceFeed };
