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

    bytes32 public constant PUBLIC_KEY = 0x292404752ddd67080bbfe93af4017e51388ebc3c9fb96b8984658155de590b38;

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
