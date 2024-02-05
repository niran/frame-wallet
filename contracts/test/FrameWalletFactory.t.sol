// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {EntryPoint} from "account-abstraction/core/EntryPoint.sol";

import {FrameWallet} from "../src/FrameWallet.sol";
import {FrameWalletFactory} from "../src/FrameWalletFactory.sol";

contract FrameWalletFactoryTest is Test {
    FrameWalletFactory public factory;
    EntryPoint public entryPoint;

    bytes32 public constant PUBLIC_KEY = 0x292404752ddd67080bbfe93af4017e51388ebc3c9fb96b8984658155de590b38;

    function setUp() public {
        entryPoint = new EntryPoint();
        factory = new FrameWalletFactory(entryPoint);
    }

    function testGetAddress() public {
        address counterfactual = factory.getAddress(PUBLIC_KEY, 0);
        assertEq(counterfactual.codehash, bytes32(0));
        FrameWallet factual = factory.createAccount(PUBLIC_KEY, 0);
        assertTrue(address(factual).codehash != bytes32(0));
        assertEq(counterfactual, address(factual));
    }

    function testReturnsAddressWhenAccountAlreadyExists() public {
        FrameWallet account = factory.createAccount(PUBLIC_KEY, 0);
        FrameWallet otherAccount = factory.createAccount(PUBLIC_KEY, 0);
        assertEq(address(account), address(otherAccount));
    }
}
