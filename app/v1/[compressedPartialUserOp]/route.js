import { promisify } from "util";
import { inflateRaw } from "zlib";
import { NextResponse } from "next/server";
import { getSSLHubRpcClient, Message, MessageData } from '@farcaster/hub-nodejs';
import { ethers } from "ethers";
import axios from "axios";
import { BASE_URL, DEFAULT_WALLET_SALT, HUB_URL, RPC_URL, IMAGE_URL, ENTRY_POINT_ADDRESS } from "../../../constants";
import * as contracts from "../../../contracts";
import { getWalletInfoForPublicKey } from "../wallet";
import { redirectToViewWallet } from "../responses";


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
          <meta property="og:title" content="Frame Wallet Transaction" />
          <meta property="og:image" content="${IMAGE_URL}" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${BASE_URL}${IMAGE_URL}" />
          <meta property="fc:frame:button:1" content="Sign Transaction" />
          <meta property="fc:frame:button:2" content="View My Frame Wallet" />
          <meta property="fc:frame:button:2:action" content="post_redirect" />
          <meta property="fc:frame:post_url" content="${BASE_URL}/v1/${params.compressedPartialUserOp}${walletSalt ? ('?s=' + walletSalt) : ''}" />
        </head>
        <body>
          <img src="${IMAGE_URL}" width="800" />
          <table>
            <tr>
              <td>Compressed Partial UserOp</td>
              <td>${params.compressedPartialUserOp}</td>
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

  // TODO: Check the URL in the frame signature packet. If it doesn't match the current URL, then a developer
  // has included our frame in their own frame flow. Present a button that says "Prepare Transaction" that when
  // clicked, sends a Farcaster message to the user with this URL.

  // Validate the frame signature packet.
  console.log(frameSignaturePacket);
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

  const walletInfo = await getWalletInfoForPublicKey(validationMessage.signer, walletSalt);

  if (validationMessage.data.frameActionBody.buttonIndex === 1) {
    // Construct the signature field of the userOp.
    const compressedPartialUserOpBytes = Buffer.from(params.compressedPartialUserOp, 'hex');
    const mdBytes = MessageData.encode(validationMessage.data).finish();
    const ed25519SigBytes = validationMessage.signature;
    const signature = ethers.concat([mdBytes, ed25519SigBytes, compressedPartialUserOpBytes]);
    
    // Construct the wallet init code.
    const FrameWalletFactoryInterface = ethers.Interface.from(contracts.FrameWalletFactory.abi);
    const initCode = FrameWalletFactoryInterface.encodeFunctionData(
      'createAccount', [ethers.hexlify(validationMessage.signer), walletSalt ? walletSalt : DEFAULT_WALLET_SALT]);
   
    // Assemble the fields into an eth_sendUserOperation call.
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const partialUserOp = await promisify(inflateRaw)(compressedPartialUserOpBytes);
    const userOpComponents = abiCoder.decode(
      // [CHAIN_ID, callData, callGasLimit, verificationGasLimit, preVerificationGas, feeData.maxFeePerGas, feeData.maxPriorityFeePerGas]
      ['uint256', 'bytes', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
      partialUserOp
    );

    const options = {
      method: "POST",
      url: RPC_URL,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [
          {
            sender: walletInfo.address,
            nonce: walletInfo.nonce,
            initCode: initCode,
            callData: userOpComponents[1],
            callGasLimit: ethers.toBeHex(userOpComponents[2]),
            verificationGasLimit: ethers.toBeHex(userOpComponents[3]),
            preVerificationGas: ethers.toBeHex(userOpComponents[4]),
            maxFeePerGas: ethers.toBeHex(userOpComponents[5]),
            maxPriorityFeePerGas: ethers.toBeHex(userOpComponents[6]),
            paymasterAndData: "0x",
            signature: signature,
          },
          ENTRY_POINT_ADDRESS,
        ],
      },
    }; 
    
    const response = await axios.request(options);
    console.log(`UserOp ${response.data.result} submitted`);

    const html = `
      <html>
        <head>
          <meta property="og:title" content="Frame Wallet Transaction Submitted" />
          <meta property="og:image" content="${IMAGE_URL}" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${BASE_URL}${IMAGE_URL}" />
          <meta property="fc:frame:button:1" content="View My Frame Wallet" />
          <meta property="fc:frame:post_url" content="${BASE_URL}/v1/wallet${walletSalt ? ('?s=' + walletSalt) : ''}" />
        </head>
        <body>
          <img src="${IMAGE_URL}" width="800" />
          <h1>Transaction Submitted</h1>
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
