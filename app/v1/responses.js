import { NextResponse } from "next/server";


export async function redirectToViewWallet(walletAddress) {
  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': `https://basescan.org/address/${walletAddress}`,
    },
  });
}
