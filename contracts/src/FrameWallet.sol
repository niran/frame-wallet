// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-latest/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import {BaseAccount} from "account-abstraction/core/BaseAccount.sol";
import "account-abstraction/core/Helpers.sol";
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";
import {UserOperation} from "account-abstraction/interfaces/UserOperation.sol";
import {TokenCallbackHandler} from "account-abstraction/samples/callback/TokenCallbackHandler.sol";
import {FrameVerifier} from "frame-verifier/FrameVerifier.sol";
import "frame-verifier/Encoder.sol";
import {InflateLib} from "inflate-sol/InflateLib.sol";


contract FrameWallet is BaseAccount, TokenCallbackHandler, UUPSUpgradeable, Initializable {
    IEntryPoint private immutable _ENTRY_POINT;
    string public constant URL_PREFIX = "https://frame-wallet.vercel.app/";

    // We identify Farcaster users by the Ed25519 public key they used to sign a FrameAction.
    // Users with several Farcaster keys will only be able to access a FrameWallet from the single key
    // that was used to create it.
    bytes32 public pk;

    struct FrameUserOpSignature {
        MessageData md;
        bytes ed25519sig;
        bytes compressedCallData;
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

    function _puff(bytes calldata data, uint destlen) public returns (InflateLib.ErrorCode, bytes memory) {
        return InflateLib.puff(data, destlen);
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
        // NOTE: Per EIP 4337, accounts MUST validate that the signature is a valid signature
        // of userOpHash, which includes the userOp, entryPoint, and chainId in the payload.
        // However, the userOp's calldata alone is too large to fit inside Farcaster's 256
        // character limit for URLs, so we deviate from the standard to sign less data
        // (which is insecure against replay and gas draining attacts) and to compress
        // the data before signing it.

        // userOp has a signature field intended for implementation-specific data, so we
        // use it to pass more than just the signature. We pass a FrameUserOpSignature that
        // includes the extra data we need to verify.
        FrameUserOpSignature memory frameSig = abi.decode(userOp.signature, (FrameUserOpSignature));

        // Decompress the provided compressed calldata and confirm that it matches what's directly in the userOp.
        (InflateLib.ErrorCode decompressErrorCode, bytes memory decompressedCallData) = this._puff(
            frameSig.compressedCallData, userOp.callData.length);
        
        if (decompressErrorCode != InflateLib.ErrorCode.ERR_NONE || keccak256(decompressedCallData) != keccak256(userOp.callData)) {
            return SIG_VALIDATION_FAILED;
        }
        
        // Ensure that frameUrl contains the compressed calldata so we know the user signed it.
        bytes memory expectedUrl = abi.encodePacked(
            URL_PREFIX,
            Strings.toString(block.chainid),
            ":",
            toHexString(frameSig.compressedCallData)
        );
        bytes memory frameUrl = frameSig.md.frame_action_body.url;
        if (!Strings.equal(string(frameUrl), string(expectedUrl))) {
            return SIG_VALIDATION_FAILED;
        }

        (bytes32 r, bytes32 s) = abi.decode(frameSig.ed25519sig, (bytes32, bytes32));
        if (FrameVerifier.verifyMessageData(pk, r, s, frameSig.md)) {
            return 0; // SIG_VALIDATION_SUCCESS
        } else {
            return SIG_VALIDATION_FAILED;
        }
    }

    bytes16 private constant HEX_DIGITS = "0123456789abcdef";

    function toHexString(bytes memory value) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * value.length);
        for (uint256 byteIndex = 0; byteIndex < value.length; byteIndex++) {
            uint256 hexIndex = byteIndex * 2;
            buffer[hexIndex] = HEX_DIGITS[uint8(value[byteIndex]) >> 4];
            hexIndex++;
            buffer[hexIndex] = HEX_DIGITS[uint8(value[byteIndex]) & 0xf];
        }
        return string(buffer);
    }

    /**
     * execute a transaction (called directly from owner, or by entryPoint)
     * @param dest destination address to call
     * @param value the value to pass in this call
     * @param func the calldata to pass in this call
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPoint();
        _call(dest, value, func);
    }

    /**
     * execute a sequence of transactions
     * @dev to reduce gas consumption for trivial case (no value), use a zero-length array to mean zero value
     * @param dest an array of destination addresses
     * @param value an array of values to pass to each call. can be zero-length for no-value calls
     * @param func an array of calldata to pass to each call
     */
    function executeBatch(address[] calldata dest, uint256[] calldata value, bytes[] calldata func) external {
        _requireFromEntryPoint();
        require(dest.length == func.length && (value.length == 0 || value.length == func.length), "wrong array lengths");
        if (value.length == 0) {
            for (uint256 i = 0; i < dest.length; i++) {
                _call(dest[i], 0, func[i]);
            }
        } else {
            for (uint256 i = 0; i < dest.length; i++) {
                _call(dest[i], value[i], func[i]);
            }
        }
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
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

    /**
     * Require a sequential nonce.
     *
     * The entry point enforces that the lower 64 bits of the nonce are sequential for
     * any given "key," the upper 192 bits of the nonce. Rejecting any nonces that use
     * any of the upper 192 bits is required to enforce sequential nonces.
     */
    function _validateNonce(uint256 nonce) override internal view virtual {
        require(nonce < type(uint64).max);
    }
}
