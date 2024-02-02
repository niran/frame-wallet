// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {EntryPoint} from "account-abstraction/core/EntryPoint.sol";

import {FrameWallet} from "../src/FrameWallet.sol";
import {FrameWalletFactory} from "../src/FrameWalletFactory.sol";


contract FrameWalletTest is Test {
    FrameWallet public frameWallet;
    EntryPoint public entryPoint;

    bytes32 public constant PUBLIC_KEY = 0x292404752ddd67080bbfe93af4017e51388ebc3c9fb96b8984658155de590b38;

    function setUp() public {
        entryPoint = new EntryPoint();
        FrameWalletFactory factory = new FrameWalletFactory(entryPoint);
        frameWallet = factory.createAccount(PUBLIC_KEY);
    }

    function testExecute() public {
        assert(false);
    }
}
