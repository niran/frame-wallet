import { inflateRaw } from "zlib";
import { promisify } from "util";
import { BytesLike, ethers } from "ethers";

type UnsignedFrameUserOp = {
  chainId: bigint,
  callData: BytesLike,
  callGasLimit: bigint,
  verificationGasLimit: bigint,
  preVerificationGas: bigint,
  maxFeePerGas: bigint,
  maxPriorityFeePerGas: bigint,
};

export async function decompress(compressedFrameUserOp: string): Promise<UnsignedFrameUserOp> {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const compressedFrameUserOpBytes = Buffer.from(compressedFrameUserOp, 'hex');
  const frameUserOp = await promisify(inflateRaw)(compressedFrameUserOpBytes);
  const decodeResult = abiCoder.decode(
    // [CHAIN_ID, callData, callGasLimit, verificationGasLimit, preVerificationGas, feeData.maxFeePerGas, feeData.maxPriorityFeePerGas]
    ['tuple(uint256, bytes, uint256, uint256, uint256, uint256, uint256)'],
    frameUserOp
  );
  const components = decodeResult[0];
  
  return {
    chainId: components[0],
    callData: components[1],
    callGasLimit: components[2],
    verificationGasLimit: components[3],
    preVerificationGas: components[4],
    maxFeePerGas: components[5],
    maxPriorityFeePerGas: components[6],
  };
}
