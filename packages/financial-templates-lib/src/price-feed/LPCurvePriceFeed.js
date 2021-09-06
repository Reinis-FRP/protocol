const { PriceFeedInterface } = require("./PriceFeedInterface");
const { BlockFinder } = require("./utils");
const { ConvertDecimals } = require("@uma/common");
const assert = require("assert");
class LPCurvePriceFeed extends PriceFeedInterface {
  /**
   * @notice Constructs new price feed object that tracks how much of a provided token a single LP share is redeemable
   *         for.
   * @dev Note: this can support most LP shares and may support other types of pool contracts.
   * @param {Object} logger Winston module used to send logs.
   * @param {Object} web3 Provider from Truffle instance to connect to Ethereum network.
   * @param {Object} erc20Abi ERC20 abi object to create a contract instance.
   * @param {Object} curveAddressProviderAbi Curve AddressProvider abi object to create a contract instance.
   * @param {Object} curveRegistryAbi Curve Registry abi object to create a contract instance.
   * @param {Object} curvePoolInfoAbi Curve PoolInfo abi object to create a contract instance.
   * @param {Object} curvePoolAbi Curve Pool abi object to create a contract instance.
   * @param {Object} vaultAbi Yearn Vault abi object to create a contract instance.
   * @param {String} lpAddress Ethereum address of the LP pool to monitor.
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
    curveAddressProviderAbi,
    curveRegistryAbi,
    curvePoolInfoAbi,
    curvePoolAbi,
    vaultAbi,
    lpAddress,
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
    assert(curveAddressProviderAbi, "curveAddressProviderAbi required");
    assert(curveRegistryAbi, "curveRegistryAbi required");
    assert(curvePoolInfoAbi, "curvePoolInfoAbi required");
    assert(curvePoolAbi, "curvePoolAbi required");
    assert(vaultAbi, "vaultAbi required");
    assert(lpAddress, "lpAddress required");
    assert(tokenAddress, "tokenAddress required");
    assert(getTime, "getTime required");

    this.logger = logger;
    this.web3 = web3;
    this.toBN = web3.utils.toBN;
    this.fromWei = this.web3.utils.fromWei;

    this.lp = new web3.eth.Contract(erc20Abi, lpAddress);
    this.token = new web3.eth.Contract(erc20Abi, tokenAddress);
    this.addressProvider = new web3.eth.Contract(curveAddressProviderAbi, "0x0000000022D53366457F9d5E68Ec105046FC4383"); // This contract is immutable. The address will never change.
    this.erc20Abi = erc20Abi;
    this.curveRegistryAbi = curveRegistryAbi;
    this.curvePoolInfoAbi = curvePoolInfoAbi;
    this.curvePoolAbi = curvePoolAbi;
    this.vaultAbi = vaultAbi;
    this.uuid = `LPCurve-${lpAddress}-${tokenAddress}`;
    this.getTime = getTime;
    this.priceFeedDecimals = priceFeedDecimals;
    this.minTimeBetweenUpdates = minTimeBetweenUpdates;
    this.blockFinder = blockFinder || BlockFinder(web3.eth.getBlock);
    this.tokenDetails = {};
    this.balances = {};
    this.rates = {};
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
    if (!this.poolAddress || !this.poolCoins || !this.registry || !this.rate_method_id) {
      const registryAddress = await this.addressProvider.methods.get_registry().call();
      this.registry = new this.web3.eth.Contract(this.curveRegistryAbi, registryAddress);
      const poolInfoAddress = await this.addressProvider.methods.get_address(1).call();
      const poolInfo = new this.web3.eth.Contract(this.curvePoolInfoAbi, poolInfoAddress);
      this.poolAddress = await this.registry.methods.get_pool_from_lp_token(this.lp.options.address).call();
      this.poolCoins = await poolInfo.methods.get_pool_coins(this.poolAddress).call();
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
    const lpTotalSupply = await this._convertTokenDecimals(
      this.toBN(await this.lp.methods.totalSupply().call(undefined, blockNumber)),
      this.lp.options.address
    );
    const [tokensInPool, otherBalances] = await this._getBalances(blockNumber);

    // To get the price, we divide the total tokens in the pool by the number of LP shares.
    // Note: this produces a price that is in terms of 18 decimals.
    // Note: if the total supply is zero, then we just set the price to 0 since no LP tokens exist.
    const price = lpTotalSupply.isZero()
      ? this.web3.utils.toBN("0")
      : tokensInPool.mul(this.toBN("10").pow(this.toBN(18))).divRound(lpTotalSupply);

    if (verbose) {
      console.log(await this._printVerbose(block, lpTotalSupply, tokensInPool, price, otherBalances));
    }

    // _convertDecimals takes a price with 18 decimals and returns it in terms of priceFeedDecimals.
    return await this._convertToPriceFeedDecimals(price);
  }

  // Prints verbose logs
  async _printVerbose(block, lpTotalSupply, tokensInPool, price, otherBalances) {
    const baseSymbol = (await this._tokenDetails(this.lp.options.address)).symbol;
    const quoteSymbol = (await this._tokenDetails(this.token.options.address)).symbol;
    const baseBalance = this.fromWei(lpTotalSupply);
    const quoteBalance = this.fromWei(tokensInPool);
    const blockNumber = block.number;
    if (blockNumber < this.poolInfoBlock) {
      return this._printVerboseManual(block, price, baseSymbol, quoteSymbol, baseBalance, quoteBalance, otherBalances);
    } else {
      return this._printVerbosePoolInfo(
        block,
        price,
        baseSymbol,
        quoteSymbol,
        baseBalance,
        quoteBalance,
        otherBalances
      );
    }
  }

  // Prints verbose logs based on Pool Info contract data
  async _printVerbosePoolInfo(block, price, baseSymbol, quoteSymbol, baseBalance, quoteBalance, otherBalances) {
    const blockNumber = block.number;
    const registryAddress = await this.addressProvider.methods.get_registry().call(undefined, blockNumber);
    let output = "";
    output += `\n(Curve:${quoteSymbol} per pool share) Historical pricing @ ${block.timestamp}:`;
    output += `\n  - ✅ Spot Price: ${this.fromWei(price)}`;
    output += `\n  - ⚠️  If you want to manually verify the specific spot price, you can query this data on-chain at block #${block.number} from Ethereum archive node`;
    output += `\n  - get the address of the main Curve registry contract by calling get_registry() on the Curve address provider contract ${this.addressProvider.options.address}:`;
    output += `\n    - this should get Registry address of ${registryAddress}`;
    output += `\n  - call get_pool_from_lp_token with ${this.lp.options.address} as parameter on the registry contract ${registryAddress}`;
    output += `\n    - this should get the pool contract ${this.poolAddress} associated with the provided LP token ${this.lp.options.address}`;
    output += `\n  - call get_underlying_coins and get_underlying_balances with pool address ${this.poolAddress} as parameter on the registry contract`;
    output += `\n    - this should show all underlying tokens and their balances in the pool including ${quoteBalance} ${quoteSymbol}`;
    output += `\n    - ⚠ When calculating total ${baseSymbol} value, do not forget to include other underlying tokens: ${otherBalances}`;
    output += `\n  - call totalSupply on LP contract ${this.lp.options.address}:`;
    output += `\n    - this should get total outstanding ${baseBalance} ${baseSymbol} tokens`;
    output += `\n  - price can be calculated as ${quoteBalance}/${baseBalance}`;
    return output;
  }

  // Prints verbose logs based on manual balance calculation
  async _printVerboseManual(block, price, baseSymbol, quoteSymbol, baseBalance, quoteBalance, otherBalances) {
    const blockNumber = block.number;
    const registryAddress = await this.addressProvider.methods.get_registry().call();
    const quoteIndex = this.poolCoins.underlying_coins.findIndex((underlying_coin) => {
      return underlying_coin.toLowerCase() === this.token.options.address.toLowerCase();
    });
    const balances = await this._get_balances(blockNumber);
    const rates = await this._get_rates(blockNumber);
    const coinAddress = this.poolCoins.coins[quoteIndex];
    const coinSymbol = (await this._tokenDetails(coinAddress)).symbol;
    const coinDecimals = (await this._tokenDetails(coinAddress)).decimals;
    const coinBalance = this.fromWei(await this._convertTokenDecimals(balances[quoteIndex], coinAddress));
    const quoteDecimals = (await this._tokenDetails(this.token.options.address)).decimals;
    const convertRateDecimals = ConvertDecimals(parseInt(quoteDecimals), parseInt(coinDecimals), this.web3);
    const coinRate = this.fromWei(convertRateDecimals(rates[quoteIndex]));
    let output = "";
    output += `\n(Curve:${quoteSymbol} per pool share) Historical pricing @ ${block.timestamp}:`;
    output += `\n  - ✅ Spot Price: ${this.fromWei(price)}`;
    output += `\n  - ⚠️  If you want to manually verify the specific spot price, you can query this data on-chain at block #${block.number} from Ethereum archive node`;
    output += `\n  - ⚠️  Pool Info contract not yet awailable at block #${blockNumber}, need to look up current registry contract and request balances manually`;
    output += `\n  - get the current address of the main Curve registry contract by calling get_registry() on the Curve address provider contract ${this.addressProvider.options.address}:`;
    output += `\n    - this should get Registry address of ${registryAddress}`;
    output += `\n  - call get_pool_from_lp_token with ${this.lp.options.address} as parameter on the registry contract ${registryAddress}`;
    output += `\n    - this should get the pool contract ${this.poolAddress} associated with the provided LP token ${this.lp.options.address}`;
    output += `\n  - call get_coins, get_underlying_coins, get_decimals and get_underlying_decimals with pool address ${this.poolAddress} as parameter on the registry contract`;
    if (coinAddress.toLowerCase() === this.token.options.address.toLowerCase()) {
      output += `\n    - this should show all reserve tokens in the pool including ${quoteSymbol} with ${quoteDecimals} decimals at index ${quoteIndex}`;
    } else {
      output += `\n    - this should show all reserve tokens and associated underlying tokens in the pool including ${coinAddress} for ${coinSymbol} with ${coinDecimals} decimals at index ${quoteIndex} and its underlying ${quoteSymbol} with ${quoteDecimals} decimals`;
    }
    output += `\n  - call balances(${quoteIndex}) on the pool contract ${this.poolAddress}`;
    output += `\n    - this should get ${coinBalance} ${coinSymbol}`;
    if (
      coinAddress.toLowerCase() !== this.token.options.address.toLowerCase() &&
      this.rate_method_id === "0x77c7b8fc"
    ) {
      output += `\n  - call getPricePerFullShare on the reserve coin contract ${coinAddress}`;
      output += `\n    - this should get ${coinRate} ${quoteSymbol} per ${coinSymbol} after adjusting for decimals`;
      output += `\n    - and the underlying balance can be calculated as ${coinBalance}*${coinRate}=${quoteBalance} ${quoteSymbol}`;
    }
    output += `\n    - ⚠ When calculating total ${baseSymbol} value, do not forget to include other underlying tokens: ${otherBalances}`;
    output += `\n  - call totalSupply on LP contract ${this.lp.options.address}:`;
    output += `\n    - this should get total outstanding ${baseBalance} ${baseSymbol} tokens`;
    output += `\n  - price can be calculated as ${quoteBalance}/${baseBalance}`;
    return output;
  }

  // Gets historical token balances in Curve pool. PoolInfo contract already converts it to 18 decimals.
  async _getBalances(blockNumber) {
    let poolInfoValues = [];
    let rawBalance = null;
    let otherBalances = "";
    if (blockNumber < this.poolInfoBlock) {
      const rates = await this._get_rates(blockNumber);
      const balances = await this._get_balances(blockNumber);
      poolInfoValues["underlying_balances"] = this._get_underlying_balances(balances, rates);
    } else {
      const poolInfoAddress = await this.addressProvider.methods.get_address(1).call(undefined, blockNumber);
      const poolInfo = new this.web3.eth.Contract(this.curvePoolInfoAbi, poolInfoAddress);
      poolInfoValues = await poolInfo.methods.get_pool_info(this.poolAddress).call(undefined, blockNumber);
    }
    for (let i = 0; i < this.poolCoins.underlying_coins.length; i++) {
      if (this.poolCoins.underlying_coins[i].toLowerCase() === this.token.options.address.toLowerCase()) {
        rawBalance = this.toBN(poolInfoValues.underlying_balances[i]);
        continue;
      } else if (this.poolCoins.underlying_coins[i] === "0x0000000000000000000000000000000000000000") {
        continue;
      } else {
        const tokenBalance = this.fromWei(this.toBN(poolInfoValues.underlying_balances[i]));
        const tokenSymbol = (await this._tokenDetails(this.poolCoins.underlying_coins[i])).symbol;
        otherBalances = otherBalances
          ? otherBalances.concat(", " + tokenBalance.toString() + " " + tokenSymbol)
          : tokenBalance.toString() + " " + tokenSymbol;
      }
    }
    return [rawBalance, otherBalances];
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
    const pool = new this.web3.eth.Contract(this.curvePoolAbi, this.poolAddress);
    for (let i = 0; i < this.poolCoins.coins.length; i++) {
      if (this.poolCoins.coins[i] === "0x0000000000000000000000000000000000000000") {
        balances.push(this.toBN("0"));
      } else {
        balances.push(this.toBN(await pool.methods.balances(i).call(undefined, blockNumber)));
      }
    }
    this.balances[blockNumber] = balances;
    return balances;
  }

  _get_underlying_balances(balances, rates) {
    const underlying_balances = [];
    for (let i = 0; i < this.poolCoins.coins.length; i++) {
      const convertRateDecimals = ConvertDecimals(
        parseInt(this.poolCoins.underlying_decimals[i]),
        parseInt(this.poolCoins.decimals[i]),
        this.web3
      );
      if (this.poolCoins.coins[i] === "0x0000000000000000000000000000000000000000") {
        underlying_balances.push("0");
      } else if (rates[i] === null) {
        throw new Error(`Underlying rate not awailable for ${this.poolCoins.coins[i]}`);
      } else {
        underlying_balances.push(
          balances[i]
            .mul(convertRateDecimals(rates[i]))
            .divRound(this.toBN("10").pow(this.toBN(this.poolCoins.decimals[i])))
            .toString()
        );
      }
    }
    return underlying_balances;
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

module.exports = { LPCurvePriceFeed };
