// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

/**
 * @title Interface for CurveAddressProvider.
 * @dev This only contains the methods/events that we use in our contracts or offchain infrastructure.
 */
abstract contract CurveAddressProvider {
    // Get registered contract address
    function get_address(uint256 _id) external view virtual returns (address);

    // Get the address of the main registry contract
    address public get_registry;
}

/**
 * @title Interface for CurveRegistry.
 * @dev This only contains the methods/events that we use in our contracts or offchain infrastructure.
 */
abstract contract CurveRegistry {
    // Get pool contract address
    function get_pool_from_lp_token(address arg0) external view virtual returns (address);

    // Get pool coin count
    function get_n_coins(address _pool) external virtual returns (uint256[2] memory);

    // Get added pool events
    event PoolAdded(address indexed pool, bytes rate_method_id);
}

/**
 * @title Interface for CurvePoolInfo.
 * @dev This only contains the methods/events that we use in our contracts or offchain infrastructure.
 */
abstract contract CurvePoolInfo {
    struct PoolParams {
        uint256 A;
        uint256 future_A;
        uint256 fee;
        uint256 admin_fee;
        uint256 future_fee;
        uint256 future_admin_fee;
        address future_owner;
        uint256 initial_A;
        uint256 initial_A_time;
        uint256 future_A_time;
    }

    // Get information on coins in a pool
    function get_pool_coins(address _pool)
        external
        view
        virtual
        returns (
            address[8] memory coins,
            address[8] memory underlying_coins,
            uint256[8] memory decimals,
            uint256[8] memory underlying_decimals
        );

    // Get information on a pool
    function get_pool_info(address _pool)
        external
        view
        virtual
        returns (
            uint256[8] memory balances,
            uint256[8] memory underlying_balances,
            uint256[8] memory decimals,
            uint256[8] memory underlying_decimals,
            uint256[8] memory rates,
            address lp_token,
            PoolParams memory params
        );
}

/**
 * @title Interface for CurvePool.
 * @dev This only contains the methods/events that we use in our contracts or offchain infrastructure.
 */
abstract contract CurvePool {
    // Get pool reserve token balance
    function balances(int128 arg0) external view virtual returns (uint256 out);

    // Get exchanged amount after fees
    function get_dy_underlying(
        int128 i,
        int128 j,
        uint256 dx
    ) external view virtual returns (uint256 out);

    // Get parameter A
    uint256 public A;

    // Get fee
    uint256 public fee;
}
