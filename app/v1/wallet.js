import { ethers } from "ethers";
import { RPC_URL } from "@/constants";
import * as contracts from "@/contracts";

const provider = new ethers.JsonRpcProvider(RPC_URL);

/**
 * Use the public key from the frame signature packet to get the address and nonce
 * for the user from the chain.
 */
export async function getWalletInfoForFrameAction(fid, pk, salt) {
  const FactoryContract = new ethers.Contract(
    contracts.FrameWalletFactory.address,
    contracts.FrameWalletFactory.abi,
    provider
  );
  const getAddress = FactoryContract.getFunction("getAddress"); // collides with Contract.getAddress
  const address = await getAddress(fid, pk, salt ? parseInt(salt) : 0);

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
  };
}
