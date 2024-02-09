import { NextResponse } from "next/server";
import { getSSLHubRpcClient, Message } from '@farcaster/hub-nodejs';
import { BASE_URL, HUB_URL, IMAGE_URL, CHAIN_ID } from "../../../constants";

export async function REQUEST(req, { params }) {
  const walletSalt = req.nextUrl.searchParams.get('s');

  const client = getSSLHubRpcClient(HUB_URL);
  let frameSignaturePacket;
  try {
    frameSignaturePacket = await req.json();
  } catch (e) {}

  if (!frameSignaturePacket || !frameSignaturePacket.trustedData) {
    // We don't have a signature from the user, so prompt them to sign.
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

  // Validate the frame signature packet.
  const frameMessage = frameSignaturePacket.trustedData.messageBytes;
  const result = await client.validateMessage(Message.decode(Uint8Array.from(Buffer.from(frameMessage, 'hex'))));
  if (!(result.isOk() && result.value.valid)) {
    return new NextResponse('Frame Signature Packet could not be validated', {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
  const validationMessage = result.value.message;

  const walletInfo = await getWalletInfoForPublicKey(validationMessage.signer);
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

export const GET = REQUEST;
export const POST = REQUEST;
