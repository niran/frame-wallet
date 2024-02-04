// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {EntryPoint} from "account-abstraction/core/EntryPoint.sol";
import {UserOperation} from "account-abstraction/interfaces/UserOperation.sol";
import "@openzeppelin/contracts/utils/Base64.sol";


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
        "trustedData":{"messageBytes":"0ac101080d10df920e18c38cc22e20018201b0010a8f0168747470733a2f2f6672616d652d77616c6c65742e76657263656c2e6170702f383435332f3738396364623236616266653864303130393334396237366665623966363736646238333765396631616133326264666135343366363265643031343636613030633234313039303737653138633562626539393432336231386631343930323030356165613066343910011a1a08df920e121400000000000000000000000000000000000000011214f053e34a7b16baf4d8e2691bb786a57ca4c6fdd91801224070de501ed8538475dd9fd51e73e82d944edf1f928feb4cec9715ed0a3e8bd518b076203b995beddb4116822f8e65899a391b7d18b0ddf4acdf298e48f40f410e2801322031351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"}

        {
            "valid": true,
            "message": {
                "data": {
                "type": "MESSAGE_TYPE_FRAME_ACTION",
                "fid": 231775,
                "timestamp": 97551939,
                "network": "FARCASTER_NETWORK_MAINNET",
                "frameActionBody": {
                    "url": "aHR0cHM6Ly9mcmFtZS13YWxsZXQudmVyY2VsLmFwcC84NDUzLzc4OWNkYjI2YWJmZThkMDEwOTM0OWI3NmZlYjlmNjc2ZGI4MzdlOWYxYWEzMmJkZmE1NDNmNjJlZDAxNDY2YTAwYzI0MTA5MDc3ZTE4YzViYmU5OTQyM2IxOGYxNDkwMjAwNWFlYTBmNDk=",
                    "buttonIndex": 1,
                    "castId": {
                    "fid": 231775,
                    "hash": "0x0000000000000000000000000000000000000001"
                    },
                    "inputText": ""
                }
                },
                "hash": "0xf053e34a7b16baf4d8e2691bb786a57ca4c6fdd9",
                "hashScheme": "HASH_SCHEME_BLAKE3",
                "signature": "cN5QHthThHXdn9Uec+gtlE7fH5KP60zslxXtCj6L1RiwdiA7mVvt20EWgi+OZYmaORt9GLDd9KzfKY5I9A9BDg==",
                "signatureScheme": "SIGNATURE_SCHEME_ED25519",
                "signer": "0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"
            }
        }
        */

        // TODO: Goal is to verify that InflateLib is working correctly ASAP
        UserOperation memory userOp = UserOperation({
            sender: addressForPublicKey,
            nonce: 0,
            initCode: initCode,
            callData: outerCallData,
            callGasLimit: 0,
            verificationGasLimit: 0,
            preVerificationGas: 0,
            maxFeePerGas: 0,
            maxPriorityFeePerGas: 0,
            paymasterAndData: hex"",
            signature: hex""
        });
        console.logBytes(outerCallData);
        console.log(Base64.encode(outerCallData));

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
