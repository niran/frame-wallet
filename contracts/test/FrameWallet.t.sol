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
        vm.chainId(84532); // Base Sepolia
        Token token = Token(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913); // USDC on Base
        vm.etch(address(token), type(Token).runtimeCode);
        (address addressForPublicKey, bytes memory initCode) = _prepareWallet(231775, PUBLIC_KEY, 0);
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

        PartialUserOp Layout
        --------------------
        0000000000000000000000000000000000000000000000000000000000000020 tuple encoding pointer
        0000000000000000000000000000000000000000000000000000000000014a34 chain id 84532
        00000000000000000000000000000000000000000000000000000000000000e0 bytes pointer to 224, 7th word
        000000000000000000000000000000000000000000000000000000000000238c
        00000000000000000000000000000000000000000000000000000000004c4b40
        00000000000000000000000000000000000000000000000000000000000b36c6
        000000000000000000000000000000000000000000000000000000000147610e
        00000000000000000000000000000000000000000000000000000000000f4240
        00000000000000000000000000000000000000000000000000000000000000e4 calldata length 228
        b61d27f6000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000000000000000000000000000000000000deadbeef00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
        
        Farcaster Signature Packet
        --------------------------
        trustedData: {
            messageBytes: '0a9002080d10df920e18dda79b2f20018201ff010ade0168747470733a2f2f30786677642e76657263656c2e6170702f76312f363336306330306231346630636133323761393965306437636566303030616632636662343266636536666237383362653039356537313064653833643737396165393532376630656165373737373232306530666532376462363464356266323130623334396237366665623966363736646238333765396631616133326264666135343366363265643031343636613030633234313039303737653138633562626531393966383237623662663762643237363030363233623938653033303010011a1a08df920e121400000000000000000000000000000000000000011214abd21653c7496fbb5aa7fc0db789b2dd2d7ced5418012240525154a518f0a02e5df111e7c4b45fe390a66285f5bef10bd4f1717fa446aa1aa45d16de1c4573fe9788ec5d98701e72b74a9e8cf9f65cbbf772fa3b94439b0b2801322031351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419'
        }

        {
            "valid": true,
            "message": {
                "data": {
                "type": "MESSAGE_TYPE_FRAME_ACTION",
                "fid": 231775,
                "timestamp": 99013597,
                "network": "FARCASTER_NETWORK_MAINNET",
                "frameActionBody": {
                    "url": "aHR0cHM6Ly8weGZ3ZC52ZXJjZWwuYXBwL3YxLzYzNjBjMDBiMTRmMGNhMzI3YTk5ZTBkN2NlZjAwMGFmMmNmYjQyZmNlNmZiNzgzYmUwOTVlNzEwZGU4M2Q3NzlhZTk1MjdmMGVhZTc3NzcyMjBlMGZlMjdkYjY0ZDViZjIxMGIzNDliNzZmZWI5ZjY3NmRiODM3ZTlmMWFhMzJiZGZhNTQzZjYyZWQwMTQ2NmEwMGMyNDEwOTA3N2UxOGM1YmJlMTk5ZjgyN2I2YmY3YmQyNzYwMDYyM2I5OGUwMzAw",
                    "buttonIndex": 1,
                    "castId": {
                    "fid": 231775,
                    "hash": "0x0000000000000000000000000000000000000001"
                    },
                    "inputText": ""
                }
                },
                "hash": "0xabd21653c7496fbb5aa7fc0db789b2dd2d7ced54",
                "hashScheme": "HASH_SCHEME_BLAKE3",
                "signature": "UlFUpRjwoC5d8RHnxLRf45CmYoX1vvEL1PFxf6RGqhqkXRbeHEVz/peI7F2YcB5yt0qejPn2XLv3cvo7lEObCw==",
                "signatureScheme": "SIGNATURE_SCHEME_ED25519",
                "signer": "0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"
            }
        }
        */

        MessageData memory md = MessageData({
            type_: MessageType.MESSAGE_TYPE_FRAME_ACTION,
            fid: 231775,
            timestamp: 99013597,
            network: FarcasterNetwork.FARCASTER_NETWORK_MAINNET,
            frame_action_body: FrameActionBody({
                url: "https://0xfwd.vercel.app/v1/6360c00b14f0ca327a99e0d7cef000af2cfb42fce6fb783be095e710de83d779ae9527f0eae7777220e0fe27db64d5bf210b349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe199f827b6bf7bd27600623b98e0300",
                button_index: 1,
                cast_id: CastId({fid: 231775, hash: hex"0000000000000000000000000000000000000001"})
            })
        });

        FrameWallet.FrameUserOpSignature memory frameSig = FrameWallet.FrameUserOpSignature({
            md: md,
            ed25519sig: hex"525154a518f0a02e5df111e7c4b45fe390a66285f5bef10bd4f1717fa446aa1aa45d16de1c4573fe9788ec5d98701e72b74a9e8cf9f65cbbf772fa3b94439b0b",
            compressedPartialUserOp: hex"6360c00b14f0ca327a99e0d7cef000af2cfb42fce6fb783be095e710de83d779ae9527f0eae7777220e0fe27db64d5bf210b349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe199f827b6bf7bd27600623b98e0300"
        });

        UserOperation memory userOp = UserOperation({
            sender: addressForPublicKey,
            nonce: 0,
            initCode: initCode,
            callData: callData,
            callGasLimit: 500000,
            verificationGasLimit: 5000000,
            preVerificationGas: 529340,
            maxFeePerGas: 21330376,
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
        vm.chainId(84532); // Base Sepolia
        Token token = Token(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913); // USDC on Base
        vm.etch(address(token), type(Token).runtimeCode);
        (address addressForPublicKey, bytes memory initCode) = _prepareWallet(wrongFid, PUBLIC_KEY, 0);
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
            timestamp: 99009620,
            network: FarcasterNetwork.FARCASTER_NETWORK_MAINNET,
            frame_action_body: FrameActionBody({
                url: "https://0xfwd.vercel.app/v1/6360c00b14f0ca327a99e0d7cef000bfb4720f5e691f6f07bcf2dc66c7f03acf3d910faf7e7e270702ee7fb24d56fd1bb240b369e79f6b6fb73de8f7a931baf25d3a64ef024d6106ca4002017917ceb8e59bf129b8b776df7b02663092eb3800",
                button_index: 1,
                cast_id: CastId({fid: 231775, hash: hex"0000000000000000000000000000000000000001"})
            })
        });

        FrameWallet.FrameUserOpSignature memory frameSig = FrameWallet.FrameUserOpSignature({
            md: md,
            ed25519sig: hex"254e4bc16b14f2c04ec23ae424deedf5bfe0516832bbb74c87f0f7127a41154710111183eddab142e4034c3c98f6dd8e41c0b6fecbbc1985b11b7746b75fc008",
            compressedPartialUserOp: hex"6360c00b14f0ca327a99e0d7cef000bfb4720f5e691f6f07bcf2dc66c7f03acf3d910faf7e7e270702ee7fb24d56fd1bb240b369e79f6b6fb73de8f7a931baf25d3a64ef024d6106ca4002017917ceb8e59bf129b8b776df7b02663092eb3800"
        });

        UserOperation memory userOp = UserOperation({
            sender: addressForPublicKey,
            nonce: 0,
            initCode: initCode,
            callData: callData,
            callGasLimit: 0x238c,
            verificationGasLimit: 0x4c4b40,
            preVerificationGas: 0xb36c6,
            maxFeePerGas: 0x147610e,
            maxPriorityFeePerGas: 0xf4240,
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
        vm.chainId(84532); // Base Sepolia
        (address addressForPublicKey, bytes memory initCode) = _prepareWallet(231775, PUBLIC_KEY, 1);
        Token token = Token(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913); // USDC on Base
        vm.etch(address(token), type(Token).runtimeCode);
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
            messageBytes: '0a9402080d10df920e18cea99b2f2001820183020ae20168747470733a2f2f30786677642e76657263656c2e6170702f76312f36333630633030623134663063613332376139396530643763656630303061663263666234326663653666623738336265303935653731306465383364373739616539353237663065616537373737323230653066653237646236346435626632313062333439623736666562396636373664623833376539663161613332626466613534336636326564303134363661303063323431303930373765313863356262653139396638323762366266376264323736303036323362393865303330303f733d3110011a1a08df920e12140000000000000000000000000000000000000001121467c2f93d0b0b153e5d2faa8ad79631f695a9651118012240c851f4f4b3f666a1f9e665f27a83a906cbc9ab708fc2cde1039e53f4440d25710d65bf4696e117dda4e2a09c0ec2c1c57f2fb2a59a53b6b17ef6366920c0040b2801322031351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419'
        }

        {
            "valid": true,
            "message": {
                "data": {
                "type": "MESSAGE_TYPE_FRAME_ACTION",
                "fid": 231775,
                "timestamp": 99013838,
                "network": "FARCASTER_NETWORK_MAINNET",
                "frameActionBody": {
                    "url": "aHR0cHM6Ly8weGZ3ZC52ZXJjZWwuYXBwL3YxLzYzNjBjMDBiMTRmMGNhMzI3YTk5ZTBkN2NlZjAwMGFmMmNmYjQyZmNlNmZiNzgzYmUwOTVlNzEwZGU4M2Q3NzlhZTk1MjdmMGVhZTc3NzcyMjBlMGZlMjdkYjY0ZDViZjIxMGIzNDliNzZmZWI5ZjY3NmRiODM3ZTlmMWFhMzJiZGZhNTQzZjYyZWQwMTQ2NmEwMGMyNDEwOTA3N2UxOGM1YmJlMTk5ZjgyN2I2YmY3YmQyNzYwMDYyM2I5OGUwMzAwP3M9MQ==",
                    "buttonIndex": 1,
                    "castId": {
                    "fid": 231775,
                    "hash": "0x0000000000000000000000000000000000000001"
                    },
                    "inputText": ""
                }
                },
                "hash": "0x67c2f93d0b0b153e5d2faa8ad79631f695a96511",
                "hashScheme": "HASH_SCHEME_BLAKE3",
                "signature": "yFH09LP2ZqH55mXyeoOpBsvJq3CPws3hA55T9EQNJXENZb9GluEX3aTioJwOwsHFfy+ypZpTtrF+9jZpIMAECw==",
                "signatureScheme": "SIGNATURE_SCHEME_ED25519",
                "signer": "0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"
            }
        }
        */

        MessageData memory md = MessageData({
            type_: MessageType.MESSAGE_TYPE_FRAME_ACTION,
            fid: 231775,
            timestamp: 99013838,
            network: FarcasterNetwork.FARCASTER_NETWORK_MAINNET,
            frame_action_body: FrameActionBody({
                url: "https://0xfwd.vercel.app/v1/6360c00b14f0ca327a99e0d7cef000af2cfb42fce6fb783be095e710de83d779ae9527f0eae7777220e0fe27db64d5bf210b349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe199f827b6bf7bd27600623b98e0300?s=1",
                button_index: 1,
                cast_id: CastId({fid: 231775, hash: hex"0000000000000000000000000000000000000001"})
            })
        });

        FrameWallet.FrameUserOpSignature memory frameSig = FrameWallet.FrameUserOpSignature({
            md: md,
            ed25519sig: hex"c851f4f4b3f666a1f9e665f27a83a906cbc9ab708fc2cde1039e53f4440d25710d65bf4696e117dda4e2a09c0ec2c1c57f2fb2a59a53b6b17ef6366920c0040b",
            compressedPartialUserOp: hex"6360c00b14f0ca327a99e0d7cef000af2cfb42fce6fb783be095e710de83d779ae9527f0eae7777220e0fe27db64d5bf210b349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe199f827b6bf7bd27600623b98e0300"
        });

        UserOperation memory userOp = UserOperation({
            sender: addressForPublicKey,
            nonce: 0,
            initCode: initCode,
            callData: callData,
            callGasLimit: 500000,
            verificationGasLimit: 5000000,
            preVerificationGas: 529340,
            maxFeePerGas: 21330376,
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

    function testSendETHToDeployedWallet() public {
        uint64 unusedFid = 12345;
        FrameWallet wallet = factory.createAccount(unusedFid, PUBLIC_KEY, 0);
        (bool success, bytes memory result) = address(wallet).call{value: 0.001 ether}("");
        assertEq(success, true);
        assertEq(address(wallet).balance, 0.001 ether);
    }

    function testWithdrawFromEntryPoint() public {
        vm.chainId(84532); // Base Sepolia
        (address addressForPublicKey, bytes memory initCode) = _prepareWallet(231775, PUBLIC_KEY, 0);
        entryPoint.depositTo{value: 0.2 ether}(addressForPublicKey);
        assertEq(entryPoint.balanceOf(addressForPublicKey), 0.2 ether);
        
        address payable userEOA = payable(address(0xdeadbeef));
        bytes memory innerCallData = abi.encodeCall(entryPoint.withdrawTo, (
            userEOA,
            0.1 ether
        ));
        bytes memory callData = abi.encodeCall(this.execute, (
            address(entryPoint),
            0,
            innerCallData
        ));

        /**
        trustedData: {
            messageBytes: '0a9802080d10df920e189dc49b2f2001820187020ae60168747470733a2f2f30786677642e76657263656c2e6170702f76312f3633363063303062313466306361333237613939653064376365663030306166326366623432666365366662373833626530393565373135333838626437373934653364306266306561653737373732323065306665323764623634643562663231306264633734383833363937376339346630373637623862623663646334333333376637663662646531393736336130306332343130393037373531383864316138633061376530646564613764656637313836343162323662343536633137663938653033303010011a1a08df920e121400000000000000000000000000000000000000011214e689cb90eb5bfac42dc8b3a2030b11a2921a3c421801224058e3f9c7d928fe523038aae9becee96ba437b38644b63ed3f1e308e91366e62c9c990ae13d73736a44afd8bbecc1a8e4f5931c6d2bad3319928594198506e2002801322031351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419'
        }

        {
            "valid": true,
            "message": {
                "data": {
                "type": "MESSAGE_TYPE_FRAME_ACTION",
                "fid": 231775,
                "timestamp": 99017245,
                "network": "FARCASTER_NETWORK_MAINNET",
                "frameActionBody": {
                    "url": "aHR0cHM6Ly8weGZ3ZC52ZXJjZWwuYXBwL3YxLzYzNjBjMDBiMTRmMGNhMzI3YTk5ZTBkN2NlZjAwMGFmMmNmYjQyZmNlNmZiNzgzYmUwOTVlNzE1Mzg4YmQ3Nzk0ZTNkMGJmMGVhZTc3NzcyMjBlMGZlMjdkYjY0ZDViZjIxMGJkYzc0ODgzNjk3N2M5NGYwNzY3YjhiYjZjZGM0MzMzN2Y3ZjZiZGUxOTc2M2EwMGMyNDEwOTA3NzUxODhkMWE4YzBhN2UwZGVkYTdkZWY3MTg2NDFiMjZiNDU2YzE3Zjk4ZTAzMDA=",
                    "buttonIndex": 1,
                    "castId": {
                    "fid": 231775,
                    "hash": "0x0000000000000000000000000000000000000001"
                    },
                    "inputText": ""
                }
                },
                "hash": "0xe689cb90eb5bfac42dc8b3a2030b11a2921a3c42",
                "hashScheme": "HASH_SCHEME_BLAKE3",
                "signature": "WOP5x9ko/lIwOKrpvs7pa6Q3s4ZEtj7T8eMI6RNm5iycmQrhPXNzakSv2Lvswajk9ZMcbSutMxmShZQZhQbiAA==",
                "signatureScheme": "SIGNATURE_SCHEME_ED25519",
                "signer": "0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"
            }
        }
        */

        MessageData memory md = MessageData({
            type_: MessageType.MESSAGE_TYPE_FRAME_ACTION,
            fid: 231775,
            timestamp: 99017245,
            network: FarcasterNetwork.FARCASTER_NETWORK_MAINNET,
            frame_action_body: FrameActionBody({
                url: "https://0xfwd.vercel.app/v1/6360c00b14f0ca327a99e0d7cef000af2cfb42fce6fb783be095e715388bd7794e3d0bf0eae7777220e0fe27db64d5bf210bdc748836977c94f0767b8bb6cdc43337f7f6bde19763a00c241090775188d1a8c0a7e0deda7def718641b26b456c17f98e0300",
                button_index: 1,
                cast_id: CastId({fid: 231775, hash: hex"0000000000000000000000000000000000000001"})
            })
        });

        FrameWallet.FrameUserOpSignature memory frameSig = FrameWallet.FrameUserOpSignature({
            md: md,
            ed25519sig: hex"58e3f9c7d928fe523038aae9becee96ba437b38644b63ed3f1e308e91366e62c9c990ae13d73736a44afd8bbecc1a8e4f5931c6d2bad3319928594198506e200",
            compressedPartialUserOp: hex"6360c00b14f0ca327a99e0d7cef000af2cfb42fce6fb783be095e715388bd7794e3d0bf0eae7777220e0fe27db64d5bf210bdc748836977c94f0767b8bb6cdc43337f7f6bde19763a00c241090775188d1a8c0a7e0deda7def718641b26b456c17f98e0300"
        });

        UserOperation memory userOp = UserOperation({
            sender: addressForPublicKey,
            nonce: 0,
            initCode: initCode,
            callData: callData,
            callGasLimit: 500000,
            verificationGasLimit: 5000000,
            preVerificationGas: 856269,
            maxFeePerGas: 21138592,
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
        entryPoint.handleOps(ops, payable(address(0xbeefcafe)));

        // We started with 0.2 ether deposited in the entrypoint, spent some on gas, then
        // transferred 0.1 ether back out. The remaining balance must be strictly less than
        // 0.1 ether.
        assertLt(entryPoint.balanceOf(addressForPublicKey), 0.1 ether);
        assertEq(userEOA.balance, 0.1 ether);
    }
}

contract Token is ERC20("Test", "TEST") {

}
