import { AddressLike, BigNumberish, BytesLike, ethers } from "ethers";
import { RPC_URL } from "@/constants";
import * as contracts from "@/contracts";


export type WalletInfo = {
  address: AddressLike,
  nonce: BigNumberish,
  code: string,
  salt: number,
};

const provider = new ethers.JsonRpcProvider(RPC_URL);

/**
 * Use the public key from the frame signature packet to get the address and nonce
 * for the user from the chain.
 */
export async function getWalletInfoForFrameAction(fid: number, pk: BytesLike, salt: string | number): Promise<WalletInfo> {
  salt = salt ? parseInt(salt.toString()) : 0;

  const FactoryContract = new ethers.Contract(
    contracts.FrameWalletFactory.address,
    contracts.FrameWalletFactory.abi,
    provider
  );
  const getAddress = FactoryContract.getFunction("getAddress"); // collides with Contract.getAddress
  const address = await getAddress(fid, pk, salt);

  const code = await provider.getCode(address);
  
  const EntryPointContract = new ethers.Contract(
    contracts.EntryPoint.address,
    contracts.EntryPoint.abi,
    provider
  );
  const nonce = await EntryPointContract.getNonce(address, 0);

  return {
    address,
    nonce,
    code,
    salt,
  };
}

export function getInitCode(wallet: WalletInfo, fid, signer) {
  // The initCode MUST only be populated when the sender account has not been
  // deployed.
  if (wallet.code && wallet.code !== '0x') {
    return '0x';
  }
    
  const FrameWalletFactoryInterface = ethers.Interface.from(contracts.FrameWalletFactory.abi);
  const initCodeCallData = FrameWalletFactoryInterface.encodeFunctionData(
    'createAccount', [fid, ethers.hexlify(signer), wallet.salt]);
  return ethers.concat([contracts.FrameWalletFactory.address, initCodeCallData]);
}
