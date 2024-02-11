import { NextResponse } from "next/server";
import { CHAIN_ID } from "@/constants";


export async function redirectToViewWallet(walletAddress) {
  let explorerUrl = `https://basescan.org/address/${walletAddress}#internaltx`;
  if (CHAIN_ID === 84532) {
    explorerUrl = `https://base-sepolia.blockscout.com/address/${walletAddress}?tab=internal_txns`;
  }

  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': explorerUrl,
    },
  });
}
