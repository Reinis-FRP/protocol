// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

/**
 * @title Interface for Bancor Converter.
 * @dev This only contains the methods/events that we use in our contracts or offchain infrastructure.
 */
abstract contract BancorConverter {
    // returns the array of reserve tokens
    function reserveTokens() public view virtual returns (address[] memory);

    // returns reserve weight for a reserve token
    function reserveWeight(address _reserveToken) public view virtual returns (uint32);

    // event triggered when the rate between two tokens in the converter changes
    event TokenRateUpdate(address indexed _token1, address indexed _token2, uint256 _rateN, uint256 _rateD);
}
