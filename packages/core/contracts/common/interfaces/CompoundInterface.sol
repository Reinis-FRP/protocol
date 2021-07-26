// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Interface for Compound-style markets.
 * @dev This only contains the methods/events that we use in our contracts or offchain infrastructure.
 */
abstract contract CompoundInterface {
    // Gets the last block number when interest was accrued.
    function accrualBlockNumber() external view virtual returns (uint256);

    // Gets the exchange rate from the last accrual.
    function exchangeRateStored() external view virtual returns (uint256);

    // Gets the interest rate per block for suppliers.
    function supplyRatePerBlock() external view virtual returns (uint256);

    // Return the underlying token.
    function underlying() external view virtual returns (IERC20);

    // Gets cToken decimals.
    uint8 public decimals;

    // Gets cToken symbol.
    string public symbol;
}
