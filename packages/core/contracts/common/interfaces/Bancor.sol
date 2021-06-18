// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

/**
 * @title Interface for Bancor.
 * @dev This only contains the methods/events that we use in our contracts or offchain infrastructure.
 */
abstract contract Bancor {
  function reserveTokens() public view virtual returns (address[] memory);
  function reserveWeight(address _reserveToken) public view virtual returns (uint32);
  event TokenRateUpdate(address indexed _token1, address indexed _token2, uint256 _rateN, uint256 _rateD);
}
