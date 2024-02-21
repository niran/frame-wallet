import { NextResponse } from "next/server";
import { getSSLHubRpcClient, Message } from '@farcaster/hub-nodejs';
import { BASE_URL, HUB_URL, IMAGE_URL } from "@/constants";
import { getWalletInfoForFrameAction } from "../wallet";
import { redirectToViewWallet } from "../responses";
import { validateFrameAction } from "../validate-frame";


async function handler(req, { params }) {
  const result = await validateFrameAction(req, params);
  if (result.isOk()) {
    return redirectToViewWallet(result.value.wallet.address);
  }

  // We don't have a signature from the user, so prompt them to sign.
  const walletSalt = req.nextUrl.searchParams.get('s');
  const html = `
    <html>
      <head>
        <meta property="og:title" content="View My Frame Wallet" />
        <meta property="og:image" content="${IMAGE_URL}" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${BASE_URL}${IMAGE_URL}" />
        <meta property="fc:frame:button:1" content="View My Frame Wallet" />
        <meta property="fc:frame:button:1:action" content="post_redirect" />
        <meta property="fc:frame:post_url" content="${BASE_URL}/v1/wallet${walletSalt ? ('?s=' + walletSalt) : ''}" />
      </head>
      <body>
        <img src="${IMAGE_URL}" width="800" />
        <h1>View My Frame Wallet</h1>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export const GET = handler;
export const POST = handler;
