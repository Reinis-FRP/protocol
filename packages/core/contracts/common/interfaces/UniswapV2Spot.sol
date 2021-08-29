// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

/**
 * @title Interface for Uniswap v2 spot.
 * @dev This only contains the methods/events that we use in our contracts or offchain infrastructure.
 */
abstract contract UniswapV2Spot {
    // Gets reserve tokens.
    function getReserves()
        external
        view
        virtual
        returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32 blockTimestampLast
        );

    // Gets pool reserve token0.
    address public token0;

    // Gets pool reserve token1.
    address public token1;

    // Gets pool token decimals.
    uint8 public decimals;

    // Gets pool token symbol.
    string public symbol;

    // Gets pool totalSupply.
    uint256 public totalSupply;
}
