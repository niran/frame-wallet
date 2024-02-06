import { promisify } from "util";
import { deflateRaw, inflateRaw } from "zlib";
import { NextResponse } from "next/server";
import { getSSLHubRpcClient, Message } from '@farcaster/hub-nodejs';
import { ethers } from "ethers";
import * as contracts from "../../../../contracts";
import { BASE_URL, DEFAULT_WALLET_SALT, CHAIN_ID, HUB_URL, RPC_URL, IMAGE_URL } from "../../../../constants";
import { getWalletInfoForPublicKey } from "../wallet";
import { redirectToViewWallet } from "../responses";

const provider = new ethers.JsonRpcProvider(RPC_URL);

export async function REQUEST(req, { params }) {
  const walletSalt = req.nextUrl.searchParams.get('s');

  const client = getSSLHubRpcClient(HUB_URL);
  let frameSignaturePacket;
  try {
    frameSignaturePacket = await req.json();
  } catch (e) {}

  if (!frameSignaturePacket || !frameSignaturePacket.trustedData) {
    // We don't have a signature from the user, so respond with a frame with a
    // Prepare Transaction button that posts to this route.
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Frame Wallet Transaction" />
          <meta property="og:image" content="${IMAGE_URL}" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${BASE_URL}${IMAGE_URL}" />
          <meta property="fc:frame:button:1" content="Prepare Transaction" />
          <meta property="fc:frame:button:2" content="View My Frame Wallet" />
          <meta property="fc:frame:button:2:action" content="post_redirect" />
          <meta property="fc:frame:post_url" content="${BASE_URL}/v1/p/${params.compressedCallData}${walletSalt ? ('?s=' + walletSalt) : ''}" />
        </head>
        <body>
          <img src="${IMAGE_URL}" width="800" />
          <table>
            <tr>
              <td>Compressed Call Data</td>
              <td>${params.compressedCallData}</td>
            </tr>
          </table>
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

  if (validationMessage.data.frameActionBody.buttonIndex === 1) {
    // ABI encode the chainid, calldata, nonce and gas info.
    const callData = await promisify(inflateRaw)(Buffer.from(params.compressedCallData, 'hex'));
    const feeData = await provider.getFeeData();
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    // TODO: Change callGasLimit from 1000000 to a value derived from simulating the userOp.
    const callGasLimit = 1000000;
    const verificationGasLimit = 10000000;
    const preVerificationGas = 25000; // See also: https://www.stackup.sh/blog/an-analysis-of-preverificationgas
    const partialUserOp = abiCoder.encode(
      ['uint256', 'bytes', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
      [CHAIN_ID, callData, walletInfo.nonce, callGasLimit, verificationGasLimit, preVerificationGas, feeData.maxFeePerGas, feeData.maxPriorityFeePerGas]
    );

    // Compress the ABI encoded partial user op.
    const compressedPartialUserOpBuffer = await promisify(deflateRaw)(ethers.getBytes(partialUserOp));
    const compressedPartialUserOp = compressedPartialUserOpBuffer.toString('hex');
    
    // TODO: Send a farcaster message with the sign URL.
    const signUrl = `${BASE_URL}/v1/s/${compressedPartialUserOp}${walletSalt ? ('?s=' + walletSalt) : ''}`;
    console.log(`Sign URL: ${signUrl}`);
    if (signUrl.length > 256) {
      console.warn("Frame URL length is longer than 256 (Farcaster maximum)");
    }

    const html = `
      <html>
        <head>
          <meta property="og:title" content="Frame Wallet Transaction" />
          <meta property="og:image" content="${IMAGE_URL}" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${BASE_URL}${IMAGE_URL}" />
          <meta property="fc:frame:button:1" content="Check Your Notifications" />
          <meta property="fc:frame:post_url" content="${BASE_URL}/v1/p/${params.compressedCallData}${walletSalt ? ('?s=' + walletSalt) : ''}" />
        </head>
        <body>
          <img src="${IMAGE_URL}" width="800" />
          <table>
            <tr>
              <td>Compressed Call Data</td>
              <td>${params.compressedCallData}</td>
            </tr>
            <tr>
              <td>Compressed Partial UserOp</td>
              <td>${compressedPartialUserOp}</td>
          </table>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } else if (validationMessage.data.frameActionBody.buttonIndex === 2) {
    return redirectToViewWallet(walletInfo.address);
  } else {
    return new NextResponse('Unexpected frame button index', {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}

export const GET = REQUEST;
export const POST = REQUEST;
