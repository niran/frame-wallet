// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";

import {FrameWallet} from "./FrameWallet.sol";
import {SharedVerifier} from "./SharedVerifier.sol";


contract FrameWalletFactory {
    FrameWallet public immutable accountImplementation;

    constructor(IEntryPoint _entryPoint) {
        SharedVerifier sharedVerifier = new SharedVerifier();
        accountImplementation = new FrameWallet(_entryPoint, sharedVerifier);
    }

    function createAccount(uint64 fid, bytes32 signerPk, uint256 salt) public returns (FrameWallet ret) {
        address addr = getAddress(fid, signerPk, salt);
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return FrameWallet(payable(addr));
        }
        ret = FrameWallet(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(accountImplementation), abi.encodeCall(FrameWallet.initialize, (fid, signerPk, salt))
                )
            )
        );
    }

    function getAddress(uint64 fid, bytes32 signerPk, uint256 salt) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(
                abi.encodePacked(
                    type(ERC1967Proxy).creationCode,
                    abi.encode(address(accountImplementation), abi.encodeCall(FrameWallet.initialize, (fid, signerPk, salt)))
                )
            )
        );
    }
}
