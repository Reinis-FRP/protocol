const { PriceFeedInterface } = require("./PriceFeedInterface");
const { BlockFinder } = require("./utils");
const { ConvertDecimals } = require("@uma/common");
const assert = require("assert");

class CompoundPriceFeed extends PriceFeedInterface {
  /**
   * @notice Constructs new price feed object that tracks the price of cTokens in terms of underlying.
   * @param {Object} logger Winston module used to send logs.
   * @param {Object} compoundAbi Compound abi object to create a contract instance.
   * @param {Object} erc20Abi ERC20 abi object to create a contract instance.
   * @param {Object} web3 Provider from Truffle instance to connect to Ethereum network.
   * @param {String} compoundAddress Ethereum address of the cToken.
   * @param {Function} getTime Returns the current time.
   * @param {Function} [blockFinder] Optionally pass in a shared blockFinder instance (to share the cache).
   * @param {Integer} [minTimeBetweenUpdates] Minimum amount of time that must pass before update will actually run
   *                                        again.
   * @param {Integer} [priceFeedDecimals] Precision that the caller wants precision to be reported in.
   * @return None or throws an Error.
   */
  constructor({
    logger,
    compoundAbi,
    erc20Abi,
    web3,
    compoundAddress,
    getTime,
    blockFinder,
    minTimeBetweenUpdates = 60,
    priceFeedDecimals = 18,
  }) {
    super();

    // Assert required inputs.
    assert(logger, "logger required");
    assert(compoundAbi, "compoundAbi required");
    assert(erc20Abi, "erc20Abi required");
    assert(web3, "web3 required");
    assert(compoundAddress, "compoundAddress required");
    assert(getTime, "getTime required");

    this.logger = logger;
    this.web3 = web3;

    this.compound = new web3.eth.Contract(compoundAbi, compoundAddress);
    this.erc20Abi = erc20Abi;
    this.uuid = `Compound-${compoundAddress}`;
    this.getTime = getTime;
    this.priceFeedDecimals = priceFeedDecimals;
    this.minTimeBetweenUpdates = minTimeBetweenUpdates;
    this.blockFinder = blockFinder || BlockFinder(web3.eth.getBlock);
    this.toBN = this.web3.utils.toBN;
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
    const accrualBlockNumber = await this.compound.methods.accrualBlockNumber().call(undefined, blockNumber);
    const exchangeRateStored = this.toBN(await this.compound.methods.exchangeRateStored().call(undefined, blockNumber));
    const supplyRatePerBlock = this.toBN(await this.compound.methods.supplyRatePerBlock().call(undefined, blockNumber));
    const blockDelta = this.toBN(blockNumber - accrualBlockNumber);
    const supplyInterestAccrued = supplyRatePerBlock.mul(blockDelta).mul(exchangeRateStored);
    const newExchangeRate = exchangeRateStored
      .mul(this.toBN(10 ** 18))
      .add(supplyInterestAccrued)
      .divRound(this.toBN(10 ** 18));
    if (verbose) {
      console.group(
        `\nHistorical ${(await this._cTokenDetails()).symbol}/${
          (await this._underlyingTokenDetails()).symbol
        } exchange rate for latest block #${blockNumber} @ ${block.timestamp}`
      );
      console.log(`- ${blockDelta} blocks since latest accrual block #${accrualBlockNumber}`);
      console.log(`- exchangeRateStored: ${exchangeRateStored}`);
      console.log(`- supplyRatePerBlock: ${supplyRatePerBlock}`);
      console.log(`- Updated raw exchange rate would become: ${newExchangeRate}`);
      console.log(
        `- ${(await this._cTokenDetails()).symbol} has ${(await this._cTokenDetails()).decimals} decimals and ${
          (await this._underlyingTokenDetails()).symbol
        } has ${(await this._underlyingTokenDetails()).decimals} decimals`
      );
      console.groupEnd();
    }
    return await this._convertDecimals(newExchangeRate);
  }

  async _cTokenDetails() {
    if (!this.cTokenDetails) {
      this.cTokenDetails = {};
      try {
        this.cTokenDetails.decimals = await this.compound.methods.decimals().call();
      } catch (err) {
        this.cTokenDetails.decimals = 18;
      }
      try {
        this.cTokenDetails.symbol = await this.compound.methods.symbol().call();
      } catch (err) {
        this.cTokenDetails.symbol = "";
      }
    }
    return this.cTokenDetails;
  }

  async _underlyingTokenDetails() {
    if (!this.underlyingTokenDetails) {
      this.underlyingTokenDetails = {};
      if (
        this.compound.options.address.toLowerCase() in
        ["0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", "0xd06527d5e56a3495252a528c4987003b712860ee"]
      ) {
        this.underlyingTokenDetails.decimals = 18;
        this.underlyingTokenDetails.symbol = "ETH";
      } else {
        const underlyingTokenAddress = await this.compound.methods.underlying().call();
        const underlyingToken = new this.web3.eth.Contract(this.erc20Abi, underlyingTokenAddress);

        try {
          this.underlyingTokenDetails.decimals = await underlyingToken.methods.decimals().call();
        } catch (err) {
          this.underlyingTokenDetails.decimals = 18;
        }
        try {
          this.underlyingTokenDetails.symbol = await underlyingToken.methods.symbol().call();
        } catch (err) {
          this.underlyingTokenDetails.symbol = "";
        }
      }
    }
    return this.underlyingTokenDetails;
  }

  async _convertDecimals(value) {
    this.cachedConvertDecimalsFn = ConvertDecimals(
      parseInt((await this._underlyingTokenDetails()).decimals),
      parseInt((await this._cTokenDetails()).decimals),
      this.web3
    );
    return this.cachedConvertDecimalsFn(value);
  }
}

module.exports = { CompoundPriceFeed };
