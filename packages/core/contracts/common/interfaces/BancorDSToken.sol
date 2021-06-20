// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

/**
 * @title Interface for Bancor DSToken (Converter Anchor).
 * @dev This only contains the methods/events that we use in our contracts or offchain infrastructure.
 */
abstract contract BancorDSToken {
    // Pool token owner (Converter Anchor)
    address public owner;
}
