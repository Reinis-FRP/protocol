const winston = require("winston");
const sinon = require("sinon");

const { toWei, hexToUtf8, utf8ToHex } = web3.utils;

const {
  OptimisticOracleClient,
  GasEstimator,
  SpyTransport,
  lastSpyLogLevel,
  spyLogIncludes
} = require("@uma/financial-templates-lib");
const { OptimisticOracleKeeper } = require("../src/keeper");
const { interfaceName, getPrecisionForIdentifier, OptimisticOracleRequestStatesEnum } = require("@uma/common");
const { getTruffleContract } = require("@uma/core");

const CONTRACT_VERSION = "latest";

const OptimisticOracle = getTruffleContract("OptimisticOracle", web3, CONTRACT_VERSION);
const OptimisticRequesterTest = getTruffleContract("OptimisticRequesterTest", web3, CONTRACT_VERSION);
const Finder = getTruffleContract("Finder", web3, CONTRACT_VERSION);
const IdentifierWhitelist = getTruffleContract("IdentifierWhitelist", web3, CONTRACT_VERSION);
const Token = getTruffleContract("ExpandedERC20", web3, CONTRACT_VERSION);
const AddressWhitelist = getTruffleContract("AddressWhitelist", web3, CONTRACT_VERSION);
const Timer = getTruffleContract("Timer", web3, CONTRACT_VERSION);
const Store = getTruffleContract("Store", web3, CONTRACT_VERSION);
const MockOracle = getTruffleContract("MockOracleAncillary", web3, CONTRACT_VERSION);

contract("OptimisticOracle: keeper.js", function(accounts) {
  const owner = accounts[0];
  const requester = accounts[1];
  const disputer = accounts[3];
  const botRunner = accounts[5];

  // Contracts
  let optimisticRequester;
  let optimisticOracle;
  let finder;
  let timer;
  let identifierWhitelist;
  let collateralWhitelist;
  let store;

  // Offchain infra
  let client;
  let gasEstimator;
  let keeper;
  let spyLogger;
  let mockOracle;
  let spy;

  // Timestamps that we'll use throughout the test.
  let requestTime;
  let startTime;

  // Default testing values.
  const liveness = 7200; // 2 hours
  const initialUserBalance = toWei("100");
  const finalFee = toWei("1");

  // These identifiers are special test ones that are mapped to certain `priceFeedDecimal`
  // configurations used to construct pricefeeds. For example, "TEST8DECIMALS" will construct
  // a pricefeed that returns prices in 8 decimals. This is useful for testing that a bot is
  // constructing the right type of pricefeed by default. This mapping is stored in @uma/common/PriceIdentifierUtils.js
  const identifiersToTest = [
    web3.utils.utf8ToHex("TEST8DECIMALS"),
    web3.utils.utf8ToHex("TEST6DECIMALS"),
    web3.utils.utf8ToHex("TEST18DECIMALS")
  ];
  let collateralCurrenciesForIdentifier;

  const verifyState = async (state, identifier, ancillaryData = "0x") => {
    assert.equal(
      (await optimisticOracle.getState(optimisticRequester.address, identifier, requestTime, ancillaryData)).toString(),
      state
    );
  };

  before(async function() {
    finder = await Finder.new();
    timer = await Timer.new();

    // Whitelist test identifiers we can use to make default price requests.
    identifierWhitelist = await IdentifierWhitelist.new();
    for (let i = 0; i < identifiersToTest.length; i++) {
      await identifierWhitelist.addSupportedIdentifier(identifiersToTest[i]);
    }
    await finder.changeImplementationAddress(utf8ToHex(interfaceName.IdentifierWhitelist), identifierWhitelist.address);

    collateralWhitelist = await AddressWhitelist.new();
    await finder.changeImplementationAddress(utf8ToHex(interfaceName.CollateralWhitelist), collateralWhitelist.address);

    store = await Store.new({ rawValue: "0" }, { rawValue: "0" }, timer.address);
    await finder.changeImplementationAddress(utf8ToHex(interfaceName.Store), store.address);

    mockOracle = await MockOracle.new(finder.address, timer.address);
    await finder.changeImplementationAddress(utf8ToHex(interfaceName.Oracle), mockOracle.address);
  });

  beforeEach(async function() {
    // Create and save a new collateral token for each request so we can test
    // that keeper can use different currencies for each request to post bonds.
    collateralCurrenciesForIdentifier = [];
    for (let i = 0; i < identifiersToTest.length; i++) {
      let collateral = await Token.new("Wrapped Ether", "WETH", getPrecisionForIdentifier(identifiersToTest[i]));
      await collateral.addMember(1, owner);
      await collateral.mint(botRunner, initialUserBalance);
      await collateral.mint(requester, initialUserBalance);
      await collateral.mint(disputer, initialUserBalance);
      await collateralWhitelist.addToWhitelist(collateral.address);
      await store.setFinalFee(collateral.address, { rawValue: finalFee });
      collateralCurrenciesForIdentifier[i] = collateral;
    }

    optimisticOracle = await OptimisticOracle.new(liveness, finder.address, timer.address);

    // Contract used to make price requests
    optimisticRequester = await OptimisticRequesterTest.new(optimisticOracle.address);

    startTime = (await optimisticOracle.getCurrentTime()).toNumber();
    requestTime = startTime - 10;

    spy = sinon.spy();
    spyLogger = winston.createLogger({
      level: "info",
      transports: [new SpyTransport({ level: "info" }, { spy: spy })]
    });

    client = new OptimisticOracleClient(
      spyLogger,
      OptimisticOracle.abi,
      MockOracle.abi,
      web3,
      optimisticOracle.address,
      mockOracle.address
    );

    gasEstimator = new GasEstimator(spyLogger);

    // Make a new price request for each identifier, each of which should cause the keeper bot to
    // construct a pricefeed with a new precision.
    for (let i = 0; i < identifiersToTest.length; i++) {
      await optimisticRequester.requestPrice(
        identifiersToTest[i],
        requestTime,
        "0x",
        collateralCurrenciesForIdentifier[i].address,
        0
      );
    }

    // Construct OO Keeper and update it now that requests have been sent
    let defaultPriceFeedConfig = {
      currentPrice: "1", // Mocked current price. This will be scaled to the identifier's precision.
      historicalPrice: "2" // Mocked historical price. This will be scaled to the identifier's precision.
    };
    keeper = new OptimisticOracleKeeper({
      logger: spyLogger,
      optimisticOracleClient: client,
      gasEstimator,
      account: botRunner,
      defaultPriceFeedConfig
    });
    await keeper.update();
  });

  it("Can send proposals to new price requests", async function() {
    // Should have one price request for each identifier.
    let expectedResults = [];
    for (let i = 0; i < identifiersToTest.length; i++) {
      expectedResults.push({
        requester: optimisticRequester.address,
        identifier: hexToUtf8(identifiersToTest[i]),
        timestamp: requestTime.toString(),
        currency: collateralCurrenciesForIdentifier[i].address,
        reward: "0",
        finalFee
      });
    }
    let result = client.getUnproposedPriceRequests();
    assert.deepStrictEqual(result, expectedResults);

    // Now: Execute `sendProposals()` and test that the bot correctly responds to these price proposals
    await keeper.sendProposals();

    // Check that the onchain requests have been proposed to.
    for (let i = 0; i < identifiersToTest.length; i++) {
      await verifyState(OptimisticOracleRequestStatesEnum.PROPOSED, identifiersToTest[i]);
    }

    // Check for the successful INFO log emitted by the keeper.
    assert.equal(lastSpyLogLevel(spy), "info");
    assert.isTrue(spyLogIncludes(spy, -1, "Proposed price"));
  });

  it("Skip price requests with identifiers that keeper cannot construct a price feed for", async function() {
    // This pricefeed config will cause the Keeper to fail to construct a price feed because the
    // PriceFeedMock type requires a `currentPrice` and a `historicalPrice` to be specified.
    let invalidPriceFeedConfig = {};
    keeper = new OptimisticOracleKeeper({
      logger: spyLogger,
      optimisticOracleClient: client,
      gasEstimator,
      account: botRunner,
      defaultPriceFeedConfig: invalidPriceFeedConfig
    });
    await keeper.update();
    await keeper.sendProposals();

    // TODO: Catch error message
  });

  it("Skip price requests with historical prices that keeper fails to fetch", async function() {
    // This pricefeed config will cause the Keeper to fail to construct a price feed because the
    // PriceFeedMock type requires a `currentPrice` and a `historicalPrice` to be specified.
    let missingHistoricalPriceFeedConfig = {
      currentPrice: "1"
    };
    keeper = new OptimisticOracleKeeper({
      logger: spyLogger,
      optimisticOracleClient: client,
      gasEstimator,
      account: botRunner,
      defaultPriceFeedConfig: missingHistoricalPriceFeedConfig
    });
    await keeper.update();
    await keeper.sendProposals();

    // TODO: Catch error message
  });

  // Can dispute
  it("Can dispute proposed prices", async function() {});

  // Can settle requests
});
