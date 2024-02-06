
/**
 * Use the public key from the frame signature packet to get the address and nonce
 * for the user from the chain.
 * @param {string} pk 
 */
export async function getWalletInfoForPublicKey(pk) {
  /*
  const signerHex = validationMessage.signer;
  const FactoryContract = new ethers.Contract(
    contracts.FrameWalletFactory.address,
    contracts.FrameWalletFactory.abi
  );
  const address = await FactoryContract.getAddress(signerHex, walletSalt ? parseInt(walletSalt) : DEFAULT_WALLET_SALT);
  
  const EntryPointContract = new ethers.Contract(
    contracts.EntryPoint.address,
    contracts.EntryPoint.abi
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
