// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

/**
 * @title Interface for BalancerSpot.
 * @dev This only contains the methods/events that we use in our contracts or offchain infrastructure.
 */
abstract contract BalancerSpot {
    // Gets pool reserve tokens.
    function getFinalTokens() external view virtual returns (address[] memory tokens);

    // Gets reserve token balance in the pool
    function getBalance(address token) external view virtual returns (uint256);

    // Gets reserve token weight in the pool
    function getNormalizedWeight(address token) external view virtual returns (uint256);

    // Gets pool token decimals.
    uint8 public decimals;

    // Gets pool token symbol.
    string public symbol;

    // Gets pool totalSupply.
    uint256 public totalSupply;
}
