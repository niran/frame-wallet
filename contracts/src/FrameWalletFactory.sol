// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";

import {FrameWallet} from "./FrameWallet.sol";

contract FrameWalletFactory {
    FrameWallet public immutable accountImplementation;

    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new FrameWallet(_entryPoint);
    }

    function createAccount(bytes32 pk, uint256 salt) public returns (FrameWallet ret) {
        address addr = getAddress(pk, salt);
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return FrameWallet(payable(addr));
        }
        ret = FrameWallet(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(accountImplementation), abi.encodeCall(FrameWallet.initialize, (pk))
                )
            )
        );
    }

    function getAddress(bytes32 pk, uint256 salt) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(
                abi.encodePacked(
                    type(ERC1967Proxy).creationCode,
                    abi.encode(address(accountImplementation), abi.encodeCall(FrameWallet.initialize, (pk)))
                )
            )
        );
    }
}
