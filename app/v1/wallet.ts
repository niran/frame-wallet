import { AddressLike, Addressable, BigNumberish, BytesLike, Wallet, ethers } from "ethers";
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
