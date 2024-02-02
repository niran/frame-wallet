// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {UUPSUpgradeable} from "openzeppelin-latest/contracts/proxy/utils/UUPSUpgradeable.sol";

import {BaseAccount} from "account-abstraction/core/BaseAccount.sol";
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";
import {UserOperation} from "account-abstraction/interfaces/UserOperation.sol";
import {TokenCallbackHandler} from "account-abstraction/samples/callback/TokenCallbackHandler.sol";

contract FrameWallet is BaseAccount, TokenCallbackHandler, UUPSUpgradeable {
    IEntryPoint private immutable _ENTRY_POINT;

    // We identify Farcaster users by the Ed25519 public key they used to sign a FrameAction.
    // Users with several Farcaster keys will only be able to access a FrameWallet from the single key
    // that was used to create it.
    bytes32 public pk;
    bool public initialized = false;

    constructor(IEntryPoint anEntryPoint) {
        _ENTRY_POINT = anEntryPoint;
        // Disable the initializer for the implementation contract.
        initialized = true;
    }

    error AlreadyInitialized();

    function initialize(bytes32 ownerPk) public virtual {
        if (initialized) {
            revert AlreadyInitialized();
        }
        pk = ownerPk;
        initialized = true;
    }

    /*
     * Implement template method of BaseAccount.
     */
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
        internal
        virtual
        override
        returns (uint256 validationData)
    {
        // TODO: Implement FrameVerifier-based signature checking.
        return SIG_VALIDATION_FAILED;
    }

    error NotAuthorized(address caller);

    function _authorizeUpgrade(address newImplementation) internal view override {
        (newImplementation);
        if (msg.sender != address(entryPoint())) {
            revert NotAuthorized(msg.sender);
        }
    }

    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _ENTRY_POINT;
    }
}
