import { NextResponse } from "next/server";
import { CHAIN_ID } from "../../../constants";


export async function redirectToViewWallet(walletAddress) {
  let explorerUrl = `https://basescan.org/address/${walletInfo.address}#internaltx`;
  if (CHAIN_ID === 84532) {
    explorerUrl = `https://base-sepolia.blockscout.com/address/${walletInfo.address}?tab=internal_txns`;
  }

  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': explorerUrl,
    },
  });
}
