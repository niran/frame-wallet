// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-latest/contracts/proxy/utils/UUPSUpgradeable.sol";

import {BaseAccount} from "account-abstraction/core/BaseAccount.sol";
import "account-abstraction/core/Helpers.sol";
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";
import {UserOperation} from "account-abstraction/interfaces/UserOperation.sol";
import {TokenCallbackHandler} from "account-abstraction/samples/callback/TokenCallbackHandler.sol";
import {FrameVerifier} from "frame-verifier/FrameVerifier.sol";
import "frame-verifier/Encoder.sol";


contract FrameWallet is BaseAccount, TokenCallbackHandler, UUPSUpgradeable, Initializable {
    IEntryPoint private immutable _ENTRY_POINT;

    // We identify Farcaster users by the Ed25519 public key they used to sign a FrameAction.
    // Users with several Farcaster keys will only be able to access a FrameWallet from the single key
    // that was used to create it.
    bytes32 public pk;

    struct FrameUserOpSignature {
        MessageData md;
        bytes32 pk;
        bytes ed25519sig;
        uint32 urlOffset;
    }

    constructor(IEntryPoint anEntryPoint) {
        _ENTRY_POINT = anEntryPoint;
        // Disable the initializer for the implementation contract.
        _disableInitializers();
    }

    event FrameWalletInitialized(IEntryPoint indexed entryPoint, bytes32 indexed pk);

    function initialize(bytes32 ownerPk) public virtual initializer {
        pk = ownerPk;
        emit FrameWalletInitialized(_ENTRY_POINT, ownerPk);
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
        // userOp has a signature field intended for implementation-specific data, so we
        // use it to pass more than just the signature. We pass a FrameUserOpSignature that
        // includes the signed frame payload, the user's public key, and the offset of the
        // calldata in the URL that we need to verify.
        FrameUserOpSignature memory frameSig = abi.decode(userOp.signature, (FrameUserOpSignature));
        bytes memory frameUrl = frameSig.md.frame_action_body.url;

        // TODO: Ensure that frameUrl contains the calldata so we know the user signed it.

        (bytes32 r, bytes32 s) = abi.decode(frameSig.ed25519sig, (bytes32, bytes32));
        if (FrameVerifier.verifyMessageData(frameSig.pk, r, s, frameSig.md)) {
            return 0; // SIG_VALIDATION_SUCCESS
        } else {
            return SIG_VALIDATION_FAILED;
        }
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
