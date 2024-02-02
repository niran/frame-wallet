// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {EntryPoint} from "account-abstraction/core/EntryPoint.sol";

import {FrameWallet} from "../src/FrameWallet.sol";

contract FrameWalletTest is Test {
    FrameWallet public frameWallet;
    EntryPoint public entryPoint;

    function setUp() public {
        entryPoint = new EntryPoint();
        // TODO: Use the factory once it exists.
        frameWallet = new FrameWallet(entryPoint);
        //frameWallet.initialize(0x0000000000000000);
    }

    function test_Noop() public {
        assertEq(frameWallet.pk(), 0x0000000000000000);
    }
}
