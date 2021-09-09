const { PriceFeedInterface } = require("./PriceFeedInterface");
const { BlockFinder } = require("./utils");
const { ConvertDecimals } = require("@uma/common");
const assert = require("assert");

class LPUniswapPriceFeed extends PriceFeedInterface {
  /**
   * @notice Constructs new price feed object that tracks how much of a provided token a single Uniswap LP share is redeemable
   *         for.
   * @param {Object} logger Winston module used to send logs.
   * @param {Object} uniswapAbi Uniswap Market Truffle ABI object to create a contract instance to query prices.
   * @param {Object} erc20Abi ERC20 abi object to create a contract instance.
   * @param {Object} web3 Provider from Truffle instance to connect to Ethereum network.
   * @param {String} poolAddress Ethereum address of the Uniswap LP token (base).
   * @param {String} tokenAddress Ethereum address of the Uniswap reserve token (quote).
   * @param {Function} getTime Returns the current time.
   * @param {Function} [blockFinder] Optionally pass in a shared blockFinder instance (to share the cache).
   * @param {Integer} [priceFeedDecimals] Precision that the caller wants precision to be reported in.
   * @return None or throws an Error.
   */
  constructor({
    logger,
    uniswapAbi,
    erc20Abi,
    web3,
    poolAddress,
    tokenAddress,
    getTime,
    blockFinder,
    priceFeedDecimals = 18,
  }) {
    super();

    // Assert required inputs.
    assert(logger, "logger required");
    assert(uniswapAbi, "uniswapAbi required");
    assert(erc20Abi, "erc20Abi required");
    assert(web3, "web3 required");
    assert(poolAddress, "LPUniswapPriceFeed requires poolAddress");
    assert(tokenAddress, "LPUniswapPriceFeed requires tokenAddress");
    assert(getTime, "getTime required");

    this.logger = logger;
    this.web3 = web3;

    this.pool = new web3.eth.Contract(uniswapAbi, poolAddress);
    this.token = new web3.eth.Contract(erc20Abi, tokenAddress);
    this.erc20Abi = erc20Abi;
    this.uuid = `LPUniswap-${poolAddress}-${tokenAddress}`;
    this.getTime = getTime;
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
    const blockNumber = block.number;
    const reserves = await this.pool.methods.getReserves().call(undefined, block.number);
    const tokens = [];
    tokens[0] = await this.pool.methods.token0().call();
    tokens[1] = await this.pool.methods.token1().call();
    const tokenIndex = this.token.options.address.toLowerCase() === tokens[0].toLowerCase() ? 0 : 1;
    const lpTotalSupply = await this._convertTokenDecimals(
      this.toBN(await this.pool.methods.totalSupply().call(undefined, blockNumber)),
      this.pool.options.address
    );
    const tokensInPool = await this._convertTokenDecimals(reserves[tokenIndex], tokens[tokenIndex]);

    // To get the price, we divide the total tokens in the pool by the number of LP shares.
    // Note: this produces a price that is in terms of 18 decimals.
    // Note: if the total supply is zero, then we just set the price to 0 since no LP tokens exist.
    const price = lpTotalSupply.isZero()
      ? this.web3.utils.toBN("0")
      : tokensInPool.mul(this.toBN("10").pow(this.toBN(18))).divRound(lpTotalSupply);

    if (verbose) {
      console.log(await this._printVerbose(block, lpTotalSupply, tokensInPool, price, tokenIndex, tokens));
    }

    // _convertDecimals takes a price with 18 decimals and returns it in terms of priceFeedDecimals.
    return await this._convertToPriceFeedDecimals(price);
  }

  // Prints verbose logs

  async _printVerbose(block, lpTotalSupply, tokensInPool, price, tokenIndex, tokens) {
    const baseSymbol = (await this._tokenDetails(this.pool.options.address)).symbol;
    const quoteSymbol = (await this._tokenDetails(this.token.options.address)).symbol;
    const otherSymbol = (await this._tokenDetails(tokens[Math.abs(1 - tokenIndex)])).symbol;
    const baseBalance = this.fromWei(lpTotalSupply);
    const quoteBalance = this.fromWei(tokensInPool);
    let output = "";
    output += `\n(Uniswap:${quoteSymbol} per pool share) Historical pricing @ ${block.timestamp}:`;
    output += `\n  - ✅ Spot Price: ${this.fromWei(price)}`;
    output += `\n  - ⚠️  If you want to manually verify the specific spot price, you can query this data on-chain at block #${block.number} from Ethereum archive node`;
    output += `\n  - call token0 and token1 on pool contract ${this.pool.options.address} to identify the index of  ${quoteSymbol} reserve tokens:`;
    output += `\n    - this should get quote token index of ${tokenIndex} as token${tokenIndex} returned ${quoteSymbol} address ${this.token.options.address}`;
    output += `\n  - call getReserves on pool contract ${this.pool.options.address}:`;
    output += `\n    - this should get underlying ${quoteBalance} ${quoteSymbol} pool balance as index ${tokenIndex} from the output`;
    output += `\n  - call totalSupply on pool contract ${this.pool.options.address}:`;
    output += `\n    - this should get total outstanding ${baseBalance} ${baseSymbol} tokens`;
    output += `\n  - price can be calculated as ${quoteBalance}/${baseBalance}`;
    output += `\n  - ⚠️  This only shows ${quoteSymbol} component in pool token value. When calculating total ${baseSymbol} value, do not forget to check the ${otherSymbol} balance`;
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

module.exports = { LPUniswapPriceFeed };
