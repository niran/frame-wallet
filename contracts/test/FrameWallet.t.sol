// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {EntryPoint} from "account-abstraction/core/EntryPoint.sol";
import {UserOperation} from "account-abstraction/interfaces/UserOperation.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "frame-verifier/Encoder.sol";
import {InflateLib} from "inflate-sol/InflateLib.sol";

import {FrameWallet} from "../src/FrameWallet.sol";
import {FrameWalletFactory} from "../src/FrameWalletFactory.sol";


contract FrameWalletTest is Test {
    EntryPoint public entryPoint;
    FrameWalletFactory factory;
    bytes public initCode;
    address addressForPublicKey;

    bytes32 public constant PUBLIC_KEY = 0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419;

    function setUp() public {
        entryPoint = new EntryPoint();
        factory = new FrameWalletFactory(entryPoint);
        initCode = abi.encodePacked(address(factory), abi.encodeCall(factory.createAccount, (PUBLIC_KEY)));
        addressForPublicKey = factory.getAddress(PUBLIC_KEY);
    }

    function generateCallData() public returns (bytes memory) {
        bytes memory innerCallData = abi.encodeCall(this.approve, (
            0x0000000000000000000000000000000000000000,
            1
        ));
        bytes memory outerCallData = abi.encodeCall(this.execute, (
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, // USDC on Base
            0,
            innerCallData
        ));
        return outerCallData;
    }

    function _puff(bytes calldata data, uint destlen) public returns (InflateLib.ErrorCode, bytes memory) {
        return InflateLib.puff(data, destlen);
    }

    function testDecompressCallData() public {
        bytes memory compressedCallData = hex"db26abfe8d0109349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe99423b18f1490200";
        bytes memory expectedCallData = generateCallData();
        
        (InflateLib.ErrorCode decompressErrorCode, bytes memory decompressedCallData) = this._puff(
            compressedCallData, expectedCallData.length);
        console.log("Error Code: %d", uint(decompressErrorCode));
        console.log("Decompressed Data:");
        console.logBytes(decompressedCallData);
        assertEq(uint(decompressErrorCode), uint(InflateLib.ErrorCode.ERR_NONE));
        assertEq(decompressedCallData, expectedCallData);
    }

    function approve(address spender,uint256 value) external {}
    function execute(address x, uint256 y, bytes calldata z) external {}

    function testHandleUserOpWithoutDeployedWallet() public {
        bytes memory innerCallData = abi.encodeCall(this.approve, (
            0x0000000000000000000000000000000000000000,
            1
        ));
        bytes memory outerCallData = abi.encodeCall(this.execute, (
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, // USDC on Base
            0,
            innerCallData
        ));

        /*
        "trustedData":{"messageBytes":"0ab501080d10df920e18a485c32e20018201a4010a830168747470733a2f2f6672616d652d77616c6c65742e76657263656c2e6170702f383435333a6462323661626665386430313039333439623736666562396636373664623833376539663161613332626466613534336636326564303134363661303063323431303930373765313863356262653939343233623138663134393032303010011a1a08df920e12140000000000000000000000000000000000000001121483cfd44f550800b9e25383dd28847c726daf4e051801224061528811bca6c6d9537929b512c79f630c1fd27d30f9cf41af63e4a993f4b448c11e75e9785e91cdf71de6a90d4da1d197a3137fc9f820f1f7a0cd5b617af1082801322031351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"}
        {
            "valid": true,
            "message": {
                "data": {
                "type": "MESSAGE_TYPE_FRAME_ACTION",
                "fid": 231775,
                "timestamp": 97567396,
                "network": "FARCASTER_NETWORK_MAINNET",
                "frameActionBody": {
                    "url": "aHR0cHM6Ly9mcmFtZS13YWxsZXQudmVyY2VsLmFwcC84NDUzOmRiMjZhYmZlOGQwMTA5MzQ5Yjc2ZmViOWY2NzZkYjgzN2U5ZjFhYTMyYmRmYTU0M2Y2MmVkMDE0NjZhMDBjMjQxMDkwNzdlMThjNWJiZTk5NDIzYjE4ZjE0OTAyMDA=",
                    "buttonIndex": 1,
                    "castId": {
                    "fid": 231775,
                    "hash": "0x0000000000000000000000000000000000000001"
                    },
                    "inputText": ""
                }
                },
                "hash": "0x83cfd44f550800b9e25383dd28847c726daf4e05",
                "hashScheme": "HASH_SCHEME_BLAKE3",
                "signature": "YVKIEbymxtlTeSm1EsefYwwf0n0w+c9Br2PkqZP0tEjBHnXpeF6Rzfcd5qkNTaHRl6MTf8n4IPH3oM1bYXrxCA==",
                "signatureScheme": "SIGNATURE_SCHEME_ED25519",
                "signer": "0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"
            }
        }
        */

        MessageData memory md = MessageData({
            type_: MessageType.MESSAGE_TYPE_FRAME_ACTION,
            fid: 231775,
            timestamp: 97567396,
            network: FarcasterNetwork.FARCASTER_NETWORK_MAINNET,
            frame_action_body: FrameActionBody({
                url: "https://frame-wallet.vercel.app/8453:db26abfe8d0109349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe99423b18f1490200",
                button_index: 1,
                cast_id: CastId({fid: 231775, hash: hex"0000000000000000000000000000000000000001"})
            })
        });

        FrameWallet.FrameUserOpSignature memory frameSig = FrameWallet.FrameUserOpSignature({
            md: md,
            ed25519sig: hex"61528811bca6c6d9537929b512c79f630c1fd27d30f9cf41af63e4a993f4b448c11e75e9785e91cdf71de6a90d4da1d197a3137fc9f820f1f7a0cd5b617af108",
            urlPrefix: "https://frame-wallet.vercel.app/",
            compressedCallData: hex"db26abfe8d0109349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe99423b18f1490200"
        });

        bytes memory callData = generateCallData();

        UserOperation memory userOp = UserOperation({
            sender: addressForPublicKey,
            nonce: 0,
            initCode: initCode,
            callData: callData,
            callGasLimit: 0,
            verificationGasLimit: 0,
            preVerificationGas: 0,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 0,
            paymasterAndData: hex"",
            signature: abi.encode(frameSig)
        });
        console.logBytes(callData);
        console.log(Base64.encode(callData));

        UserOperation[] memory ops = new UserOperation[](1);
        ops[0] = userOp;
        entryPoint.handleOps(ops, payable(address(0x0)));

        assert(false);
    }

    function testHandleUserOpForDeployedWallet() public {
        FrameWallet frameWallet = factory.createAccount(PUBLIC_KEY);
        assert(false);
    }
}
