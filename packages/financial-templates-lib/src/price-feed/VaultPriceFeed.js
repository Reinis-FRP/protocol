const { PriceFeedInterface } = require("./PriceFeedInterface");
const { BlockFinder } = require("./utils");
const { ConvertDecimals } = require("@uma/common");
const assert = require("assert");

class VaultPriceFeedBase extends PriceFeedInterface {
  /**
   * @notice Constructs new price feed object that tracks the share price of a yearn-style vault.
   * @dev Note: this only supports badger Setts and Yearn v1 right now.
   * @param {Object} logger Winston module used to send logs.
   * @param {Object} vaultAbi Yearn Vault abi object to create a contract instance.
   * @param {Object} erc20Abi ERC20 abi object to create a contract instance.
   * @param {Object} web3 Provider from Truffle instance to connect to Ethereum network.
   * @param {String} vaultAddress Ethereum address of the yearn-style vault to monitor.
   * @param {Function} getTime Returns the current time.
   * @param {Function} [blockFinder] Optionally pass in a shared blockFinder instance (to share the cache).
   * @param {Integer} [minTimeBetweenUpdates] Minimum amount of time that must pass before update will actually run
   *                                        again.
   * @param {Integer} [priceFeedDecimals] Precision that the caller wants precision to be reported in.
   * @return None or throws an Error.
   */
  constructor({
    logger,
    vaultAbi,
    erc20Abi,
    web3,
    vaultAddress,
    getTime,
    blockFinder,
    minTimeBetweenUpdates = 60,
    priceFeedDecimals = 18,
  }) {
    super();

    // Assert required inputs.
    assert(logger, "logger required");
    assert(vaultAbi, "vaultAbi required");
    assert(erc20Abi, "erc20Abi required");
    assert(web3, "web3 required");
    assert(vaultAddress, "vaultAddress required");
    assert(getTime, "getTime required");

    this.logger = logger;
    this.web3 = web3;
    this.fromWei = web3.utils.fromWei;
    this.toBN = web3.utils.toBN;

    this.vault = new web3.eth.Contract(vaultAbi, vaultAddress);
    this.erc20Abi = erc20Abi;
    this.uuid = `Vault-${vaultAddress}`;
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
    if (!this.underlyingTokenAddress) {
      this.underlyingTokenAddress = await this._tokenTransaction().call();
    }
    const currentTime = await this.getTime();
    if (this.lastUpdateTime === undefined || currentTime >= this.lastUpdateTime + this.minTimeBetweenUpdates) {
      this.price = await this._getPrice(await this.web3.eth.getBlock("latest"));
      this.lastUpdateTime = currentTime;
    }
  }

  async _getPrice(block, verbose = false) {
    let rawPrice;
    let price;
    try {
      rawPrice = await this.vault.methods.getPricePerFullShare().call(undefined, block.number);
      price = await this._convertDecimals(rawPrice);
      // Disabled strategy throws error:
    } catch (err) {
      price = this.toBN(0);
    }

    if (verbose) {
      console.log(await this._printVerbose(block, price));
    }

    return price;
  }

  // Prints verbose logs

  async _printVerbose(block, price) {
    const baseSymbol = (await this._tokenDetails(this.vault.options.address)).symbol;
    const quoteSymbol = (await this._tokenDetails(this.underlyingTokenAddress)).symbol;
    const baseDecimals = (await this._tokenDetails(this.vault.options.address)).decimals;
    const quoteDecimals = (await this._tokenDetails(this.underlyingTokenAddress)).decimals;
    let output = "";
    output += `\n(Vault:${quoteSymbol}/${baseSymbol}) Historical pricing @ ${block.timestamp}:`;
    output += `\n  - ✅ Spot Price: ${this.fromWei(price)}`;
    output += `\n  - ⚠️  If you want to manually verify the specific spot price, you can query this data on-chain at block #${block.number} from Ethereum archive node`;
    output += `\n  - call getPricePerFullShare method on the vault contract ${this.vault.options.address}`;
    output += `\n    - this should get ${this.fromWei(
      price
    )} after adjusting for ${baseSymbol} ${baseDecimals} decimals and ${quoteSymbol} ${quoteDecimals} decimals`;
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

  async _convertDecimals(value) {
    if (!this.cachedConvertDecimalsFn) {
      const underlyingToken = new this.web3.eth.Contract(this.erc20Abi, this.underlyingTokenAddress);

      let underlyingTokenDecimals;
      try {
        underlyingTokenDecimals = await underlyingToken.methods.decimals().call();
      } catch (err) {
        underlyingTokenDecimals = 18;
      }

      this.cachedConvertDecimalsFn = ConvertDecimals(
        parseInt(underlyingTokenDecimals),
        this.priceFeedDecimals,
        this.web3
      );
    }
    return this.cachedConvertDecimalsFn(value);
  }

  _tokenTransaction() {
    throw new Error("Must be implemented by derived class");
  }
}

// Note: we may rename this in the future to YearnV1Vault or something, but just for simplicity, we can keep the name the same for now.
class VaultPriceFeed extends VaultPriceFeedBase {
  _tokenTransaction() {
    return this.vault.methods.token();
  }
}

class HarvestVaultPriceFeed extends VaultPriceFeedBase {
  _tokenTransaction() {
    return this.vault.methods.underlying();
  }
}

module.exports = { VaultPriceFeed, HarvestVaultPriceFeed };
