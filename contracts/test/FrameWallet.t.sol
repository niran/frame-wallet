// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {EntryPoint} from "account-abstraction/core/EntryPoint.sol";
import {UserOperation} from "account-abstraction/interfaces/UserOperation.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import {ERC20} from "openzeppelin-latest/contracts/token/ERC20/ERC20.sol";
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
        initCode = abi.encodePacked(address(factory), abi.encodeCall(factory.createAccount, (PUBLIC_KEY, 1)));
        addressForPublicKey = factory.getAddress(PUBLIC_KEY, 1);
        vm.deal(addressForPublicKey, 1 ether);
    }

    function _puff(bytes calldata data, uint destlen) public returns (InflateLib.ErrorCode, bytes memory) {
        return InflateLib.puff(data, destlen);
    }

    function testDecompressCallData() public {
        bytes memory compressedCallData = hex"db26abfe8d0109349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe99423b18f1490200";
        bytes memory innerCallData = abi.encodeCall(this.approve, (
            0x0000000000000000000000000000000000000000,
            1
        ));
        bytes memory expectedCallData = abi.encodeCall(this.execute, (
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, // USDC on Base
            0,
            innerCallData
        ));
        
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
        Token token = Token(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913); // USDC on Base
        vm.etch(address(token), type(Token).runtimeCode);
        vm.chainId(8453); // Base
        address spender = address(0xdeadbeef);

        bytes memory innerCallData = abi.encodeCall(this.approve, (
            spender,
            1
        ));
        bytes memory callData = abi.encodeCall(this.execute, (
            address(token),
            0,
            innerCallData
        ));

        /*
        "trustedData":{"messageBytes":"0ac101080d10df920e18a186c72e20018201b0010a8f0168747470733a2f2f6672616d652d77616c6c65742e76657263656c2e6170702f383435333a6462323661626665386430313039333439623736666562396636373664623833376539663161613332626466613534336636326564303134363661303063323431303930373765313863356262653139396638323762366266376264323736303036323333653439303010011a1a08df920e1214000000000000000000000000000000000000000112141891922ca27165a9d694a1d7f2769680e73172dc18012240bea141fd4135311902d34d0154dbad8b8d47c292b1e5895db76e671b7e8d7945442a49849061b2e2a2f63a8964fbd95b36dc26ce3bcd9d62b27b0b3392faa80e2801322031351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"}        {
        {
            "valid": true,
            "message": {
                "data": {
                "type": "MESSAGE_TYPE_FRAME_ACTION",
                "fid": 231775,
                "timestamp": 97633057,
                "network": "FARCASTER_NETWORK_MAINNET",
                "frameActionBody": {
                    "url": "aHR0cHM6Ly9mcmFtZS13YWxsZXQudmVyY2VsLmFwcC84NDUzOmRiMjZhYmZlOGQwMTA5MzQ5Yjc2ZmViOWY2NzZkYjgzN2U5ZjFhYTMyYmRmYTU0M2Y2MmVkMDE0NjZhMDBjMjQxMDkwNzdlMThjNWJiZTE5OWY4MjdiNmJmN2JkMjc2MDA2MjMzZTQ5MDA=",
                    "buttonIndex": 1,
                    "castId": {
                    "fid": 231775,
                    "hash": "0x0000000000000000000000000000000000000001"
                    },
                    "inputText": ""
                }
                },
                "hash": "0x1891922ca27165a9d694a1d7f2769680e73172dc",
                "hashScheme": "HASH_SCHEME_BLAKE3",
                "signature": "vqFB/UE1MRkC000BVNuti41HwpKx5Yldt25nG36NeUVEKkmEkGGy4qL2Oolk+9lbNtwmzjvNnWKyewszkvqoDg==",
                "signatureScheme": "SIGNATURE_SCHEME_ED25519",
                "signer": "0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"
            }
        }
        */

        MessageData memory md = MessageData({
            type_: MessageType.MESSAGE_TYPE_FRAME_ACTION,
            fid: 231775,
            timestamp: 97633057,
            network: FarcasterNetwork.FARCASTER_NETWORK_MAINNET,
            frame_action_body: FrameActionBody({
                url: "https://frame-wallet.vercel.app/8453:db26abfe8d0109349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe199f827b6bf7bd276006233e4900",
                button_index: 1,
                cast_id: CastId({fid: 231775, hash: hex"0000000000000000000000000000000000000001"})
            })
        });

        FrameWallet.FrameUserOpSignature memory frameSig = FrameWallet.FrameUserOpSignature({
            md: md,
            ed25519sig: hex"bea141fd4135311902d34d0154dbad8b8d47c292b1e5895db76e671b7e8d7945442a49849061b2e2a2f63a8964fbd95b36dc26ce3bcd9d62b27b0b3392faa80e",
            compressedCallData: hex"db26abfe8d0109349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe199f827b6bf7bd276006233e4900"
        });

        UserOperation memory userOp = UserOperation({
            sender: addressForPublicKey,
            nonce: 0,
            initCode: initCode,
            callData: callData,
            callGasLimit: 1000000,
            verificationGasLimit: 10000000,
            preVerificationGas: 25000, // See also: https://www.stackup.sh/blog/an-analysis-of-preverificationgas
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 0.1 gwei,
            paymasterAndData: hex"",
            signature: abi.encode(frameSig)
        });
        console.log("Sender: %s", addressForPublicKey);
        console.log("initCode:");
        console.logBytes(initCode);
        console.logBytes(callData);
        console.log(Base64.encode(callData));

        UserOperation[] memory ops = new UserOperation[](1);
        ops[0] = userOp;
        entryPoint.handleOps(ops, payable(address(0xdeadbeef)));

        console.log("allowance: %d", token.allowance(addressForPublicKey, spender));
        assertEq(token.allowance(addressForPublicKey, spender), 1);
    }

    function testHandleUserOpForDeployedWallet() public {
        FrameWallet frameWallet = factory.createAccount(PUBLIC_KEY, 0);
        assert(false);
    }
}

contract Token is ERC20("Test", "TEST") {

}
