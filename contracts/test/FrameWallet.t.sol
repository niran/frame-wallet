// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {EntryPoint} from "account-abstraction/core/EntryPoint.sol";
import {UserOperation} from "account-abstraction/interfaces/UserOperation.sol";
import {ERC20} from "openzeppelin-latest/contracts/token/ERC20/ERC20.sol";
import "frame-verifier/Encoder.sol";
import {InflateLib} from "inflate-sol/InflateLib.sol";

import {FrameWallet} from "../src/FrameWallet.sol";
import {FrameWalletFactory} from "../src/FrameWalletFactory.sol";


contract FrameWalletTest is Test {
    EntryPoint public entryPoint;
    FrameWalletFactory public factory;

    bytes32 public constant PUBLIC_KEY = 0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419;

    function setUp() public {
        entryPoint = new EntryPoint();
        factory = new FrameWalletFactory(entryPoint);
    }

    function _prepareWallet(uint64 fid, bytes32 pk, uint256 salt) internal returns (address, bytes memory) {
        bytes memory initCode = abi.encodePacked(address(factory), abi.encodeCall(factory.createAccount, (fid, pk, salt)));
        address addressForPublicKey = factory.getAddress(fid, pk, salt);
        vm.deal(addressForPublicKey, 1 ether);

        return (addressForPublicKey, initCode);
    }

    function puff(bytes calldata data, uint destlen) public returns (InflateLib.ErrorCode, bytes memory) {
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
        
        (InflateLib.ErrorCode decompressErrorCode, bytes memory decompressedCallData) = this.puff(
            compressedCallData, expectedCallData.length);
        console.log("Error Code: %d", uint(decompressErrorCode));
        console.log("Decompressed Data:");
        console.logBytes(decompressedCallData);
        assertEq(uint(decompressErrorCode), uint(InflateLib.ErrorCode.ERR_NONE));
        assertEq(decompressedCallData, expectedCallData);
    }

    function testDecodeSignature() public {
        bytes memory signature = hex"0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002e00000000000000000000000000000000000000000000000000000000000000340000000000000000000000000000000000000000000000000000000000000000d000000000000000000000000000000000000000000000000000000000003895f0000000000000000000000000000000000000000000000000000000005d5bf03000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000df68747470733a2f2f6672616d652d77616c6c65742e76657263656c2e6170702f76312f363336306330306231346630346232626232653239373637373838303537393664666339303161666663386336393064663838643466356338316466376339373363386165633637363037386232346435366664316262323430623336396537396636623666623733646538663761393331626166323564336136346566303234643631303236363130303230393034653435643338653339363666633661376530646564613764656630393938633134386261623332303030303000000000000000000000000000000000000000000000000000000000000003895f00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000403b5bf9a30ed7c493df3b769e16f9101813d88a201d270618759dfbf18c76524208372e569622f85b77a2c0d6bfaf94262ab35d41aff036f3ad0349237008d40c000000000000000000000000000000000000000000000000000000000000005e6360c00b14f04b2bb2e2976778805796dfc901affc8c690df88d4f5c81df7c973c8aec676078b24d56fd1bb240b369e79f6b6fb73de8f7a931baf25d3a64ef024d61026610020904e45d38e3966fc6a7e0deda7def0998c148bab32000000000";
        FrameWallet.FrameUserOpSignature memory frameSig = abi.decode(signature, (FrameWallet.FrameUserOpSignature));
        assertEq(frameSig.md.fid, 231775);
        assertEq(frameSig.md.frame_action_body.cast_id.hash, hex"0000000000000000000000000000000000000001");
    }

    function approve(address spender,uint256 value) external {}
    function execute(address x, uint256 y, bytes calldata z) external {}

    function testHandleUserOpWithoutDeployedWallet() public {
        (address addressForPublicKey, bytes memory initCode) = _prepareWallet(231775, PUBLIC_KEY, 0);
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

        /**
        Generating the data for this test
        =================================

        * Run this test as is with `forge test -vv` and log the calldata that it generates for us
            * Approve 0xdeadbeef to send 1 Wei of USDC on Base
        * Take the call data to scripts/generate-tx.sh to get a frame URL
            * Copy the frame URL in the Location header to the FrameActionBody object
            * Copy the compressed partialUserOp from the URL to FrameUserOpSignature
            * Get the PartialUserOp from the logs in the console
                * Only needed for debugging to compare against the decompressed partial user op
            * Get maxFeePerGas and maxPriorityFeePerGas from the logs in the console
                and paste them in UserOperation
            * Double check the static callGasLimit, VerificationGasLimit, and preVerificationGas
                in the generate-tx codebase
        * Load the frame in the frame tester and click sign transaction
        * Get the Frame Signature Packet from the logs in Vercel
        * Validate the Frame Signature Packet’s trustedData with scripts/validate-frame-action.sh
        * Paste the response into the comments below
        * Copy the timestamp to the MessageData object
        * Base64-decode the signature and paste in the FrameUserOpSignature object's ed25519


        partialUserOp:
        0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000210500000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000000000000000000000000000000000000098968000000000000000000000000000000000000000000000000000000000000061a800000000000000000000000000000000000000000000000000000000000f446e00000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000e4b61d27f6000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000000000000000000000000000000000000deadbeef00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
        
        0000000000000000000000000000000000000000000000000000000000000020 tuple encoding pointer
        0000000000000000000000000000000000000000000000000000000000002105 chain id 8453
        00000000000000000000000000000000000000000000000000000000000000e0 bytes pointer to 224, 7th word
        00000000000000000000000000000000000000000000000000000000000f4240
        0000000000000000000000000000000000000000000000000000000000989680
        00000000000000000000000000000000000000000000000000000000000061a8
        00000000000000000000000000000000000000000000000000000000000f446e
        00000000000000000000000000000000000000000000000000000000000f4240
        00000000000000000000000000000000000000000000000000000000000000e4 calldata length 228
        b61d27f6000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000000000000000000000000000000000000deadbeef00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000

        trustedData: {
            messageBytes: '0a9102080d10df920e1883fed62e2001820180020adf0168747470733a2f2f6672616d652d77616c6c65742e76657263656c2e6170702f76312f363336306330306231346630346232626232653239373637373838303537393664666339303161666663386336393064663838643466356338316466376339373363386165633637363037386232346435366664316262323430623336396537396636623666623733646538663761393331626166323564336136346566303234643631303236363130303230393034653435643338653339363666633661376530646564613764656630393938633134386261623332303030303010011a1a08df920e1214000000000000000000000000000000000000000112141c9e110a2dbfa73281e66edef29b8dfe03d71949180122403b5bf9a30ed7c493df3b769e16f9101813d88a201d270618759dfbf18c76524208372e569622f85b77a2c0d6bfaf94262ab35d41aff036f3ad0349237008d40c2801322031351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419'
        }

        {
            "valid": true,
            "message": {
                "data": {
                "type": "MESSAGE_TYPE_FRAME_ACTION",
                "fid": 231775,
                "timestamp": 97894147,
                "network": "FARCASTER_NETWORK_MAINNET",
                "frameActionBody": {
                    "url": "aHR0cHM6Ly9mcmFtZS13YWxsZXQudmVyY2VsLmFwcC92MS82MzYwYzAwYjE0ZjA0YjJiYjJlMjk3Njc3ODgwNTc5NmRmYzkwMWFmZmM4YzY5MGRmODhkNGY1YzgxZGY3Yzk3M2M4YWVjNjc2MDc4YjI0ZDU2ZmQxYmIyNDBiMzY5ZTc5ZjZiNmZiNzNkZThmN2E5MzFiYWYyNWQzYTY0ZWYwMjRkNjEwMjY2MTAwMjA5MDRlNDVkMzhlMzk2NmZjNmE3ZTBkZWRhN2RlZjA5OThjMTQ4YmFiMzIwMDAwMA==",
                    "buttonIndex": 1,
                    "castId": {
                    "fid": 231775,
                    "hash": "0x0000000000000000000000000000000000000001"
                    },
                    "inputText": ""
                }
                },
                "hash": "0x1c9e110a2dbfa73281e66edef29b8dfe03d71949",
                "hashScheme": "HASH_SCHEME_BLAKE3",
                "signature": "O1v5ow7XxJPfO3aeFvkQGBPYiiAdJwYYdZ378Yx2UkIINy5WliL4W3eiwNa/r5QmKrNdQa/wNvOtA0kjcAjUDA==",
                "signatureScheme": "SIGNATURE_SCHEME_ED25519",
                "signer": "0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"
            }
        }
        */

        MessageData memory md = MessageData({
            type_: MessageType.MESSAGE_TYPE_FRAME_ACTION,
            fid: 231775,
            timestamp: 97894147,
            network: FarcasterNetwork.FARCASTER_NETWORK_MAINNET,
            frame_action_body: FrameActionBody({
                url: "https://frame-wallet.vercel.app/v1/6360c00b14f04b2bb2e2976778805796dfc901affc8c690df88d4f5c81df7c973c8aec676078b24d56fd1bb240b369e79f6b6fb73de8f7a931baf25d3a64ef024d61026610020904e45d38e3966fc6a7e0deda7def0998c148bab3200000",
                button_index: 1,
                cast_id: CastId({fid: 231775, hash: hex"0000000000000000000000000000000000000001"})
            })
        });

        FrameWallet.FrameUserOpSignature memory frameSig = FrameWallet.FrameUserOpSignature({
            md: md,
            ed25519sig: hex"3b5bf9a30ed7c493df3b769e16f9101813d88a201d270618759dfbf18c76524208372e569622f85b77a2c0d6bfaf94262ab35d41aff036f3ad0349237008d40c",
            compressedPartialUserOp: hex"6360c00b14f04b2bb2e2976778805796dfc901affc8c690df88d4f5c81df7c973c8aec676078b24d56fd1bb240b369e79f6b6fb73de8f7a931baf25d3a64ef024d61026610020904e45d38e3966fc6a7e0deda7def0998c148bab3200000"
        });

        UserOperation memory userOp = UserOperation({
            sender: addressForPublicKey,
            nonce: 0,
            initCode: initCode,
            callData: callData,
            callGasLimit: 1000000,
            verificationGasLimit: 10000000,
            preVerificationGas: 25000, // See also: https://www.stackup.sh/blog/an-analysis-of-preverificationgas
            maxFeePerGas: 1000558,
            maxPriorityFeePerGas: 1000000,
            paymasterAndData: hex"",
            signature: abi.encode(frameSig)
        });
        console.log("Sender: %s", addressForPublicKey);
        console.log("initCode:");
        console.logBytes(initCode);
        console.log("callData:");
        console.logBytes(callData);

        UserOperation[] memory ops = new UserOperation[](1);
        ops[0] = userOp;
        entryPoint.handleOps(ops, payable(address(0xdeadbeef)));

        console.log("allowance: %d", token.allowance(addressForPublicKey, spender));
        assertEq(token.allowance(addressForPublicKey, spender), 1);
    }

    function testHandleUserOpFailsWithWrongFid() public {
        uint64 wrongFid = 4337;
        (address addressForPublicKey, bytes memory initCode) = _prepareWallet(wrongFid, PUBLIC_KEY, 0);
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

        MessageData memory md = MessageData({
            type_: MessageType.MESSAGE_TYPE_FRAME_ACTION,
            fid: 231775,
            timestamp: 97894147,
            network: FarcasterNetwork.FARCASTER_NETWORK_MAINNET,
            frame_action_body: FrameActionBody({
                url: "https://frame-wallet.vercel.app/v1/6360c00b14f04b2bb2e2976778805796dfc901affc8c690df88d4f5c81df7c973c8aec676078b24d56fd1bb240b369e79f6b6fb73de8f7a931baf25d3a64ef024d61026610020904e45d38e3966fc6a7e0deda7def0998c148bab3200000",
                button_index: 1,
                cast_id: CastId({fid: 231775, hash: hex"0000000000000000000000000000000000000001"})
            })
        });

        FrameWallet.FrameUserOpSignature memory frameSig = FrameWallet.FrameUserOpSignature({
            md: md,
            ed25519sig: hex"3b5bf9a30ed7c493df3b769e16f9101813d88a201d270618759dfbf18c76524208372e569622f85b77a2c0d6bfaf94262ab35d41aff036f3ad0349237008d40c",
            compressedPartialUserOp: hex"6360c00b14f04b2bb2e2976778805796dfc901affc8c690df88d4f5c81df7c973c8aec676078b24d56fd1bb240b369e79f6b6fb73de8f7a931baf25d3a64ef024d61026610020904e45d38e3966fc6a7e0deda7def0998c148bab3200000"
        });

        UserOperation memory userOp = UserOperation({
            sender: addressForPublicKey,
            nonce: 0,
            initCode: initCode,
            callData: callData,
            callGasLimit: 1000000,
            verificationGasLimit: 10000000,
            preVerificationGas: 25000, // See also: https://www.stackup.sh/blog/an-analysis-of-preverificationgas
            maxFeePerGas: 1000558,
            maxPriorityFeePerGas: 1000000,
            paymasterAndData: hex"",
            signature: abi.encode(frameSig)
        });
        console.log("Sender: %s", addressForPublicKey);
        console.log("initCode:");
        console.logBytes(initCode);
        console.log("callData:");
        console.logBytes(callData);

        UserOperation[] memory ops = new UserOperation[](1);
        ops[0] = userOp;

        vm.expectRevert();
        entryPoint.handleOps(ops, payable(address(0xdeadbeef)));

        console.log("allowance: %d", token.allowance(addressForPublicKey, spender));
        assertEq(token.allowance(addressForPublicKey, spender), 0);
    }

    function testHandleUserOpWithSalt() public {
        (address addressForPublicKey, bytes memory initCode) = _prepareWallet(231775, PUBLIC_KEY, 1);
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

        /**
        trustedData: {
            messageBytes: '0a9502080d10df920e18f7e7d72e2001820184020ae30168747470733a2f2f6672616d652d77616c6c65742e76657263656c2e6170702f76312f36333630633030623134663034623262623265323937363737383830353739366466633930316166666338633639306466383864346635633831646637633937336338616563363736303738623234643536666431626232343062333639653739663662366662373364653866376139333162616632356433613634656630323464363130323636313030323039303465343564333865333936366663366137653064656461376465663039393863313438626162333230303030303f733d3110011a1a08df920e1214000000000000000000000000000000000000000112141e4b5792da8367969842fbc454fc79279b8cf5ea18012240e4d692ebd08b124ecae528ea0ee75235dc0d02afac7752a97bc302261ff2cda2fc770d415adab30825c439fd435078159655477efcdf0dd81d84d283d4d3d4052801322031351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419'
        }

        {
            "valid": true,
            "message": {
                "data": {
                "type": "MESSAGE_TYPE_FRAME_ACTION",
                "fid": 231775,
                "timestamp": 97907703,
                "network": "FARCASTER_NETWORK_MAINNET",
                "frameActionBody": {
                    "url": "aHR0cHM6Ly9mcmFtZS13YWxsZXQudmVyY2VsLmFwcC92MS82MzYwYzAwYjE0ZjA0YjJiYjJlMjk3Njc3ODgwNTc5NmRmYzkwMWFmZmM4YzY5MGRmODhkNGY1YzgxZGY3Yzk3M2M4YWVjNjc2MDc4YjI0ZDU2ZmQxYmIyNDBiMzY5ZTc5ZjZiNmZiNzNkZThmN2E5MzFiYWYyNWQzYTY0ZWYwMjRkNjEwMjY2MTAwMjA5MDRlNDVkMzhlMzk2NmZjNmE3ZTBkZWRhN2RlZjA5OThjMTQ4YmFiMzIwMDAwMD9zPTE=",
                    "buttonIndex": 1,
                    "castId": {
                    "fid": 231775,
                    "hash": "0x0000000000000000000000000000000000000001"
                    },
                    "inputText": ""
                }
                },
                "hash": "0x1e4b5792da8367969842fbc454fc79279b8cf5ea",
                "hashScheme": "HASH_SCHEME_BLAKE3",
                "signature": "5NaS69CLEk7K5SjqDudSNdwNAq+sd1Kpe8MCJh/yzaL8dw1BWtqzCCXEOf1DUHgVllVHfvzfDdgdhNKD1NPUBQ==",
                "signatureScheme": "SIGNATURE_SCHEME_ED25519",
                "signer": "0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"
            }
        }
        */

        MessageData memory md = MessageData({
            type_: MessageType.MESSAGE_TYPE_FRAME_ACTION,
            fid: 231775,
            timestamp: 97907703,
            network: FarcasterNetwork.FARCASTER_NETWORK_MAINNET,
            frame_action_body: FrameActionBody({
                url: "https://frame-wallet.vercel.app/v1/6360c00b14f04b2bb2e2976778805796dfc901affc8c690df88d4f5c81df7c973c8aec676078b24d56fd1bb240b369e79f6b6fb73de8f7a931baf25d3a64ef024d61026610020904e45d38e3966fc6a7e0deda7def0998c148bab3200000?s=1",
                button_index: 1,
                cast_id: CastId({fid: 231775, hash: hex"0000000000000000000000000000000000000001"})
            })
        });

        FrameWallet.FrameUserOpSignature memory frameSig = FrameWallet.FrameUserOpSignature({
            md: md,
            ed25519sig: hex"e4d692ebd08b124ecae528ea0ee75235dc0d02afac7752a97bc302261ff2cda2fc770d415adab30825c439fd435078159655477efcdf0dd81d84d283d4d3d405",
            compressedPartialUserOp: hex"6360c00b14f04b2bb2e2976778805796dfc901affc8c690df88d4f5c81df7c973c8aec676078b24d56fd1bb240b369e79f6b6fb73de8f7a931baf25d3a64ef024d61026610020904e45d38e3966fc6a7e0deda7def0998c148bab3200000"
        });

        UserOperation memory userOp = UserOperation({
            sender: addressForPublicKey,
            nonce: 0,
            initCode: initCode,
            callData: callData,
            callGasLimit: 1000000,
            verificationGasLimit: 10000000,
            preVerificationGas: 25000, // See also: https://www.stackup.sh/blog/an-analysis-of-preverificationgas
            maxFeePerGas: 1000558,
            maxPriorityFeePerGas: 1000000,
            paymasterAndData: hex"",
            signature: abi.encode(frameSig)
        });
        console.log("Sender: %s", addressForPublicKey);
        console.log("initCode:");
        console.logBytes(initCode);
        console.log("callData:");
        console.logBytes(callData);

        UserOperation[] memory ops = new UserOperation[](1);
        ops[0] = userOp;
        entryPoint.handleOps(ops, payable(address(0xdeadbeef)));

        console.log("allowance: %d", token.allowance(addressForPublicKey, spender));
        assertEq(token.allowance(addressForPublicKey, spender), 1);
    }

    /*
    function testHandleUserOpForDeployedWallet() public {
        FrameWallet frameWallet = factory.createAccount(231775, PUBLIC_KEY, 0);
        assert(false);
    }
    */

    function testUserOp() public {
        // This test uses a UserOperation assembled by the live web service pointing at Base Sepolia.
        // To ensure that the nonce in the UserOperation is zero, a salt of 5 was used to generate
        // a fresh wallet.
        vm.chainId(84532); // Base Sepolia
        bytes memory userOpBytes = hex"00000000000000000000000000000000000000000000000000000000000000200000000000000000000000003451b50edfb2bd279b3b4713cb7a9799a33486b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000000000000000000000000000000000000098968000000000000000000000000000000000000000000000000000000000000061a800000000000000000000000000000000000000000000000000000000000f443c00000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000000781530d1fec6be9cbe7ef51b45539008043b6369160a249f0e000000000000000000000000000000000000000000000000000000000003895f31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf6394190000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000000000000000000a4b61d27f60000000000000000000000006baec3983359fca179c298aa72a79dbeae60decc000000000000000000000000000000000000000000000000000000003b9aca0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000004d0e30db00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002e00000000000000000000000000000000000000000000000000000000000000340000000000000000000000000000000000000000000000000000000000000000d000000000000000000000000000000000000000000000000000000000003895f0000000000000000000000000000000000000000000000000000000005d969a6000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000dd68747470733a2f2f6672616d652d77616c6c65742e76657263656c2e6170702f76312f36333630633030623134663063613332376139396530643763656630303061663263626639333033356566393139643331616630316239666238303262666639326533363134643963666330623036343962616366613337363438316563373538373637313834376665353935383739363863366161613265353733663761643462623837373036396630316436623334653131623038323231383138303363636238356337626331623038313938323062303030303f733d35000000000000000000000000000000000000000000000000000000000000000003895f0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000040688df0a090485e543beceeffba253d505a083bcde0afeb958e266b54e85e3ab6c8de4a61053e051d98cca28cbde41399ed8bdb70ca12adeefa41c589bdc41c01000000000000000000000000000000000000000000000000000000000000005b6360c00b14f0ca327a99e0d7cef000af2cbf93035ef919d31af01b9fb802bff92e3614d9cfc0b0649bacfa376481ec7587671847fe59587968c6aaa2e573f7ad4bb877069f01d6b34e11b0822181803ccb85c7bc1b0819820b00000000000000";
        UserOperation memory userOp = abi.decode(userOpBytes, (UserOperation));
        FrameWallet frameWallet = factory.createAccount(231775, PUBLIC_KEY, 5);
        vm.prank(address(entryPoint));
        uint256 validationData = frameWallet.validateUserOp(userOp, 0, 0);
        assertEq(validationData, 0);
    }
}

contract Token is ERC20("Test", "TEST") {

}
