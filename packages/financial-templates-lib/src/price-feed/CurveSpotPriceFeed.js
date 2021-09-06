const { PriceFeedInterface } = require("./PriceFeedInterface");
const { BlockFinder } = require("./utils");
const { ConvertDecimals } = require("@uma/common");
const assert = require("assert");
class CurveSpotPriceFeed extends PriceFeedInterface {
  /**
   * @notice Constructs new price feed object that tracks token price from provided Curve swap pool
   * @param {Object} logger Winston module used to send logs.
   * @param {Object} web3 Provider from Truffle instance to connect to Ethereum network.
   * @param {Object} erc20Abi ERC20 abi object to create a contract instance.
   * @param {Object} curveAddressProviderAbi Curve AddressProvider abi object to create a contract instance.
   * @param {Object} curveRegistryAbi Curve Registry abi object to create a contract instance.
   * @param {Object} curvePoolInfoAbi Curve PoolInfo abi object to create a contract instance.
   * @param {Object} curvePoolAbi Curve Pool abi object to create a contract instance.
   * @param {Object} vaultAbi Yearn Vault abi object to create a contract instance.
   * @param {String} poolAddress Ethereum address of the swap pool to monitor.
   * @param {String} quoteAddress Ethereum address of the quote token.
   * @param {String} baseAddress Ethereum address of the base token.
   * @param {Function} getTime Returns the current time.
   * @param {Function} [blockFinder] Optionally pass in a shared blockFinder instance (to share the cache).
   * @param {Integer} [minTimeBetweenUpdates] Minimum amount of time that must pass before update will actually run
   *                                        again.
   * @param {Number} baseAmount Number of tokens to convert for price calculation.
   * @param {Integer} [priceFeedDecimals] Precision that the caller wants precision to be reported in.
   * @return None or throws an Error.
   */
  constructor({
    logger,
    web3,
    erc20Abi,
    curveAddressProviderAbi,
    curveRegistryAbi,
    curvePoolInfoAbi,
    curvePoolAbi,
    vaultAbi,
    poolAddress,
    quoteAddress,
    baseAddress,
    getTime,
    blockFinder,
    minTimeBetweenUpdates = 60,
    baseAmount = 1, // Amount to convert, defaults to 1 USD. Might need to lower for crypto pairs.
    priceFeedDecimals = 18,
  }) {
    super();

    // Assert required arguments.
    assert(logger, "logger required");
    assert(web3, "web3 required");
    assert(erc20Abi, "erc20Abi required");
    assert(curveAddressProviderAbi, "curveAddressProviderAbi required");
    assert(curveRegistryAbi, "curveRegistryAbi required");
    assert(curvePoolInfoAbi, "curvePoolInfoAbi required");
    assert(curvePoolAbi, "curvePoolAbi required");
    assert(vaultAbi, "vaultAbi required");
    assert(poolAddress, "poolAddress required");
    assert(quoteAddress, "quoteAddress required");
    assert(baseAddress, "baseAddress required");
    assert(getTime, "getTime required");

    this.logger = logger;
    this.web3 = web3;
    this.toBN = web3.utils.toBN;
    this.fromWei = this.web3.utils.fromWei;
    this.toWei = this.web3.utils.toWei;

    this.pool = new web3.eth.Contract(curvePoolAbi, poolAddress);
    this.poolAddress = poolAddress;
    this.baseAddress = baseAddress;
    this.quoteAddress = quoteAddress;
    this.addressProvider = new web3.eth.Contract(curveAddressProviderAbi, "0x0000000022D53366457F9d5E68Ec105046FC4383"); // This contract is immutable. The address will never change.
    this.erc20Abi = erc20Abi;
    this.curveRegistryAbi = curveRegistryAbi;
    this.curvePoolInfoAbi = curvePoolInfoAbi;
    this.vaultAbi = vaultAbi;
    this.uuid = `CurveSpot-${poolAddress}`;
    this.getTime = getTime;
    this.baseAmount = baseAmount;
    this.priceFeedDecimals = priceFeedDecimals;
    this.minTimeBetweenUpdates = minTimeBetweenUpdates;
    this.blockFinder = blockFinder || BlockFinder(web3.eth.getBlock);
    this.tokenDetails = {};
    this.balances = {};
    this.rates = {};
    this.FEE_DENOMINATOR = this.toBN(10).pow(this.toBN(10));
    this.poolInfoBlock = 11155032; // Pool Info contract is only available starting from this block.
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
    if (
      !this.poolCoins ||
      !this.registry ||
      !this.baseIndex ||
      !this.quoteIndex ||
      !this.N_COINS ||
      !this.rate_method_id
    ) {
      const registryAddress = await this.addressProvider.methods.get_registry().call();
      this.registry = new this.web3.eth.Contract(this.curveRegistryAbi, registryAddress);
      this.N_COINS = (await this.registry.methods.get_n_coins(this.poolAddress).call())[1];
      const poolInfoAddress = await this.addressProvider.methods.get_address(1).call();
      const poolInfo = new this.web3.eth.Contract(this.curvePoolInfoAbi, poolInfoAddress);
      this.poolCoins = await poolInfo.methods.get_pool_coins(this.poolAddress).call();
      this.baseIndex = this.poolCoins.underlying_coins.findIndex((underlying_coin) => {
        return underlying_coin.toLowerCase() === this.baseAddress.toLowerCase();
      });
      this.quoteIndex = this.poolCoins.underlying_coins.findIndex((underlying_coin) => {
        return underlying_coin.toLowerCase() === this.quoteAddress.toLowerCase();
      });
      this.rate_method_id = await this._get_rate_method_id();
    }
    const currentTime = await this.getTime();
    if (this.lastUpdateTime === undefined || currentTime >= this.lastUpdateTime + this.minTimeBetweenUpdates) {
      this.price = await this._getPrice(await this.web3.eth.getBlock("latest"));
      this.lastUpdateTime = currentTime;
    }
  }

  async _getPrice(block, verbose = false) {
    const blockNumber = block.number;
    const price = (
      await this.get_dy_underlying(
        this.baseIndex,
        this.quoteIndex,
        this.toBN(this.toWei(this.baseAmount.toString())),
        blockNumber
      )
    )
      .mul(this.toBN(this.toWei("1")))
      .div(this.toBN(this.toWei(this.baseAmount.toString())));
    // const baseDecimals = parseInt(this.poolCoins.underlying_decimals[this.baseIndex]);
    // const dx = baseDecimals < 18 ? this.toBN(this.toWei(this.baseAmount.toString())).div(this.toBN(10).pow(this.toBN(18 - baseDecimals))).toString() : this.toBN(this.toWei(this.baseAmount.toString())).mul(this.toBN(10).pow(this.toBN(baseDecimals - 18))).toString();
    // const dy = await this.pool.methods.get_dy_underlying(this.baseIndex, this.quoteIndex, dx).call(undefined, blockNumber);
    // const fee = await this.pool.methods.fee().call(undefined, blockNumber);
    // const priceVerbose = (await this._convertTokenDecimals(dy, this.quoteAddress)).mul(this.FEE_DENOMINATOR).div(this.FEE_DENOMINATOR.sub(this.toBN(fee))).mul(this.toBN(10).pow(this.toBN(18))).div(await this._convertTokenDecimals(dx, this.baseAddress));

    if (verbose) {
      console.log(await this._printVerbose(block, price));
    }

    // _convertDecimals takes a price with 18 decimals and returns it in terms of priceFeedDecimals.
    return await this._convertToPriceFeedDecimals(price);
  }

  // Prints verbose logs
  async _printVerbose(block, price) {
    const blockNumber = block.number;
    const baseSymbol = (await this._tokenDetails(this.baseAddress)).symbol;
    const quoteSymbol = (await this._tokenDetails(this.quoteAddress)).symbol;
    const baseDecimals = parseInt(this.poolCoins.underlying_decimals[this.baseIndex]);
    const quoteDecimals = parseInt(this.poolCoins.underlying_decimals[this.quoteIndex]);
    const dx =
      baseDecimals < 18
        ? this.toBN(this.toWei(this.baseAmount.toString()))
            .div(this.toBN(10).pow(this.toBN(18 - baseDecimals)))
            .toString()
        : this.toBN(this.toWei(this.baseAmount.toString()))
            .mul(this.toBN(10).pow(this.toBN(baseDecimals - 18)))
            .toString();
    const dy = await this.pool.methods
      .get_dy_underlying(this.baseIndex, this.quoteIndex, dx)
      .call(undefined, blockNumber);
    const quoteAmount = this.fromWei(await this._convertTokenDecimals(dy, this.quoteAddress));
    const fee = await this.pool.methods.fee().call(undefined, blockNumber);
    const feePercent = this.fromWei(
      this.toBN(fee)
        .mul(this.toBN(10).pow(this.toBN(20)))
        .div(this.FEE_DENOMINATOR)
    );
    let output = "";
    output += `\n(Curve:${baseSymbol}/${quoteSymbol}) Historical pricing @ ${block.timestamp}:`;
    output += `\n  - ✅ Spot Price: ${this.fromWei(price)}`;
    output += `\n  - ⚠️  If you want to manually verify the specific spot price, you can query this data on-chain at block #${block.number} from Ethereum archive node`;
    output += `\n  - get the current address of the main Curve registry contract by calling get_registry() on the Curve address provider contract ${this.addressProvider.options.address}:`;
    output += `\n    - this should get Registry address of ${this.registry.options.address}`;
    output += `\n  - call get_underlying_coins and get_underlying_decimals with pool address ${this.poolAddress} as parameter on the current registry contract`;
    output += `\n    - this should show all underlying tokens in the pool including ${baseSymbol} with ${baseDecimals} decimals at index ${this.baseIndex} and ${quoteSymbol} with ${quoteDecimals} decimals at index ${this.quoteIndex}`;
    output += `\n  - call get_dy_underlying(${this.baseIndex}, ${this.quoteIndex}, "${dx}") on the pool contract ${this.poolAddress}`;
    output += `\n    - after decimal scaling this should show that ${this.baseAmount} ${baseSymbol} could have been swapped for ${quoteAmount} ${quoteSymbol} after fees`;
    output += `\n  - call fee on the pool contract ${this.poolAddress}`;
    output += `\n    - after fee scaling factor 10^10 this should show that swap fee was ${feePercent}%`;
    output += `\n  - price can be calculated as ${quoteAmount}/(100% - ${feePercent}%)/${this.baseAmount}`;
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

  async _get_rate_method_id() {
    const events = await this.registry.getPastEvents("PoolAdded", {
      filter: { pool: this.poolAddress },
      fromBlock: 0,
      toBlock: "latest",
    });
    // Primary sort on block number. Secondary sort on transactionIndex. Tertiary sort on logIndex.
    events.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber - b.blockNumber;
      }

      if (a.transactionIndex !== b.transactionIndex) {
        return a.transactionIndex - b.transactionIndex;
      }

      return a.logIndex - b.logIndex;
    });
    if (events.length > 0) {
      return events[events.length - 1].returnValues.rate_method_id;
    } else {
      return null;
    }
  }

  async _get_rates(blockNumber) {
    if (this.rates[blockNumber]) {
      return this.rates[blockNumber];
    }
    const rates = [];
    for (let i = 0; i < this.poolCoins.coins.length; i++) {
      if (this.poolCoins.coins[i] === "0x0000000000000000000000000000000000000000") {
        rates.push(this.toBN("0"));
      } else if (this.poolCoins.coins[i] === this.poolCoins.underlying_coins[i]) {
        rates.push(this.toBN("10").pow(this.toBN("18")));
      } else if (this.rate_method_id === "0x77c7b8fc") {
        const vault = new this.web3.eth.Contract(this.vaultAbi, this.poolCoins.coins[i]);
        rates.push(this.toBN(await vault.methods.getPricePerFullShare().call(undefined, blockNumber)));
      } else {
        rates.push(null);
      }
    }
    this.rates[blockNumber] = rates;
    return rates;
  }

  async _get_balances(blockNumber) {
    if (this.balances[blockNumber]) {
      return this.balances[blockNumber];
    }
    const balances = [];
    for (let i = 0; i < this.poolCoins.coins.length; i++) {
      if (this.poolCoins.coins[i] === "0x0000000000000000000000000000000000000000") {
        balances.push(this.toBN("0"));
      } else {
        balances.push(this.toBN(await this.pool.methods.balances(i).call(undefined, blockNumber)));
      }
    }
    this.balances[blockNumber] = balances;
    return balances;
  }

  _precision_mul() {
    const result = [];
    for (let i = 0; i < this.N_COINS; i++) {
      result.push(this.toBN(10).pow(this.toBN(18 - this.poolCoins.underlying_decimals[i])));
    }
    return result;
  }

  async _stored_rates(blockNumber) {
    const result = this._precision_mul();
    const _rates = await this._get_rates(blockNumber);
    for (let i = 0; i < this.N_COINS; i++) {
      result[i] = result[i].mul(_rates[i]);
    }
    return result;
  }

  async _get_A(blockNumber) {
    const A = await this.pool.methods.A().call(undefined, blockNumber);
    return A;
  }

  async get_D(xp, blockNumber) {
    let S = this.toBN("0");
    for (let _x of xp) {
      S = S.add(_x);
    }
    if (S.isZero()) {
      return this.toBN("0");
    }

    let Dprev = this.toBN("0");
    let D = S;
    const Ann = (await this._get_A(blockNumber)) * this.N_COINS;
    for (let _i = 0; _i < 255; _i++) {
      let D_P = D;
      for (let _x of xp) {
        D_P = D_P.mul(D).div(_x.mul(this.toBN(this.N_COINS)).add(this.toBN("1"))); // +1 is to prevent /0
      }
      Dprev = D;
      D = this.toBN(Ann)
        .mul(S)
        .add(D_P.mul(this.toBN(this.N_COINS)))
        .mul(D)
        .div(
          this.toBN(Ann)
            .sub(this.toBN("1"))
            .mul(D)
            .add(this.toBN(this.N_COINS).add(this.toBN("1")).mul(D_P))
        );
      // Equality with the precision of 1
      if (D.gt(Dprev)) {
        if (D.sub(Dprev).lte(this.toBN("1"))) {
          break;
        }
      } else {
        if (Dprev.sub(D).lte(this.toBN("1"))) {
          break;
        }
      }
    }
    return D;
  }

  async get_y(i, j, x, _xp, blockNumber) {
    // x in the input is converted to the same price/precision

    const D = await this.get_D(_xp, blockNumber);
    let c = D;
    let S_ = this.toBN("0");
    const Ann = (await this._get_A(blockNumber)) * this.N_COINS;

    let _x = this.toBN("0");
    for (let _i = 0; _i < this.N_COINS; _i++) {
      if (_i === i) {
        _x = x;
      } else if (_i !== j) {
        _x = _xp[_i];
      } else {
        continue;
      }
      S_ = S_.add(_x);
      c = c.mul(D).div(_x.mul(this.toBN(this.N_COINS)));
    }
    c = c.mul(D).div(this.toBN(Ann).mul(this.toBN(this.N_COINS)));
    const b = S_.add(D.div(this.toBN(Ann))); // - D
    let y_prev = this.toBN("0");
    let y = D;
    for (let _i = 0; _i < 255; _i++) {
      y_prev = y;
      y = y.mul(y).add(c).div(this.toBN("2").mul(y).add(b).sub(D));
      // Equality with the precision of 1
      if (y.gt(y_prev)) {
        if (y.sub(y_prev).lte(this.toBN(1))) {
          break;
        }
      } else {
        if (y_prev.sub(y).lte(this.toBN(1))) {
          break;
        }
      }
    }
    return y;
  }

  async _xp(rates, blockNumber) {
    const result = rates.slice();
    const balances = await this._get_balances(blockNumber);
    for (let i = 0; i < this.N_COINS; i++) {
      result[i] = result[i].mul(balances[i]).div(this.toBN(10).pow(this.toBN(18)));
    }
    return result;
  }

  async get_dy_underlying(i, j, dx, blockNumber) {
    // dx and dy in underlying units
    const rates = await this._stored_rates(blockNumber);
    const xp = await this._xp(rates, blockNumber);

    const x = xp[i].add(dx);
    const y = await this.get_y(i, j, x, xp, blockNumber);
    const dy = xp[j].sub(y);
    return dy;
  }

  // Converts decimals from 18 decimals to the configured price feed decimals.
  async _convertToPriceFeedDecimals(value) {
    const convertOutputDecimals = ConvertDecimals(18, this.priceFeedDecimals, this.web3);
    return convertOutputDecimals(value);
  }

  // Converts raw value from the token decimals to 18 decimals usable by fromWei utility.
  async _convertTokenDecimals(value, address) {
    const convertTokenDecimals = ConvertDecimals(parseInt((await this._tokenDetails(address)).decimals), 18, this.web3);
    return convertTokenDecimals(value);
  }
}

module.exports = { CurveSpotPriceFeed };
