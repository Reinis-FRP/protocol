const { getPrecisionForIdentifier } = require("@uma/common");

// Default price feed configs for currently approved identifiers.
const defaultConfigs = {
  "ETH/BTC": {
    type: "medianizer",
    pair: "ethbtc",
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro" },
      { type: "cryptowatch", exchange: "binance" },
      { type: "cryptowatch", exchange: "bitstamp" },
    ],
  },
  "COMP/USD": {
    // Kovan uses the "/"
    type: "medianizer",
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "compusd" },
      { type: "cryptowatch", exchange: "poloniex", pair: "compusdt" },
      { type: "cryptowatch", exchange: "ftx", pair: "compusd" },
    ],
  },
  COMPUSD: {
    // Mainnet has no "/"
    type: "medianizer",
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "compusd" },
      { type: "cryptowatch", exchange: "poloniex", pair: "compusdt" },
      { type: "cryptowatch", exchange: "ftx", pair: "compusd" },
    ],
  },
  USDETH: {
    type: "medianizer",
    invertPrice: true,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "ethusd" },
      { type: "cryptowatch", exchange: "binance", pair: "ethusdt" },
      { type: "cryptowatch", exchange: "kraken", pair: "ethusd" },
    ],
  },
  ETHUSD: {
    type: "medianizer",
    invertPrice: false,
    minTimeBetweenUpdates: 60,
    ohlcPeriod: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "ethusd" },
      { type: "cryptowatch", exchange: "binance", pair: "ethusdt" },
      { type: "cryptowatch", exchange: "kraken", pair: "ethusd" },
    ],
  },
  USDBTC: {
    type: "medianizer",
    invertPrice: true,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "btcusd" },
      { type: "cryptowatch", exchange: "binance", pair: "btcusdt" },
      { type: "cryptowatch", exchange: "bitstamp", pair: "btcusd" },
    ],
  },
  BTCUSD: {
    type: "medianizer",
    invertPrice: false,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "btcusd" },
      { type: "cryptowatch", exchange: "binance", pair: "btcusdt" },
      { type: "cryptowatch", exchange: "bitstamp", pair: "btcusd" },
    ],
  },
  USDPERL: {
    type: "medianizer",
    invertPrice: true,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [{ type: "cryptowatch", exchange: "binance", pair: "perlusdt" }],
  },
  BCHNBTC: {
    type: "medianizer",
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "BCHBTC" },
      { type: "cryptowatch", exchange: "binance", pair: "BCHBTC" },
      { type: "cryptowatch", exchange: "huobi", pair: "BCHBTC" },
    ],
  },
  STABLESPREAD: {
    // This is alternatively known as "STABLESPREAD/ETH"
    type: "basketspread",
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    experimentalPriceFeeds: [
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "bittrex", pair: "ustusdt" },
          { type: "uniswap", uniswapAddress: "0xc50ef7861153c51d383d9a7d48e6c9467fb90c38", twapLength: 2 },
        ],
      },
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "binance", pair: "busdusdt" },
          { type: "uniswap", uniswapAddress: "0xa0abda1f980e03d7eadb78aed8fc1f2dd0fe83dd", twapLength: 2 },
        ],
      },
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "bittrex", pair: "cusdusdt" },
          // NOTE: The OKCoin exchange is not available on Cryptowatch for this pair,
          // presumably because it has such low volume.
          // { type: "cryptowatch", exchange: "okcoin" }
        ],
      },
    ],
    baselinePriceFeeds: [
      {
        type: "medianizer",
        medianizedFeeds: [
          {
            type: "medianizer",
            computeMean: true,
            medianizedFeeds: [
              { type: "cryptowatch", exchange: "bitfinex", pair: "usdtusd" },
              { type: "cryptowatch", exchange: "kraken", pair: "usdtusd" },
            ],
          },
          {
            type: "medianizer",
            computeMean: true,
            medianizedFeeds: [
              { type: "cryptowatch", exchange: "kraken", pair: "usdcusd" },
              { type: "cryptowatch", exchange: "bitstamp", pair: "usdcusd" },
            ],
          },
        ],
      },
    ],
    denominatorPriceFeed: {
      type: "medianizer",
      medianizedFeeds: [
        { type: "cryptowatch", exchange: "coinbase-pro", pair: "ethusd" },
        { type: "cryptowatch", exchange: "binance", pair: "ethusdt" },
      ],
    },
  },
  "STABLESPREAD/USDC": {
    type: "basketspread",
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    experimentalPriceFeeds: [
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "bittrex", pair: "ustusdt" },
          { type: "uniswap", uniswapAddress: "0xc50ef7861153c51d383d9a7d48e6c9467fb90c38", twapLength: 2 },
        ],
      },
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "binance", pair: "busdusdt" },
          { type: "uniswap", uniswapAddress: "0xa0abda1f980e03d7eadb78aed8fc1f2dd0fe83dd", twapLength: 2 },
        ],
      },
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "bittrex", pair: "cusdusdt" },
          // NOTE: The OKCoin exchange is not available on Cryptowatch for this pair,
          // presumably because it has such low volume.
          // { type: "cryptowatch", exchange: "okcoin" }
        ],
      },
    ],
    baselinePriceFeeds: [
      {
        type: "medianizer",
        medianizedFeeds: [
          {
            type: "medianizer",
            computeMean: true,
            medianizedFeeds: [
              { type: "cryptowatch", exchange: "bitfinex", pair: "usdtusd" },
              { type: "cryptowatch", exchange: "kraken", pair: "usdtusd" },
            ],
          },
          {
            type: "medianizer",
            computeMean: true,
            medianizedFeeds: [
              { type: "cryptowatch", exchange: "kraken", pair: "usdcusd" },
              { type: "cryptowatch", exchange: "bitstamp", pair: "usdcusd" },
            ],
          },
        ],
      },
    ],
  },
  "STABLESPREAD/BTC": {
    type: "basketspread",
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    experimentalPriceFeeds: [
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "bittrex", pair: "ustusdt" },
          { type: "uniswap", uniswapAddress: "0xc50ef7861153c51d383d9a7d48e6c9467fb90c38", twapLength: 2 },
        ],
      },
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "binance", pair: "busdusdt" },
          { type: "uniswap", uniswapAddress: "0xa0abda1f980e03d7eadb78aed8fc1f2dd0fe83dd", twapLength: 2 },
        ],
      },
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "bittrex", pair: "cusdusdt" },
          // NOTE: The OKCoin exchange is not available on Cryptowatch for this pair,
          // presumably because it has such low volume.
          // { type: "cryptowatch", exchange: "okcoin" }
        ],
      },
    ],
    baselinePriceFeeds: [
      {
        type: "medianizer",
        medianizedFeeds: [
          {
            type: "medianizer",
            computeMean: true,
            medianizedFeeds: [
              { type: "cryptowatch", exchange: "bitfinex", pair: "usdtusd" },
              { type: "cryptowatch", exchange: "kraken", pair: "usdtusd" },
            ],
          },
          {
            type: "medianizer",
            computeMean: true,
            medianizedFeeds: [
              { type: "cryptowatch", exchange: "kraken", pair: "usdcusd" },
              { type: "cryptowatch", exchange: "bitstamp", pair: "usdcusd" },
            ],
          },
        ],
      },
    ],
    denominatorPriceFeed: {
      type: "medianizer",
      medianizedFeeds: [
        { type: "cryptowatch", exchange: "kraken", pair: "btcusd" },
        { type: "cryptowatch", exchange: "bitstamp", pair: "btcusd" },
      ],
    },
  },
  "ELASTIC_STABLESPREAD/USDC": {
    type: "basketspread",
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    experimentalPriceFeeds: [
      {
        type: "medianizer",
        medianizedFeeds: [
          // FRAX/USDC:
          { type: "uniswap", uniswapAddress: "0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d", twapLength: 2 },
        ],
      },
      {
        type: "medianizer",
        medianizedFeeds: [
          // ESD/USDC:
          { type: "uniswap", uniswapAddress: "0x88ff79eb2bc5850f27315415da8685282c7610f9", twapLength: 2 },
        ],
      },
      {
        type: "medianizer",
        medianizedFeeds: [
          // BAC/DAI:
          { type: "uniswap", uniswapAddress: "0xd4405f0704621dbe9d4dea60e128e0c3b26bddbd", twapLength: 2 },
        ],
      },
    ],
    baselinePriceFeeds: [
      {
        type: "medianizer",
        medianizedFeeds: [
          {
            type: "medianizer",
            computeMean: true,
            medianizedFeeds: [
              { type: "cryptowatch", exchange: "bitfinex", pair: "usdtusd" },
              { type: "cryptowatch", exchange: "kraken", pair: "usdtusd" },
            ],
          },
          {
            type: "medianizer",
            computeMean: true,
            medianizedFeeds: [
              { type: "cryptowatch", exchange: "kraken", pair: "usdcusd" },
              { type: "cryptowatch", exchange: "bitstamp", pair: "usdcusd" },
            ],
          },
        ],
      },
    ],
  },
  "GASETH-TWAP-1Mx1M": {
    type: "uniswap",
    uniswapAddress: "0x2b5dfb7874f685bea30b7d8426c9643a4bcf5873",
    twapLength: 7200,
  },
  "GASETH-FEB21": { type: "uniswap", uniswapAddress: "0x4a8a2ea3718964ed0551a3191c30e49ea38a5ade", twapLength: 7200 },
  "GASETH-MAR21": { type: "uniswap", uniswapAddress: "0x683ea972ffa19b7bad6d6be0440e0a8465dba71c", twapLength: 7200 },
  "COMPUSDC-APR-MAR28/USDC": {
    type: "uniswap",
    uniswapAddress: "0xd8ecab1d50c3335d01885c17b1ce498105238f24",
    twapLength: 7200,
    poolDecimals: 6,
  },
  BTCDOM: { type: "domfi", pair: "BTCDOM", minTimeBetweenUpdates: 60, lookback: 7200 },
  ALTDOM: { type: "domfi", pair: "ALTDOM", minTimeBetweenUpdates: 60, lookback: 7200 },
  AMPLUSD: {
    type: "medianizer",
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "ftx", pair: "amplusdt" },
      { type: "cryptowatch", exchange: "gateio", pair: "amplusdt" },
      { type: "cryptowatch", exchange: "bitfinex", pair: "amplusd" },
    ],
  },
  DEFI_PULSE_TOTAL_TVL: { type: "defipulse", lookback: 604800, minTimeBetweenUpdates: 600, project: "all" },
  DEFI_PULSE_SUSHI_TVL: { type: "defipulse", lookback: 604800, minTimeBetweenUpdates: 600, project: "SushiSwap" },
  DEFI_PULSE_UNISWAP_TVL: { type: "defipulse", lookback: 604800, minTimeBetweenUpdates: 600, project: "Uniswap" },
  SUSHIUNI: { type: "expression", expression: "10 * DEFI_PULSE_SUSHI_TVL / DEFI_PULSE_UNISWAP_TVL" },
  CNYUSD: {
    type: "fallback",
    orderedFeeds: [
      {
        type: "tradermade",
        pair: "CNYUSD",
        minTimeBetweenUpdates: 600,
        minuteLookback: 7200,
        hourlyLookback: 259200,
        ohlcPeriod: 10, // CNYUSD only available at 10 minute granularity
      },
      { type: "forexdaily", base: "CNY", symbol: "USD", lookback: 259200 },
    ],
  },
  EURUSD: {
    type: "fallback",
    orderedFeeds: [
      { type: "tradermade", pair: "EURUSD", minTimeBetweenUpdates: 60, minuteLookback: 7200, hourlyLookback: 259200 },
      { type: "forexdaily", base: "EUR", symbol: "USD", lookback: 259200 },
    ],
  },
  PHPDAI: {
    type: "medianizer",
    computeMean: true,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "coinmarketcap", symbol: "DAI", quoteCurrency: "PHP", invertPrice: true },
      {
        type: "coingecko",
        contractAddress: "0x6b175474e89094c44da98b954eedeac495271d0f",
        quoteCurrency: "php",
        invertPrice: true,
      },
    ],
  },
  "ETH-BASIS-6M/USDC": {
    type: "expression",
    expression: `
      SPOT = median(SPOT_BINANCE, SPOT_OKEX, SPOT_FTX);
      FUTURES = median(FUT_BINANCE, FUT_OKEX, FUT_FTX);
      min(1.25, max(0.75, 1.0 + ((FUTURES - SPOT) / SPOT))) * 100
      `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    customFeeds: {
      SPOT_BINANCE: { type: "cryptowatch", exchange: "binance", pair: "ethusdt" },
      SPOT_OKEX: { type: "cryptowatch", exchange: "okex", pair: "ethusdt" },
      SPOT_FTX: { type: "cryptowatch", exchange: "ftx", pair: "ethusdt" },
      FUT_BINANCE: { type: "cryptowatch", exchange: "binance", pair: "ethusd-quarterly-future-inverse-25jun21" },
      FUT_OKEX: { type: "cryptowatch", exchange: "okex", pair: "ethusd-biquarterly-future-inverse" },
      FUT_FTX: { type: "cryptowatch", exchange: "ftx", pair: "ethusd-quarterly-futures-25jun21" },
    },
  },
  "ETH-BASIS-3M/USDC": {
    type: "expression",
    expression: `
      SPOT = median(SPOT_BINANCE, SPOT_OKEX, SPOT_FTX);
      FUTURES = median(FUT_BINANCE, FUT_OKEX, FUT_FTX);
      min(1.25, max(0.75, 1.0 + ((FUTURES - SPOT) / SPOT))) * 100
      `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    customFeeds: {
      SPOT_BINANCE: { type: "cryptowatch", exchange: "binance", pair: "ethusdt" },
      SPOT_OKEX: { type: "cryptowatch", exchange: "okex", pair: "ethusdt" },
      SPOT_FTX: { type: "cryptowatch", exchange: "ftx", pair: "ethusdt" },
      FUT_BINANCE: { type: "cryptowatch", exchange: "binance", pair: "ethusd-quarterly-future-inverse-24sep21" },
      FUT_OKEX: { type: "cryptowatch", exchange: "okex", pair: "ethusd-quarterly-future-inverse" },
      FUT_FTX: { type: "cryptowatch", exchange: "ftx", pair: "ethusd-quarterly-futures-24sep21" },
    },
  },
  "BTC-BASIS-6M/USDC": {
    type: "expression",
    expression: `
      SPOT = median(SPOT_BINANCE, SPOT_OKEX, SPOT_FTX);
      FUTURES = median(FUT_BINANCE, FUT_OKEX, FUT_FTX);
      min(1.25, max(0.75, 1.0 + ((FUTURES - SPOT) / SPOT))) * 100
      `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    customFeeds: {
      SPOT_BINANCE: { type: "cryptowatch", exchange: "binance", pair: "btcusdt" },
      SPOT_OKEX: { type: "cryptowatch", exchange: "okex", pair: "btcusdt" },
      SPOT_FTX: { type: "cryptowatch", exchange: "ftx", pair: "btcusdt" },
      FUT_BINANCE: { type: "cryptowatch", exchange: "binance", pair: "btcusd-quarterly-future-inverse-25jun21" },
      FUT_OKEX: { type: "cryptowatch", exchange: "okex", pair: "btcusd-biquarterly-future-inverse" },
      FUT_FTX: { type: "cryptowatch", exchange: "ftx", pair: "btcusd-quarterly-futures-25jun21" },
    },
  },
  "BTC-BASIS-3M/USDC": {
    type: "expression",
    expression: `
      SPOT = median(SPOT_BINANCE, SPOT_OKEX, SPOT_FTX);
      FUTURES = median(FUT_BINANCE, FUT_OKEX, FUT_FTX);
      min(1.25, max(0.75, 1.0 + ((FUTURES - SPOT) / SPOT))) * 100
      `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    customFeeds: {
      SPOT_BINANCE: { type: "cryptowatch", exchange: "binance", pair: "btcusdt" },
      SPOT_OKEX: { type: "cryptowatch", exchange: "okex", pair: "btcusdt" },
      SPOT_FTX: { type: "cryptowatch", exchange: "ftx", pair: "btcusdt" },
      FUT_BINANCE: { type: "cryptowatch", exchange: "binance", pair: "btcusd-quarterly-future-inverse-24sep21" },
      FUT_OKEX: { type: "cryptowatch", exchange: "okex", pair: "btcusd-quarterly-future-inverse" },
      FUT_FTX: { type: "cryptowatch", exchange: "ftx", pair: "btcusd-quarterly-futures-24sep21" },
    },
  },
  "USD/bBadger": {
    type: "expression",
    // Note: lower-case variables are intermediate, upper-case are configured feeds.
    expression: `
      wbtc_usd = mean(WBTC_ETH_SUSHI, WBTC_ETH_UNI) / USDETH;
      badger_usd_sushi = wbtc_usd * BADGER_WBTC_SUSHI;
      badger_usd_uni = wbtc_usd * BADGER_WBTC_UNI;
      badger_usd = median(badger_usd_sushi, badger_usd_uni, BADGER_USD_HUOBI);
      1 / (badger_usd * BBADGER_BADGER)
    `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    twapLength: 300,
    priceFeedDecimals: 18,
    customFeeds: {
      WBTC_ETH_SUSHI: { type: "uniswap", uniswapAddress: "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58" },
      WBTC_ETH_UNI: { type: "uniswap", uniswapAddress: "0xBb2b8038a1640196FbE3e38816F3e67Cba72D940" },
      BADGER_WBTC_SUSHI: {
        type: "uniswap",
        uniswapAddress: "0x110492b31c59716ac47337e616804e3e3adc0b4a",
        invertPrice: true,
      },
      BADGER_WBTC_UNI: {
        type: "uniswap",
        uniswapAddress: "0xcd7989894bc033581532d2cd88da5db0a4b12859",
        invertPrice: true,
      },
      BADGER_USD_HUOBI: { type: "cryptowatch", exchange: "huobi", pair: "badgerusdt", twapLength: 0 },
      BBADGER_BADGER: { type: "vault", address: "0x19d97d8fa813ee2f51ad4b4e04ea08baf4dffc28" },
    },
  },
  "USD-[bwBTC/ETH SLP]": {
    type: "expression",
    expression: `
      wbtc_usd = mean(WBTC_ETH_SUSHI, WBTC_ETH_UNI) / USDETH;
      eth_usd = 1 / USDETH;
      lp_usd = (wbtc_usd * WBTC_PER_SHARE) + (eth_usd * ETH_PER_SHARE);
      1 / (BLP_LP * lp_usd)
    `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    twapLength: 300,
    priceFeedDecimals: 18,
    customFeeds: {
      WBTC_ETH_SUSHI: { type: "uniswap", uniswapAddress: "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58" },
      WBTC_ETH_UNI: { type: "uniswap", uniswapAddress: "0xBb2b8038a1640196FbE3e38816F3e67Cba72D940" },
      ETH_PER_SHARE: {
        type: "lp",
        poolAddress: "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
      WBTC_PER_SHARE: {
        type: "lp",
        poolAddress: "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58",
        tokenAddress: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      },
      BLP_LP: { type: "vault", address: "0x758A43EE2BFf8230eeb784879CdcFF4828F2544D" },
    },
  },
  XAUPERL: { type: "expression", expression: "XAUUSD * USDPERL" },
  XAUUSD: {
    type: "fallback",
    orderedFeeds: [
      { type: "tradermade", pair: "XAUUSD", minuteLookback: 7200, hourlyLookback: 259200, minTimeBetweenUpdates: 60 },
    ],
  },
  uSTONKS_APR21: {
    type: "uniswap",
    uniswapAddress: "0xedf187890af846bd59f560827ebd2091c49b75df",
    twapLength: 7200,
    invertPrice: true,
  },
  DIGGBTC: {
    type: "expression",
    // Note: lower-case variables are intermediate, upper-case are configured feeds.
    expression: `
      mean(DIGG_WBTC_SUSHI, DIGG_WBTC_UNI)
    `,
    lookback: 93600,
    minTimeBetweenUpdates: 60,
    twapLength: 86400,
    priceFeedDecimals: 8,
    customFeeds: {
      DIGG_WBTC_SUSHI: {
        type: "uniswap",
        uniswapAddress: "0x9a13867048e01c663ce8ce2fe0cdae69ff9f35e3",
        invertPrice: true,
      },
      DIGG_WBTC_UNI: {
        type: "uniswap",
        uniswapAddress: "0xe86204c4eddd2f70ee00ead6805f917671f56c52",
        invertPrice: true,
      },
    },
  },
  DIGGETH: {
    type: "expression",
    // Note: lower-case variables are intermediate, upper-case are configured feeds.
    expression: `
      wbtc_eth = mean(WBTC_ETH_SUSHI, WBTC_ETH_UNI);
      DIGGBTC * wbtc_eth
    `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    twapLength: 1800,
    priceFeedDecimals: 8,
    customFeeds: {
      WBTC_ETH_SUSHI: { type: "uniswap", uniswapAddress: "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58" },
      WBTC_ETH_UNI: { type: "uniswap", uniswapAddress: "0xBb2b8038a1640196FbE3e38816F3e67Cba72D940" },
      DIGGBTC: {
        type: "expression",
        // Note: lower-case variables are intermediate, upper-case are configured feeds.
        expression: `
          mean(DIGG_WBTC_SUSHI, DIGG_WBTC_UNI)
        `,
        lookback: 7200,
        minTimeBetweenUpdates: 60,
        twapLength: 1800,
        priceFeedDecimals: 8,
        customFeeds: {
          DIGG_WBTC_SUSHI: {
            type: "uniswap",
            uniswapAddress: "0x9a13867048e01c663ce8ce2fe0cdae69ff9f35e3",
            invertPrice: true,
          },
          DIGG_WBTC_UNI: {
            type: "uniswap",
            uniswapAddress: "0xe86204c4eddd2f70ee00ead6805f917671f56c52",
            invertPrice: true,
          },
        },
      },
    },
  },
  DIGGUSD: {
    type: "expression",
    // Note: lower-case variables are intermediate, upper-case are configured feeds.
    expression: `
      eth_usd = 1 / USDETH;
      DIGGETH * eth_usd
    `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    twapLength: 1800,
    priceFeedDecimals: 6,
  },
  USDAAVE: {
    type: "medianizer",
    invertPrice: true,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "aaveusd" },
      { type: "cryptowatch", exchange: "binance", pair: "aaveusdt" },
      { type: "cryptowatch", exchange: "okex", pair: "aaveusdt" },
    ],
  },
  AAVEUSD: {
    type: "medianizer",
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "aaveusd" },
      { type: "cryptowatch", exchange: "binance", pair: "aaveusdt" },
      { type: "cryptowatch", exchange: "okex", pair: "aaveusdt" },
    ],
  },
  USDLINK: {
    type: "medianizer",
    invertPrice: true,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "linkusd" },
      { type: "cryptowatch", exchange: "binance", pair: "linkusdt" },
      { type: "cryptowatch", exchange: "okex", pair: "linkusdt" },
    ],
  },
  LINKUSD: {
    type: "medianizer",
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "linkusd" },
      { type: "cryptowatch", exchange: "binance", pair: "linkusdt" },
      { type: "cryptowatch", exchange: "okex", pair: "linkusdt" },
    ],
  },
  USDSNX: {
    type: "medianizer",
    invertPrice: true,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "snxusd" },
      { type: "cryptowatch", exchange: "binance", pair: "snxusdt" },
      { type: "cryptowatch", exchange: "okex", pair: "snxusdt" },
    ],
  },
  SNXUSD: {
    type: "medianizer",
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "snxusd" },
      { type: "cryptowatch", exchange: "binance", pair: "snxusdt" },
      { type: "cryptowatch", exchange: "okex", pair: "snxusdt" },
    ],
  },
  USDUMA: {
    type: "medianizer",
    invertPrice: true,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "umausd" },
      { type: "cryptowatch", exchange: "binance", pair: "umausdt" },
      { type: "cryptowatch", exchange: "okex", pair: "umausdt" },
    ],
  },
  UMAUSD: {
    type: "medianizer",
    minTimeBetweenUpdates: 60,
    twapLength: 3600,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "umausd" },
      { type: "cryptowatch", exchange: "binance", pair: "umausdt" },
      { type: "cryptowatch", exchange: "okex", pair: "umausdt" },
    ],
  },
  USDUNI: {
    type: "medianizer",
    invertPrice: true,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "uniusd" },
      { type: "cryptowatch", exchange: "binance", pair: "uniusdt" },
      { type: "cryptowatch", exchange: "okex", pair: "uniusdt" },
    ],
  },
  UNIUSD: {
    type: "medianizer",
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "uniusd" },
      { type: "cryptowatch", exchange: "binance", pair: "uniusdt" },
      { type: "cryptowatch", exchange: "okex", pair: "uniusdt" },
    ],
  },
  USDOCEAN: {
    type: "medianizer",
    invertPrice: true,
    minTimeBetweenUpdates: 60,
    historicalTimestampBuffer: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "binance", pair: "oceanusdt" },
      { type: "cryptowatch", exchange: "kraken", pair: "oceanusd" },
      { type: "cryptowatch", exchange: "bitz", pair: "oceanusdt" },
    ],
  },
  OCEANUSD: {
    type: "medianizer",
    minTimeBetweenUpdates: 60,
    historicalTimestampBuffer: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "binance", pair: "oceanusdt" },
      { type: "cryptowatch", exchange: "kraken", pair: "oceanusd" },
      { type: "cryptowatch", exchange: "bitz", pair: "oceanusdt" },
    ],
  },
  USDBTC_18DEC: {
    type: "medianizer",
    invertPrice: true,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "btcusd" },
      { type: "cryptowatch", exchange: "binance", pair: "btcusdt" },
      { type: "cryptowatch", exchange: "bitstamp", pair: "btcusd" },
    ],
  },
  "STABLESPREAD/USDC_18DEC": {
    type: "basketspread",
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    experimentalPriceFeeds: [
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "bittrex", pair: "ustusdt" },
          { type: "uniswap", uniswapAddress: "0xc50ef7861153c51d383d9a7d48e6c9467fb90c38", twapLength: 2 },
        ],
      },
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "binance", pair: "busdusdt" },
          { type: "uniswap", uniswapAddress: "0xa0abda1f980e03d7eadb78aed8fc1f2dd0fe83dd", twapLength: 2 },
        ],
      },
      {
        type: "medianizer",
        computeMean: true,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "bittrex", pair: "cusdusdt" },
          // NOTE: The OKCoin exchange is not available on Cryptowatch for this pair,
          // presumably because it has such low volume.
          // { type: "cryptowatch", exchange: "okcoin" }
        ],
      },
    ],
    baselinePriceFeeds: [
      {
        type: "medianizer",
        medianizedFeeds: [
          {
            type: "medianizer",
            computeMean: true,
            medianizedFeeds: [
              { type: "cryptowatch", exchange: "bitfinex", pair: "usdtusd" },
              { type: "cryptowatch", exchange: "kraken", pair: "usdtusd" },
            ],
          },
          {
            type: "medianizer",
            computeMean: true,
            medianizedFeeds: [
              { type: "cryptowatch", exchange: "kraken", pair: "usdcusd" },
              { type: "cryptowatch", exchange: "bitstamp", pair: "usdcusd" },
            ],
          },
        ],
      },
    ],
  },
  BCHNBTC_18DEC: {
    type: "medianizer",
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "BCHBTC" },
      { type: "cryptowatch", exchange: "binance", pair: "BCHBTC" },
      { type: "cryptowatch", exchange: "huobi", pair: "BCHBTC" },
    ],
  },
  ETHBTC_FR: {
    type: "expression",
    expression: `
        ETHBTC_FV = ETH\\/BTC * PERP_FRM;
        round(max(-0.00001, min(0.00001, (ETHBTC_FV - ETHBTC_PERP) / ETHBTC_FV / 86400)), 9)
    `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    twapLength: 3600,
    customFeeds: {
      ETHBTC_PERP: { type: "uniswap", invertPrice: true, uniswapAddress: "0x899a45ee5a03d8cc57447157a17ce4ea4745b199" },
      PERP_FRM: { type: "frm", perpetualAddress: "0x32f0405834c4b50be53199628c45603cea3a28aa" },
    },
  },
  BALUSD: {
    type: "expression",
    expression: `
      SPOT_BALANCER = SPOT_BALANCER_ETH * ETHUSD;
      median(SPOT_BINANCE, SPOT_COINBASE_PRO, SPOT_BALANCER)
    `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    customFeeds: {
      SPOT_BALANCER_ETH: {
        type: "balancer",
        twapLength: 2,
        lookback: 7200,
        balancerAddress: "0x59a19d8c652fa0284f44113d0ff9aba70bd46fb4",
        balancerTokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        balancerTokenOut: "0xba100000625a3754423978a60c9317c58a424e3D",
        poolDecimals: 18,
      },
      SPOT_BINANCE: { type: "cryptowatch", exchange: "binance", pair: "balusdt" },
      SPOT_COINBASE_PRO: { type: "cryptowatch", exchange: "coinbase-pro", pair: "balusd" },
      ETHUSD: {
        type: "medianizer",
        minTimeBetweenUpdates: 60,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "coinbase-pro", pair: "ethusd" },
          { type: "cryptowatch", exchange: "binance", pair: "ethusdt" },
          { type: "cryptowatch", exchange: "kraken", pair: "ethusd" },
        ],
      },
    },
  },
  XSUSHIUSD: {
    type: "expression",
    expression: `
        SPOT_SUSHISWAP = SPOT_SUSHISWAP_ETH * ETHUSD;
        SUSHIUSD = median(SPOT_BINANCE, SPOT_HUOBI, SPOT_SUSHISWAP);
        SUSHIUSD * SUSHI_PER_SHARE
    `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    customFeeds: {
      SPOT_BINANCE: { type: "cryptowatch", exchange: "binance", pair: "sushiusdt" },
      SPOT_HUOBI: { type: "cryptowatch", exchange: "huobi", pair: "sushiusdt" },
      SPOT_SUSHISWAP_ETH: {
        type: "uniswap",
        uniswapAddress: "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0",
        twapLength: 2,
      },
      ETHUSD: {
        type: "medianizer",
        minTimeBetweenUpdates: 60,
        medianizedFeeds: [
          { type: "cryptowatch", exchange: "coinbase-pro", pair: "ethusd" },
          { type: "cryptowatch", exchange: "binance", pair: "ethusdt" },
          { type: "cryptowatch", exchange: "kraken", pair: "ethusd" },
        ],
      },
      SUSHI_PER_SHARE: {
        type: "lp",
        poolAddress: "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272",
        tokenAddress: "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2",
      },
    },
  },
  uSTONKS_JUN21: {
    type: "uniswap",
    uniswapAddress: "0x360acfeb5c1548bad3583c559a646d803077236d",
    twapLength: 7200,
    invertPrice: false,
  },
  PUNKETH_TWAP: {
    type: "uniswap",
    uniswapAddress: "0x6E01DB46b183593374A49c0025e42c4bB7Ee3ffA",
    twapLength: 7200,
    invertPrice: false,
  },
  USDXIO: {
    type: "expression",
    expression: "ETHXIO * USDETH",
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    twapLength: 3600,
    customFeeds: {
      ETHXIO: { type: "uniswap", uniswapAddress: "0xe0cc5afc0ff2c76183416fb8d1a29f6799fb2cdf", invertPrice: true },
    },
  },
  iFARMUSD: {
    type: "expression",
    expression: `
        FARMUSD = FARMETH_UNISWAP / USDETH;
        FARMUSD * FARM_PER_SHARE
    `,
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    customFeeds: {
      FARMETH_UNISWAP: {
        type: "uniswap",
        uniswapAddress: "0x56feAccb7f750B997B36A68625C7C596F0B41A58",
        twapLength: 900,
      },
      FARM_PER_SHARE: { type: "harvestvault", address: "0x1571eD0bed4D987fe2b498DdBaE7DFA19519F651" },
    },
  },
  USDiFARM: { type: "expression", expression: "1 / iFARMUSD" },
  USDDEXTF: {
    type: "expression",
    expression: "ETHDEXTF * USDETH",
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    twapLength: 300,
    customFeeds: {
      ETHDEXTF: { type: "uniswap", uniswapAddress: "0xa1444ac5b8ac4f20f748558fe4e848087f528e00", invertPrice: true },
    },
  },
  DEXTFUSD: {
    type: "expression",
    expression: "1 / (ETHDEXTF * USDETH)",
    lookback: 7200,
    minTimeBetweenUpdates: 60,
    twapLength: 300,
    customFeeds: {
      ETHDEXTF: { type: "uniswap", uniswapAddress: "0xa1444ac5b8ac4f20f748558fe4e848087f528e00", invertPrice: true },
    },
  },
  uSTONKS_0921: {
    type: "uniswap",
    uniswapAddress: "0xb9292B40cab08e5208b863ea9c4c4927a2308eEE",
    twapLength: 7200,
    invertPrice: true,
  },
  "ETH-EUR": {
    type: "medianizer",
    invertPrice: false,
    minTimeBetweenUpdates: 60,
    medianizedFeeds: [
      { type: "cryptowatch", exchange: "coinbase-pro", pair: "etheur" },
      { type: "cryptowatch", exchange: "kraken", pair: "etheur" },
    ],
  },
  "DAI-EUR": { type: "cryptowatch", invertPrice: false, minTimeBetweenUpdates: 60, exchange: "kraken", pair: "daieur" },
  "USDT-EUR": {
    type: "cryptowatch",
    invertPrice: false,
    minTimeBetweenUpdates: 60,
    exchange: "kraken",
    pair: "usdteur",
  },
  "USDC-EUR": {
    type: "cryptowatch",
    invertPrice: false,
    minTimeBetweenUpdates: 60,
    exchange: "kraken",
    pair: "usdceur",
  },
  "cDAI-DAI": { type: "compound", address: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643" },
  "COMP-EUR": {
    type: "cryptowatch",
    invertPrice: false,
    minTimeBetweenUpdates: 60,
    exchange: "kraken",
    pair: "compeur",
  },
  "[YD-ETH-MAR21]-EUR": {
    type: "expression",
    expression: "\\[YD\\-ETH\\-MAR21\\]\\-USDC * USDC\\-EUR",
    customFeeds: {
      "[YD-ETH-MAR21]-USDC": {
        type: "balancerSpot",
        poolAddress: "0x5e065D534d1DAaf9E6222AfA1D09e7Dac6cbD0f7",
        quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        baseAddress: "0x90f802c7e8fb5d40b0de583e34c065a3bd2020d8",
      },
    },
  },
  "[yUSD-SEP20]-EUR": {
    type: "expression",
    expression: "\\[yUSD\\-SEP20\\]\\-USDC * USDC\\-EUR",
    customFeeds: {
      "[yUSD-SEP20]-USDC": {
        type: "balancerSpot",
        poolAddress: "0x58ef3abab72c6c365d4d0d8a70039752b9f32bc9",
        quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        baseAddress: "0x81ab848898b5ffd3354dbbefb333d5d183eedcb5",
      },
    },
  },
  "BPT[[yUSD-SEP20]+USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[yUSD\\-SEP20\\] * \\[yUSD\\-SEP20\\]\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[yUSD-SEP20]": {
        type: "lpBalancer",
        poolAddress: "0x58ef3abab72c6c365d4d0d8a70039752b9f32bc9",
        tokenAddress: "0x81ab848898b5ffd3354dbbefb333d5d183eedcb5",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0x58ef3abab72c6c365d4d0d8a70039752b9f32bc9",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "UMA-EUR": {
    type: "fallback",
    orderedFeeds: [
      {
        type: "cryptowatch",
        invertPrice: false,
        minTimeBetweenUpdates: 60,
        exchange: "coinbase-pro",
        pair: "umaeur",
        maxBeforeTimestampBuffer: 300,
      },
      {
        type: "expression",
        expression: "UMA\\-ETH_BAL * ETH\\-EUR",
        customFeeds: {
          "UMA-ETH_BAL": {
            type: "balancerSpot",
            poolAddress: "0xb1f9ec02480dd9e16053b010dfc6e6c4b72ecad5",
            quoteAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            baseAddress: "0x04fa0d235c4abf4bcf4787af4cf447de572ef828",
          },
        },
      },
    ],
  },
  "BAL-EUR": {
    type: "fallback",
    orderedFeeds: [
      { type: "cryptowatch", invertPrice: false, minTimeBetweenUpdates: 60, exchange: "kraken", pair: "baleur" },
      {
        type: "expression",
        expression: "BAL\\-ETH_BAL * ETH\\-EUR",
        customFeeds: {
          "BAL-ETH_BAL": {
            type: "balancerSpot",
            poolAddress: "0x59a19d8c652fa0284f44113d0ff9aba70bd46fb4",
            quoteAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            baseAddress: "0xba100000625a3754423978a60c9317c58a424e3d",
          },
        },
      },
    ],
  },
  "BPT[BAL_80+ETH_20]-EUR": {
    type: "expression",
    expression: "BPT\\[BAL\\] * BAL\\-EUR + BPT\\[ETH\\] * ETH\\-EUR",
    customFeeds: {
      "BPT[BAL]": {
        type: "lpBalancer",
        poolAddress: "0x59a19d8c652fa0284f44113d0ff9aba70bd46fb4",
        tokenAddress: "0xba100000625a3754423978a60c9317c58a424e3d",
      },
      "BPT[ETH]": {
        type: "lpBalancer",
        poolAddress: "0x59a19d8c652fa0284f44113d0ff9aba70bd46fb4",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "YAM-EUR": {
    type: "expression",
    expression: "YAM\\-LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\] * LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\-EUR",
    customFeeds: {
      "YAM-LP[yDAI-yUSDC-yUSDT-yTUSD]": {
        type: "uniswapSpot",
        uniswapAddress: "0x2c7a51a357d5739c5c74bf3c96816849d2c9f726",
      },
    },
  },
  "LP[yDAI-yUSDC-yUSDT-yTUSD]-EUR": {
    type: "expression",
    expression:
      "LP\\[DAI\\] * DAI\\-EUR + LP\\[USDC\\] * USDC\\-EUR + LP\\[USDT\\] * USDT\\-EUR + LP\\[TUSD\\] * TUSD\\-EUR",
    customFeeds: {
      "LP[DAI]": {
        type: "lpCurve",
        lpAddress: "0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8",
        tokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      },
      "LP[USDC]": {
        type: "lpCurve",
        lpAddress: "0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8",
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      },
      "LP[USDT]": {
        type: "lpCurve",
        lpAddress: "0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8",
        tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      },
      "LP[TUSD]": {
        type: "lpCurve",
        lpAddress: "0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8",
        tokenAddress: "0x0000000000085d4780B73119b644AE5ecd22b376",
      },
      "TUSD-EUR": {
        type: "expression",
        expression: "median(TUSD\\-DAI * DAI\\-EUR, TUSD\\-USDC * USDC\\-EUR, TUSD\\-USDT * USDT\\-EUR)",
        customFeeds: {
          "TUSD-DAI": {
            type: "curveSpot",
            poolAddress: "0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51",
            baseAddress: "0x0000000000085d4780B73119b644AE5ecd22b376",
            quoteAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          },
          "TUSD-USDC": {
            type: "curveSpot",
            poolAddress: "0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51",
            baseAddress: "0x0000000000085d4780B73119b644AE5ecd22b376",
            quoteAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          },
          "TUSD-USDT": {
            type: "curveSpot",
            poolAddress: "0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51",
            baseAddress: "0x0000000000085d4780B73119b644AE5ecd22b376",
            quoteAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          },
        },
      },
    },
  },
  "UNI-V2[YAM-LP[yDAI-yUSDC-yUSDT-yTUSD]]-EUR": {
    type: "expression",
    expression:
      "UNI\\-V2\\[YAM\\] * YAM\\-EUR + UNI\\-V2\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\] * LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\-EUR",
    customFeeds: {
      "UNI-V2[YAM]": {
        type: "lpUniswap",
        poolAddress: "0x2c7a51a357d5739c5c74bf3c96816849d2c9f726",
        tokenAddress: "0x0e2298e3b3390e3b945a5456fbf59ecc3f55da16",
      },
      "UNI-V2[LP[yDAI-yUSDC-yUSDT-yTUSD]]": {
        type: "lpUniswap",
        poolAddress: "0x2c7a51a357d5739c5c74bf3c96816849d2c9f726",
        tokenAddress: "0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8",
      },
    },
  },
  "CRV-EUR": {
    type: "fallback",
    invertPrice: false,
    minTimeBetweenUpdates: 60,
    orderedFeeds: [
      { type: "cryptowatch", exchange: "kraken", pair: "crveur" },
      {
        type: "expression",
        expression: "CRV\\-USDT * USDT\\-EUR",
        customFeeds: { "CRV-USDT": { type: "cryptowatch", exchange: "binance", pair: "crvusdt" } },
      },
      {
        type: "expression",
        expression: "CRV\\-ETH * ETH\\-EUR",
        customFeeds: {
          "CRV-ETH": {
            type: "uniswapSpot",
            uniswapAddress: "0x3dA1313aE46132A397D90d95B1424A9A7e3e0fCE",
            invertPrice: true,
          },
        },
      },
    ],
  },
  "cETH-ETH": { type: "compound", address: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5" },
  "YVAULT[LP[yDAI-yUSDC-yUSDT-yTUSD]]-EUR": {
    type: "expression",
    expression: "YVAULT\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\] * LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\-EUR",
    customFeeds: {
      "YVAULT[LP[yDAI-yUSDC-yUSDT-yTUSD]]": { type: "vault", address: "0x5dbcf33d8c2e976c6b560249878e6f1491bca25c" },
    },
  },
  "PASTA-EUR": {
    type: "expression",
    expression:
      "PASTA\\-YVAULT\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\] * YVAULT\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\]\\-EUR",
    customFeeds: {
      "PASTA-YVAULT[LP[yDAI-yUSDC-yUSDT-yTUSD]]": {
        type: "uniswapSpot",
        uniswapAddress: "0x2dF3355eD1b532486B0e48A4977afc1CA8E8a566",
      },
    },
  },
  "[yUSD-OCT20]-EUR": {
    type: "expression",
    expression: "\\[yUSD\\-OCT20\\]\\-USDC * USDC\\-EUR",
    customFeeds: {
      "[yUSD-OCT20]-USDC": {
        type: "balancerSpot",
        poolAddress: "0xd2f574637898526fcddfb3d487cc73c957fa0268",
        quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        baseAddress: "0xb2fdd60ad80ca7ba89b9bab3b5336c2601c020b4",
      },
    },
  },
  "BPT[[yUSD-OCT20]+USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[yUSD\\-OCT20\\] * \\[yUSD\\-OCT20\\]\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[yUSD-OCT20]": {
        type: "lpBalancer",
        poolAddress: "0xd2f574637898526fcddfb3d487cc73c957fa0268",
        tokenAddress: "0xb2fdd60ad80ca7ba89b9bab3b5336c2601c020b4",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0xd2f574637898526fcddfb3d487cc73c957fa0268",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "crETH-ETH": { type: "compound", address: "0xd06527d5e56a3495252a528c4987003b712860ee" },
  "UNI-V2[UMA-ETH]-EUR": {
    type: "expression",
    expression: "UNI\\-V2\\[UMA\\] * UMA\\-EUR + UNI\\-V2\\[ETH\\] * ETH\\-EUR",
    customFeeds: {
      "UNI-V2[UMA]": {
        type: "lpUniswap",
        poolAddress: "0x88d97d199b9ed37c29d846d00d443de980832a22",
        tokenAddress: "0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828",
      },
      "UNI-V2[ETH]": {
        type: "lpUniswap",
        poolAddress: "0x88d97d199b9ed37c29d846d00d443de980832a22",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "SUSHI-EUR": {
    type: "fallback",
    invertPrice: false,
    minTimeBetweenUpdates: 60,
    orderedFeeds: [
      { type: "cryptowatch", exchange: "kraken", pair: "sushieur" },
      {
        type: "expression",
        expression: "SUSHI\\-USDT * USDT\\-EUR",
        customFeeds: { "SUSHI-USDT": { type: "cryptowatch", exchange: "binance", pair: "sushiusdt" } },
      },
      {
        type: "expression",
        expression: "SUSHI\\-ETH * ETH\\-EUR",
        customFeeds: {
          "SUSHI-ETH": { type: "uniswapSpot", uniswapAddress: "0xCE84867c3c02B05dc570d0135103d3fB9CC19433" },
        },
      },
    ],
  },
  "fUSDT-EUR": {
    type: "expression",
    expression: "fUSDT\\[USDT\\] * USDT\\-EUR",
    customFeeds: { "fUSDT[USDT]": { type: "harvestvault", address: "0xc7ee21406bb581e741fbb8b21f213188433d9f2f" } },
  },
  "UNI-V2[DAI-ETH]-EUR": {
    type: "expression",
    expression: "UNI\\-V2\\[DAI\\] * DAI\\-EUR + UNI\\-V2\\[ETH\\] * ETH\\-EUR",
    customFeeds: {
      "UNI-V2[DAI]": {
        type: "lpUniswap",
        poolAddress: "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11",
        tokenAddress: "0x6b175474e89094c44da98b954eedeac495271d0f",
      },
      "UNI-V2[ETH]": {
        type: "lpUniswap",
        poolAddress: "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "yWETH-EUR": {
    type: "expression",
    expression: "yWETH\\[ETH\\] * ETH\\-EUR",
    customFeeds: { "yWETH[ETH]": { type: "vault", address: "0xe1237aa7f535b0cc33fd973d66cbf830354d16c7" } },
  },
  "FARM-EUR": {
    type: "expression",
    expression: "FARM\\-USDC * USDC\\-EUR",
    customFeeds: { "FARM-USDC": { type: "uniswapSpot", uniswapAddress: "0x514906FC121c7878424a5C928cad1852CC545892" } },
  },
  "CREAM-EUR": {
    type: "expression",
    expression: "CREAM\\-ETH * ETH\\-EUR",
    customFeeds: { "CREAM-ETH": { type: "uniswapSpot", uniswapAddress: "0xddf9b7a31b32ebaf5c064c80900046c9e5b7c65f" } },
  },
  "CRPT[yWETH-WETH]-EUR": {
    type: "expression",
    expression: "CRPT\\[yWETH\\] * yWETH\\-EUR + CRPT\\[WETH\\] * ETH\\-EUR",
    customFeeds: {
      "CRPT[yWETH]": {
        type: "lpBalancer",
        poolAddress: "0x6a3b875854f5518e85ef97620c5e7de75bbc3fa0",
        tokenAddress: "0xe1237aa7f535b0cc33fd973d66cbf830354d16c7",
      },
      "CRPT[WETH]": {
        type: "lpBalancer",
        poolAddress: "0x6a3b875854f5518e85ef97620c5e7de75bbc3fa0",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "CRPT[YVAULT[LP[yDAI-yUSDC-yUSDT-yTUSD]]-USDC]-EUR": {
    type: "expression",
    expression:
      "CRPT\\[YVAULT\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\]\\] * YVAULT\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\]\\-EUR + CRPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "CRPT[YVAULT[LP[yDAI-yUSDC-yUSDT-yTUSD]]]": {
        type: "lpBalancer",
        poolAddress: "0x661b94d96adb18646e791a06576f7905a8d1bef6",
        tokenAddress: "0x5dbcf33d8c2e976c6b560249878e6f1491bca25c",
      },
      "CRPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0x661b94d96adb18646e791a06576f7905a8d1bef6",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "crYYCRV-YVAULT[LP[yDAI-yUSDC-yUSDT-yTUSD]]": {
    type: "compound",
    address: "0x4ee15f44c6f0d8d1136c83efd2e8e4ac768954c6",
  },
  "crYETH-yWETH": { type: "compound", address: "0x01da76dea59703578040012357b81ffe62015c2d" },
  "CRPT[crYETH-crYYCRV]-EUR": {
    type: "expression",
    expression:
      "CRPT\\[crYETH\\] * crYETH\\-yWETH * yWETH\\-EUR + CRPT\\[crYYCRV\\] * crYYCRV\\-YVAULT\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\] * YVAULT\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\]\\-EUR",
    customFeeds: {
      "CRPT[crYETH]": {
        type: "lpBalancer",
        poolAddress: "0xb3284f2f22563f27cef2912637b6a00f162317c4",
        tokenAddress: "0x01da76dea59703578040012357b81ffe62015c2d",
      },
      "CRPT[crYYCRV]": {
        type: "lpBalancer",
        poolAddress: "0xb3284f2f22563f27cef2912637b6a00f162317c4",
        tokenAddress: "0x4ee15f44c6f0d8d1136c83efd2e8e4ac768954c6",
      },
    },
  },
  "BOOST-EUR": {
    type: "expression",
    expression: "BOOST\\-ETH * ETH\\-EUR",
    customFeeds: { "BOOST-ETH": { type: "uniswapSpot", uniswapAddress: "0x6b4a0bd2eee3ca06652f758844937daf91ea8422" } },
  },
  "SLP[DAI-ETH]-EUR": {
    type: "expression",
    expression: "SLP\\[DAI\\] * DAI\\-EUR + SLP\\[ETH\\] * ETH\\-EUR",
    customFeeds: {
      "SLP[DAI]": {
        type: "lpUniswap",
        poolAddress: "0xc3d03e4f041fd4cd388c549ee2a29a9e5075882f",
        tokenAddress: "0x6b175474e89094c44da98b954eedeac495271d0f",
      },
      "SLP[ETH]": {
        type: "lpUniswap",
        poolAddress: "0xc3d03e4f041fd4cd388c549ee2a29a9e5075882f",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "SASHIMI-EUR": {
    type: "expression",
    expression: "SASHIMI\\-ETH * ETH\\-EUR",
    customFeeds: {
      "SASHIMI-ETH": {
        type: "uniswapSpot",
        uniswapAddress: "0x4b618087dae7765823bc47ffbf38c8ee8489f5ca",
        invertPrice: true,
      },
    },
  },
  "SLP[UMA-ETH]-EUR": {
    type: "expression",
    expression: "SLP\\[UMA\\] * UMA\\-EUR + SLP\\[ETH\\] * ETH\\-EUR",
    customFeeds: {
      "SLP[UMA]": {
        type: "lpUniswap",
        poolAddress: "0x001b6450083e531a5a7bf310bd2c1af4247e23d4",
        tokenAddress: "0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828",
      },
      "SLP[ETH]": {
        type: "lpUniswap",
        poolAddress: "0x001b6450083e531a5a7bf310bd2c1af4247e23d4",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "crYETH-EUR": { type: "expression", expression: "crYETH\\-yWETH * yWETH\\-EUR" },
  "crYYCRV-EUR": {
    type: "expression",
    expression:
      "crYYCRV\\-YVAULT\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\] * YVAULT\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\]\\-EUR",
  },
  "UNI-V2[USDT-ETH]-EUR": {
    type: "expression",
    expression: "UNI\\-V2\\[USDT\\] * USDT\\-EUR + UNI\\-V2\\[ETH\\] * ETH\\-EUR",
    customFeeds: {
      "UNI-V2[USDT]": {
        type: "lpUniswap",
        poolAddress: "0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852",
        tokenAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      },
      "UNI-V2[ETH]": {
        type: "lpUniswap",
        poolAddress: "0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "SAKE-EUR": {
    type: "fallback",
    orderedFeeds: [
      {
        type: "expression",
        expression:
          "median(SAKE\\-ETH * ETH\\-EUR, SAKE\\-DAI * DAI\\-EUR, SAKE\\-USDC * USDC\\-EUR, SAKE\\-USDT * USDT\\-EUR)",
        customFeeds: {
          "SAKE-ETH": { type: "uniswapSpot", uniswapAddress: "0xAC10f17627Cd6bc22719CeEBf1fc524C9Cfdc255" },
          "SAKE-DAI": { type: "uniswapSpot", uniswapAddress: "0x838ce8f4Da8b49EA72378427485CF827c08a0abf" },
          "SAKE-USDC": { type: "uniswapSpot", uniswapAddress: "0xEc694c829CC192667cDAA6C7639Ef362f3cbF575" },
          "SAKE-USDT": { type: "uniswapSpot", uniswapAddress: "0x5B255e213bCcE0FA8Ad2948E3D7A6F6E76472db8" },
        },
      },
      {
        type: "expression",
        expression:
          "median(SAKE\\-ETH * ETH\\-EUR, SAKE\\-DAI * DAI\\-EUR, SAKE\\-USDC * USDC\\-EUR, SAKE\\-USDT * USDT\\-EUR)",
        customFeeds: {
          "SAKE-ETH": { type: "uniswapSpot", uniswapAddress: "0xB8172076ceb35B6701F96eB9088818EFc010BD44" },
          "SAKE-DAI": { type: "uniswapSpot", uniswapAddress: "0x4e1f89DE12c51047Ff4137d1F6aed25fcc9AAE52" },
          "SAKE-USDC": { type: "uniswapSpot", uniswapAddress: "0x7945d9F0e5c04cd4d1C80Edb5C620f267042533b" },
          "SAKE-USDT": { type: "uniswapSpot", uniswapAddress: "0x7921Cf04bF55003B065D5a666C62f938bB4FFDf5" },
        },
      },
    ],
  },
  "PICKLE-EUR": {
    type: "expression",
    expression: "PICKLE\\-ETH * ETH\\-EUR",
    customFeeds: {
      "PICKLE-ETH": { type: "uniswapSpot", uniswapAddress: "0xdc98556Ce24f007A5eF6dC1CE96322d65832A819" },
    },
  },
  "CREED-EUR": {
    type: "expression",
    expression: "CREED\\-ETH * ETH\\-EUR",
    customFeeds: { "CREED-ETH": { type: "uniswapSpot", uniswapAddress: "0xac11DbED5E2520216F427c39994334B7C4c10b65" } },
  },
  "UNI-V2[USDC-ETH]-EUR": {
    type: "expression",
    expression: "UNI\\-V2\\[USDC\\] * USDC\\-EUR + UNI\\-V2\\[ETH\\] * ETH\\-EUR",
    customFeeds: {
      "UNI-V2[USDC]": {
        type: "lpUniswap",
        poolAddress: "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
      "UNI-V2[ETH]": {
        type: "lpUniswap",
        poolAddress: "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "UNI-EUR": {
    type: "expression",
    expression: "UNI\\-ETH * ETH\\-EUR",
    customFeeds: { "UNI-ETH": { type: "uniswapSpot", uniswapAddress: "0xd3d2E2692501A5c9Ca623199D38826e513033a17" } },
  },
  "LP[DAI-USDC-USDT-sUSD]-EUR": {
    type: "expression",
    expression:
      "LP\\[DAI\\] * DAI\\-EUR + LP\\[USDC\\] * USDC\\-EUR + LP\\[USDT\\] * USDT\\-EUR + LP\\[sUSD\\] * sUSD\\-EUR",
    customFeeds: {
      "LP[DAI]": {
        type: "lpCurve",
        lpAddress: "0xC25a3A3b969415c80451098fa907EC722572917F",
        tokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      },
      "LP[USDC]": {
        type: "lpCurve",
        lpAddress: "0xC25a3A3b969415c80451098fa907EC722572917F",
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      },
      "LP[USDT]": {
        type: "lpCurve",
        lpAddress: "0xC25a3A3b969415c80451098fa907EC722572917F",
        tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      },
      "LP[sUSD]": {
        type: "lpCurve",
        lpAddress: "0xC25a3A3b969415c80451098fa907EC722572917F",
        tokenAddress: "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
      },
      "sUSD-EUR": {
        type: "expression",
        expression: "median(sUSD\\-DAI * DAI\\-EUR, sUSD\\-USDC * USDC\\-EUR, sUSD\\-USDT * USDT\\-EUR)",
        customFeeds: {
          "sUSD-DAI": {
            type: "curveSpot",
            poolAddress: "0xA5407eAE9Ba41422680e2e00537571bcC53efBfD",
            baseAddress: "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
            quoteAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          },
          "sUSD-USDC": {
            type: "curveSpot",
            poolAddress: "0xA5407eAE9Ba41422680e2e00537571bcC53efBfD",
            baseAddress: "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
            quoteAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          },
          "sUSD-USDT": {
            type: "curveSpot",
            poolAddress: "0xA5407eAE9Ba41422680e2e00537571bcC53efBfD",
            baseAddress: "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
            quoteAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          },
        },
      },
    },
  },
  "pcrvPlain3andSUSD-EUR": {
    type: "expression",
    expression: "LP\\[DAI\\-USDC\\-USDT\\-sUSD\\]\\-EUR * pcrv\\[LP\\[DAI\\-USDC\\-USDT\\-sUSD\\]\\]",
    customFeeds: {
      "pcrv[LP[DAI-USDC-USDT-sUSD]]": { type: "pickleJar", address: "0x2385d31f1eb3736be0c3629e6f03c4b3cd997ffd" },
    },
  },
  "[uUSDwETH-DEC]-EUR": {
    type: "expression",
    expression: "\\[uUSDwETH\\-DEC\\]\\-USDC * USDC\\-EUR",
    customFeeds: {
      "[uUSDwETH-DEC]-USDC": {
        type: "balancerSpot",
        poolAddress: "0xcce41676a4624f4a1e33a787a59d6bf96e5067bc",
        quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        baseAddress: "0xd16c79c8a39d44b2f3eb45d2019cd6a42b03e2a9",
      },
    },
  },
  "BPT[[uUSDwETH-DEC]-USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[uUSDwETH\\-DEC\\] * \\[uUSDwETH\\-DEC\\]\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[uUSDwETH-DEC]": {
        type: "lpBalancer",
        poolAddress: "0xcce41676a4624f4a1e33a787a59d6bf96e5067bc",
        tokenAddress: "0xd16c79c8a39d44b2f3eb45d2019cd6a42b03e2a9",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0xcce41676a4624f4a1e33a787a59d6bf96e5067bc",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "SakeSwap-LP[UMA-ETH]-EUR": {
    type: "expression",
    expression: "SLP\\[UMA\\] * UMA\\-EUR + SLP\\[ETH\\] * ETH\\-EUR",
    customFeeds: {
      "SLP[UMA]": {
        type: "lpUniswap",
        poolAddress: "0x4862100684713296ab30075243e76bfe87b16014",
        tokenAddress: "0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828",
      },
      "SLP[ETH]": {
        type: "lpUniswap",
        poolAddress: "0x4862100684713296ab30075243e76bfe87b16014",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "pcrvPlain3andSUSD_upgrade-EUR": {
    type: "expression",
    expression: "LP\\[DAI\\-USDC\\-USDT\\-sUSD\\]\\-EUR * pcrv\\[LP\\[DAI\\-USDC\\-USDT\\-sUSD\\]\\]",
    customFeeds: {
      "pcrv[LP[DAI-USDC-USDT-sUSD]]": { type: "pickleJar", address: "0x68d14d66b2b0d6e157c06dc8fefa3d8ba0e66a89" },
    },
  },
  "pDAI-EUR": {
    type: "expression",
    expression: "DAI\\-EUR * pDAI\\[DAI\\]",
    customFeeds: { "pDAI[DAI]": { type: "pickleJar", address: "0x6949bb624e8e8a90f87cd2058139fcd77d2f3f87" } },
  },
  "DEGO-EUR": {
    type: "expression",
    expression: "DEGO\\-ETH * ETH\\-EUR",
    customFeeds: { "DEGO-ETH": { type: "uniswapSpot", uniswapAddress: "0x23f7d99c169dee26b215edf806da8fa0706c4ecc" } },
  },
  "CRETH2-EUR": {
    type: "expression",
    expression: "CRETH2\\-ETH_CRP * ETH\\-EUR",
    customFeeds: {
      "CRETH2-ETH_CRP": {
        type: "balancerSpot",
        poolAddress: "0xbc338CA728a5D60Df7bc5e3AF5b6dF9DB697d942",
        quoteAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        baseAddress: "0xcbc1065255cbc3ab41a6868c22d1f1c573ab89fd",
      },
    },
  },
  "CRETH2-EUR_SUSHI": {
    type: "expression",
    expression: "CRETH2\\-ETH * ETH\\-EUR",
    customFeeds: {
      "CRETH2-ETH": { type: "uniswapSpot", uniswapAddress: "0x71817445D11f42506F2D7F54417c935be90Ca731" },
    },
  },
  "BPT[BAL_50-ETH_50]-EUR": {
    type: "expression",
    expression: "BPT\\[BAL\\] * BAL\\-EUR + BPT\\[ETH\\] * ETH\\-EUR",
    customFeeds: {
      "BPT[BAL]": {
        type: "lpBalancer",
        poolAddress: "0xe867bE952ee17d2D294F2de62b13B9F4aF521e9a",
        tokenAddress: "0xba100000625a3754423978a60c9317c58a424e3d",
      },
      "BPT[ETH]": {
        type: "lpBalancer",
        poolAddress: "0xe867bE952ee17d2D294F2de62b13B9F4aF521e9a",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "CRPT[CRETH2-WETH]-EUR": {
    type: "expression",
    expression: "CRPT\\[CRETH2\\] * CRETH2\\-EUR + CRPT\\[WETH\\] * ETH\\-EUR",
    customFeeds: {
      "CRPT[CRETH2]": {
        type: "lpBalancer",
        poolAddress: "0xbc338ca728a5d60df7bc5e3af5b6df9db697d942",
        tokenAddress: "0xcbc1065255cbc3ab41a6868c22d1f1c573ab89fd",
      },
      "CRPT[WETH]": {
        type: "lpBalancer",
        poolAddress: "0xbc338ca728a5d60df7bc5e3af5b6df9db697d942",
        tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
  },
  "CORN-EUR": {
    type: "expression",
    expression: "CORN\\-ETH * ETH\\-EUR",
    customFeeds: { "CORN-ETH": { type: "uniswapSpot", uniswapAddress: "0xba8ed112c5ceed4b3d770d602c2f29b78d8ec201" } },
  },
  "crUSDC-USDC": { type: "compound", address: "0x44fbebd2f576670a6c33f6fc0b00aa8c5753b322" },
  "crCRETH2-CRETH2": { type: "compound", address: "0xfd609a03b393f1a1cfcacedabf068cad09a924e2" },
  "BPT[[YD-ETH-MAR21]-USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[YD\\-ETH\\-MAR21\\] * \\[YD\\-ETH\\-MAR21\\]\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[YD-ETH-MAR21]": {
        type: "lpBalancer",
        poolAddress: "0x5e065d534d1daaf9e6222afa1d09e7dac6cbd0f7",
        tokenAddress: "0x90f802c7e8fb5d40b0de583e34c065a3bd2020d8",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0x5e065d534d1daaf9e6222afa1d09e7dac6cbd0f7",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "Zelda_WSC-EUR": {
    type: "expression",
    expression: "Zelda_WSC\\-USDC * USDC\\-EUR",
    customFeeds: {
      "Zelda_WSC-USDC": {
        type: "balancerSpot",
        poolAddress: "0x70f01aefdce76df83f992fa416bdb9d7a21098ac",
        quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        baseAddress: "0xb3f83a3be59e71876659c5cecc6a3c4d690d258e",
      },
    },
  },
  "BPT[Zelda_WSC-USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[Zelda_WSC\\] * Zelda_WSC\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[Zelda_WSC]": {
        type: "lpBalancer",
        poolAddress: "0x70f01aefdce76df83f992fa416bdb9d7a21098ac",
        tokenAddress: "0xb3f83a3be59e71876659c5cecc6a3c4d690d258e",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0x70f01aefdce76df83f992fa416bdb9d7a21098ac",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "ZEC-EUR": { type: "cryptowatch", invertPrice: false, minTimeBetweenUpdates: 60, exchange: "kraken", pair: "zeceur" },
  "FIL-EUR": { type: "cryptowatch", invertPrice: false, minTimeBetweenUpdates: 60, exchange: "kraken", pair: "fileur" },
  "MKR-EUR": {
    type: "fallback",
    orderedFeeds: [
      { type: "cryptowatch", invertPrice: false, minTimeBetweenUpdates: 60, exchange: "kraken", pair: "mkreur" },
      {
        type: "expression",
        expression: "MKR\\-ETH * ETH\\-EUR",
        customFeeds: {
          "MKR-ETH": { type: "uniswapSpot", uniswapAddress: "0xBa13afEcda9beB75De5c56BbAF696b880a5A50dD" },
        },
      },
    ],
  },
  "DANDY-EUR": {
    type: "expression",
    expression: "DANDY\\-ETH * ETH\\-EUR",
    customFeeds: { "DANDY-ETH": { type: "uniswapSpot", uniswapAddress: "0x205a823aad2335484c7c072ef7a83b0ffff0866c" } },
  },
  "WTF-EUR": {
    type: "expression",
    expression: "WTF\\-ETH * ETH\\-EUR",
    customFeeds: { "WTF-ETH": { type: "uniswapSpot", uniswapAddress: "0xab293dce330b92aa52bc2a7cd3816edaa75f890b" } },
  },
  "Zelda_SNC-EUR": {
    type: "expression",
    expression: "Zelda_SNC\\-USDC * USDC\\-EUR",
    customFeeds: {
      "Zelda_SNC-USDC": {
        type: "balancerSpot",
        poolAddress: "0x66adc23726809d5a16d71184265bc4e286ece3b8",
        quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        baseAddress: "0x654EEBaC62240E6C56bAB5f6AdF7cfA74A894510",
      },
    },
  },
  "BPT[Zelda_SNC-USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[Zelda_SNC\\] * Zelda_SNC\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[Zelda_SNC]": {
        type: "lpBalancer",
        poolAddress: "0x66adc23726809d5a16d71184265bc4e286ece3b8",
        tokenAddress: "0x654EEBaC62240E6C56bAB5f6AdF7cfA74A894510",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0x66adc23726809d5a16d71184265bc4e286ece3b8",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "Zelda_WWC-EUR": {
    type: "expression",
    expression: "Zelda_WWC\\-USDC * USDC\\-EUR",
    customFeeds: {
      "Zelda_WWC-USDC": {
        type: "balancerSpot",
        poolAddress: "0xb1da44d07b8fe6e0169f0591e8cd9a384e914bca",
        quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        baseAddress: "0x249a198d59b57fda5dda90630febc86fd8c7594c",
      },
    },
  },
  "BPT[Zelda_WWC-USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[Zelda_WWC\\] * Zelda_WWC\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[Zelda_WWC]": {
        type: "lpBalancer",
        poolAddress: "0xb1da44d07b8fe6e0169f0591e8cd9a384e914bca",
        tokenAddress: "0x249a198d59b57fda5dda90630febc86fd8c7594c",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0xb1da44d07b8fe6e0169f0591e8cd9a384e914bca",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "ETH_BASIS-EUR": {
    type: "expression",
    expression: "ETH_BASIS\\-USDC * USDC\\-EUR",
    customFeeds: {
      "ETH_BASIS-USDC": {
        type: "balancerSpot",
        poolAddress: "0x046D26561F4ce508CB44e05aB0584436B2b2F400",
        quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        baseAddress: "0x7A64B345DfE884C9a0a5CbB28EC06C3eE4989F6e",
      },
    },
  },
  "BPT[ETH_BASIS-USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[ETH_BASIS\\] * ETH_BASIS\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[ETH_BASIS]": {
        type: "lpBalancer",
        poolAddress: "0x046D26561F4ce508CB44e05aB0584436B2b2F400",
        tokenAddress: "0x7A64B345DfE884C9a0a5CbB28EC06C3eE4989F6e",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0x046D26561F4ce508CB44e05aB0584436B2b2F400",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "[YD-ETH-JUN21]-EUR": {
    type: "expression",
    expression: "\\[YD\\-ETH\\-JUN21\\]\\-USDC * USDC\\-EUR",
    customFeeds: {
      "[YD-ETH-JUN21]-USDC": {
        type: "balancerSpot",
        poolAddress: "0xf08241998394D61dC0bbbAC767B0B8242549761F",
        quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        baseAddress: "0xcBE430927370e95B4B10cFc702c6017EC7abEfC3",
      },
    },
  },
  "BPT[[YD-ETH-JUN21]-USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[YD\\-ETH\\-JUN21\\] * \\[YD\\-ETH\\-JUN21\\]\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[YD-ETH-JUN21]": {
        type: "lpBalancer",
        poolAddress: "0xf08241998394D61dC0bbbAC767B0B8242549761F",
        tokenAddress: "0xcBE430927370e95B4B10cFc702c6017EC7abEfC3",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0xf08241998394D61dC0bbbAC767B0B8242549761F",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "[YD-ETH-DEC21]-EUR": {
    type: "expression",
    expression: "\\[YD\\-ETH\\-DEC21\\]\\-USDC * USDC\\-EUR",
    customFeeds: {
      "[YD-ETH-DEC21]-USDC": {
        type: "balancerSpot",
        poolAddress: "0x002d3737e074fB4521036F2c41BebA05d221BA69",
        quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        baseAddress: "0xe813b65dA6c38A04591aED3f082d32Db7D53C382",
      },
    },
  },
  "BPT[[YD-ETH-DEC21]-USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[YD\\-ETH\\-DEC21\\] * \\[YD\\-ETH\\-DEC21\\]\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[YD-ETH-DEC21]": {
        type: "lpBalancer",
        poolAddress: "0x002d3737e074fB4521036F2c41BebA05d221BA69",
        tokenAddress: "0xe813b65dA6c38A04591aED3f082d32Db7D53C382",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0x002d3737e074fB4521036F2c41BebA05d221BA69",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "ETH_FALL_BASIS-EUR": {
    type: "fallback",
    orderedFeeds: [
      {
        type: "expression",
        expression: "ETH_FALL_BASIS\\-USDC * USDC\\-EUR",
        customFeeds: {
          "ETH_FALL_BASIS-USDC": {
            type: "balancerSpot",
            poolAddress: "0x289214bda166160a5837caa3faff1c560a5d3413",
            quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            baseAddress: "0xdd6145e24DD53550Fb449b9f78BAe0fC347CFF09",
          },
        },
      },
      {
        type: "expression",
        expression: "ETH_FALL_BASIS\\-USDC * USDC\\-EUR",
        customFeeds: {
          "ETH_FALL_BASIS-USDC": {
            type: "balancerSpot",
            poolAddress: "0xfc2906f44c8eca088fde6b479d60bdbcd7176772",
            quoteAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            baseAddress: "0xdd6145e24DD53550Fb449b9f78BAe0fC347CFF09",
          },
        },
      },
    ],
  },
  "BPT[ETH_FALL_BASIS-USDC]-EUR": {
    type: "expression",
    expression: "BPT\\[ETH_FALL_BASIS\\] * ETH_FALL_BASIS\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[ETH_FALL_BASIS]": {
        type: "lpBalancer",
        poolAddress: "0x289214bda166160a5837caa3faff1c560a5d3413",
        tokenAddress: "0xdd6145e24DD53550Fb449b9f78BAe0fC347CFF09",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0x289214bda166160a5837caa3faff1c560a5d3413",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
  "YVAULT[YPOOL]-EUR": {
    type: "expression",
    expression: "YVAULT\\[LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\] * LP\\[yDAI\\-yUSDC\\-yUSDT\\-yTUSD\\]\\-EUR",
    customFeeds: {
      "YVAULT[LP[yDAI-yUSDC-yUSDT-yTUSD]]": { type: "yvault", address: "0x4b5bfd52124784745c1071dcb244c6688d2533d3" },
    },
  },
  "BPT[ETH_FALL_BASIS-USDC-70-30]-EUR": {
    type: "expression",
    expression: "BPT\\[ETH_FALL_BASIS\\] * ETH_FALL_BASIS\\-EUR + BPT\\[USDC\\] * USDC\\-EUR",
    customFeeds: {
      "BPT[ETH_FALL_BASIS]": {
        type: "lpBalancer",
        poolAddress: "0xfc2906f44c8eca088fde6b479d60bdbcd7176772",
        tokenAddress: "0xdd6145e24DD53550Fb449b9f78BAe0fC347CFF09",
      },
      "BPT[USDC]": {
        type: "lpBalancer",
        poolAddress: "0xfc2906f44c8eca088fde6b479d60bdbcd7176772",
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
  },
};

// Pull in the number of decimals for each identifier from the common getPrecisionForIdentifier. This is used within the
// Voterdapp and ensures that price feeds are consistently scaled through the UMA ecosystem.
Object.keys(defaultConfigs).forEach((identifierName) => {
  defaultConfigs[identifierName].priceFeedDecimals = getPrecisionForIdentifier(identifierName);
});

module.exports = { defaultConfigs };
