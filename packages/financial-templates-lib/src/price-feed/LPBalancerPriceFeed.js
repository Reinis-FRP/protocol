const { PriceFeedInterface } = require("./PriceFeedInterface");
const { BlockFinder } = require("./utils");
const { ConvertDecimals } = require("@uma/common");
const assert = require("assert");
class LPBalancerPriceFeed extends PriceFeedInterface {
  /**
   * @notice Constructs new price feed object that tracks how much of a provided token a single LP share is redeemable
   *         for.
   * @dev Note: this can support most LP shares and may support other types of pool contracts.
   * @param {Object} logger Winston module used to send logs.
   * @param {Object} web3 Provider from Truffle instance to connect to Ethereum network.
   * @param {Object} erc20Abi ERC20 abi object to create a contract instance.
   * @param {String} poolAddress Ethereum address of the LP pool to monitor.
   * @param {String} tokenAddress Ethereum address of the per-share token balance we're tracking within the pool.
   * @param {Function} getTime Returns the current time.
   * @param {Function} [blockFinder] Optionally pass in a shared blockFinder instance (to share the cache).
   * @param {Integer} [minTimeBetweenUpdates] Minimum amount of time that must pass before update will actually run
   *                                        again.
   * @param {Integer} [priceFeedDecimals] Precision that the caller wants precision to be reported in.
   * @return None or throws an Error.
   */
  constructor({
    logger,
    web3,
    erc20Abi,
    balancerAbi,
    poolAddress,
    tokenAddress,
    getTime,
    blockFinder,
    minTimeBetweenUpdates = 60,
    priceFeedDecimals = 18,
  }) {
    super();

    // Assert required arguments.
    assert(logger, "logger required");
    assert(web3, "web3 required");
    assert(erc20Abi, "erc20Abi required");
    assert(balancerAbi, "balancerAbi required");
    assert(poolAddress, "poolAddress required");
    assert(tokenAddress, "tokenAddress required");
    assert(getTime, "getTime required");

    this.logger = logger;
    this.web3 = web3;
    this.toBN = web3.utils.toBN;
    this.fromWei = this.web3.utils.fromWei;

    this.pool = new web3.eth.Contract(balancerAbi, poolAddress);
    this.token = new web3.eth.Contract(erc20Abi, tokenAddress);
    this.erc20Abi = erc20Abi;
    this.uuid = `LPBalancer-${poolAddress}-${tokenAddress}`;
    this.getTime = getTime;
    this.priceFeedDecimals = priceFeedDecimals;
    this.minTimeBetweenUpdates = minTimeBetweenUpdates;
    this.blockFinder = blockFinder || BlockFinder(web3.eth.getBlock);
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
      // this.price = await this._getPrice(await this.web3.eth.getBlock("latest"));
      this.price = this.toBN("0");
      this.lastUpdateTime = currentTime;
    }
  }

  async _getPrice(block, verbose = false) {
    const blockNumber = block.number;
    const lpTotalSupply = await this._convertTokenDecimals(
      this.toBN(await this.pool.methods.totalSupply().call(undefined, blockNumber)),
      this.pool.options.address
    );
    const tokensInPool = await this._convertTokenDecimals(
      await this._getBalance(blockNumber, this.token.options.address),
      this.token.options.address
    );

    // To get the price, we divide the total tokens in the pool by the number of LP shares.
    // Note: this produces a price that is in terms of 18 decimals.
    // Note: if the total supply is zero, then we just set the price to 0 since no LP tokens exist.
    const price = lpTotalSupply.isZero()
      ? this.web3.utils.toBN("0")
      : tokensInPool.mul(this.toBN("10").pow(this.toBN(18))).divRound(lpTotalSupply);

    if (verbose) {
      console.log(await this._printVerbose(block, lpTotalSupply, tokensInPool, price));
    }

    // _convertDecimals takes a price with 18 decimals and returns it in terms of priceFeedDecimals.
    return await this._convertToPriceFeedDecimals(price);
  }

  // Prints verbose logs

  async _printVerbose(block, lpTotalSupply, tokensInPool, price) {
    const baseSymbol = (await this._tokenDetails(this.pool.options.address)).symbol;
    const quoteSymbol = (await this._tokenDetails(this.token.options.address)).symbol;
    const baseBalance = this.fromWei(lpTotalSupply);
    const quoteBalance = this.fromWei(tokensInPool);
    let output = "";
    output += `\n(Balancer:${quoteSymbol} per pool share) Historical pricing @ ${block.timestamp}:`;
    output += `\n  - ✅ Spot Price: ${this.fromWei(price)}`;
    output += `\n  - ⚠️  If you want to manually verify the specific spot price, you can query this data on-chain at block #${block.number} from Ethereum archive node`;
    output += `\n  - call getBalance with ${this.token.options.address} as parameter on pool contract ${this.pool.options.address}:`;
    output += `\n    - this should get underlying ${quoteBalance} ${quoteSymbol} pool balance`;
    output += `\n  - call totalSupply on pool contract ${this.pool.options.address}:`;
    output += `\n    - this should get total outstanding ${baseBalance} ${baseSymbol} tokens`;
    output += `\n  - price can be calculated as ${quoteBalance}/${baseBalance}`;
    output += `\n  - ⚠️  This only shows ${quoteSymbol} component in pool token value. When calculating total ${baseSymbol} value, do not forget to check other underlying tokens by calling getFinalTokens`;
    output += `\n    - this should also show ${JSON.stringify(await this._getOtherTokens())}`;
    return output;
  }

  // Gets historical token balance in Balancer pool
  async _getBalance(blockNumber, address) {
    let rawBalance;
    try {
      rawBalance = this.toBN(await this.pool.methods.getBalance(address).call(undefined, blockNumber));
      if (rawBalance.isZero()) {
        rawBalance = null;
      }
    } catch (err) {
      rawBalance = null;
    }
    return rawBalance;
  }

  async _getOtherTokens() {
    const allTokens = await this.pool.methods.getFinalTokens().call();
    let otherTokens = [];
    for (const token in allTokens) {
      const tokenSymbol = (await this._tokenDetails(allTokens[token])).symbol;
      let tokenSymbolAddress = {};
      tokenSymbolAddress[tokenSymbol] = allTokens[token];
      if (allTokens[token] != this.token.options.address) {
        otherTokens.push(tokenSymbolAddress);
      }
    }
    return otherTokens;
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

  // Converts decimals from 18 decimals to the configured price feed decimals.
  async _convertToPriceFeedDecimals(value) {
    if (!value) {
      return null;
    }
    const convertOutputDecimals = ConvertDecimals(18, this.priceFeedDecimals, this.web3);
    return convertOutputDecimals(value);
  }

  // Converts raw value from the token decimals to 18 decimals usable by fromWei utility.
  async _convertTokenDecimals(value, address) {
    if (!value) {
      return null;
    }
    const convertTokenDecimals = ConvertDecimals(parseInt((await this._tokenDetails(address)).decimals), 18, this.web3);
    return convertTokenDecimals(value);
  }
}

module.exports = { LPBalancerPriceFeed };
