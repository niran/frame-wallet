import { ethers } from "ethers";
import { RPC_URL } from "../../constants";
import * as contracts from "../../contracts";

const provider = new ethers.JsonRpcProvider(RPC_URL);

/**
 * Use the public key from the frame signature packet to get the address and nonce
 * for the user from the chain.
 */
export async function getWalletInfoForFrameAction(fid, pk, salt) {
  /*
  const FactoryContract = new ethers.Contract(
    contracts.FrameWalletFactory.address,
    contracts.FrameWalletFactory.abi,
    provider
  );
  const address = await FactoryContract.getAddress(fid, pk, salt ? parseInt(salt) : 0);
  
  const EntryPointContract = new ethers.Contract(
    contracts.EntryPoint.address,
    contracts.EntryPoint.abi,
    provider
  );
  const nonce = await EntryPointContract.getNonce(address, 0);
  */

  const address = "0x0746a969b9b81CFa52086d6FeF709D3489572204";
  const nonce = 0;

  return {
    address,
    nonce,
  };
}
