import { type NextRequest, NextResponse } from "next/server";
import { BigNumberish, ethers } from "ethers";
import axios from "axios";
import { BASE_URL, IMAGE_URL, ENTRY_POINT_ADDRESS, PIMLICO_RPC_URL, ALCHEMY_RPC_URL, ERROR_IMAGE_URL } from "@/constants";
import * as contracts from "@/contracts";
import { redirectToViewWallet } from "../responses";
import { decompress } from "./userop";
import { RouteParams } from "./types";
import { validateFrameAction } from "../validate-frame";
import { getInitCode } from "../wallet";

function respondWithInitialFrame(req, params: RouteParams) {
  const saltParam = req.nextUrl.searchParams.get('s');
  const walletSalt = saltParam ? parseInt(saltParam) : 0;

  const html = `
  <html>
    <head>
      <meta property="og:title" content="Frame Wallet Transaction" />
      <meta property="og:image" content="${IMAGE_URL}" />
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="${BASE_URL}/v1/${params.compressedPartialUserOp}/i" />
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

async function handler(req: NextRequest, { params }: { params: RouteParams }) {
  const validationResult = await validateFrameAction(req, params);
  if (validationResult.isErr()) {
    const error = validationResult.error;
    if (error.kind === 'missing') {
      // We don't have a signature from the user, so prompt them to sign.
      return respondWithInitialFrame(req, params);
    }

    let errorDetails = error.toString();
    try {
      errorDetails = JSON.stringify(error, null, 2);
    } catch (e) {}

    return new NextResponse(error.message + '\n' + errorDetails, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }

  const { message, wallet } = validationResult.value;
  const messageData = message.data;
  const frameActionBody = messageData?.frameActionBody;
  const castId = frameActionBody?.castId;
  if (!messageData || !frameActionBody || !castId) {
    return new NextResponse("Valid frame action is missing its data", {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }

  if (frameActionBody.buttonIndex === 1) {
    // Construct the Solidity ABI-encoded version of MessageData within
    // the FrameUserOpSignature struct. Using hub-nodejs to encode MessageData
    // for us doesn't do what we want: it produces an encoded protobuf, but we
    // need Solidity ABI-encoded data.
    const castIdType = 'tuple(uint64,bytes)';
    const frameActionBodyType = `tuple(bytes,uint32,${castIdType})`;
    const messageDataType = `tuple(uint8,uint64,uint32,uint8,${frameActionBodyType})`;
    const frameSigType = `tuple(${messageDataType},bytes,bytes)`;
    
    const compressedPartialUserOpBytes = Buffer.from(params.compressedPartialUserOp, 'hex');
    const ed25519SigBytes = message.signature;

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedFrameSig = abiCoder.encode([frameSigType], [[
      [messageData.type, messageData.fid, messageData.timestamp, messageData.network, [
        frameActionBody.url, frameActionBody.buttonIndex, [
          castId.fid, castId.hash
        ]
      ]],
      ed25519SigBytes,
      compressedPartialUserOpBytes,
    ]]);
    
    // Assemble the fields into an eth_sendUserOperation call.
    const frameUserOp = await decompress(params.compressedPartialUserOp);
    const initCode = getInitCode(wallet, messageData.fid, message.signer);
    const userOperation = {
      sender: wallet.address,
      nonce: ethers.toBeHex(wallet.nonce),
      initCode: initCode,
      paymasterAndData: "0x",
      signature: encodedFrameSig,
      callData: ethers.hexlify(frameUserOp.callData),
      callGasLimit: ethers.toBeHex(frameUserOp.callGasLimit as BigNumberish),
      verificationGasLimit: ethers.toBeHex(frameUserOp.verificationGasLimit as BigNumberish),
      preVerificationGas: ethers.toBeHex(frameUserOp.preVerificationGas as BigNumberish),
      maxFeePerGas: ethers.toBeHex(frameUserOp.maxFeePerGas as BigNumberish),
      maxPriorityFeePerGas: ethers.toBeHex(frameUserOp.maxPriorityFeePerGas as BigNumberish),
    };
    console.log("UserOperation: " + JSON.stringify(userOperation, null, 2));

    const options = {
      method: "POST",
      // NOTE: Only Pimlico is successfully bundling our user operations. Alchemy times out,
      // which could be due to FrameWallet violating ERC 4337 storage constraints.
      url: PIMLICO_RPC_URL,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [
          userOperation,
          ENTRY_POINT_ADDRESS,
        ],
      },
    };
    
    let response;
    let success = true;
    try {
      response = await axios.request(options);
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      }

      success = false;
    }

    if (response.data.error) {
      console.error(response.data.error);
      success = false;
    }

    let html: string;
    if (success) {
      console.log(response.status);
      console.log(response.headers);
      console.log(response.data);
      console.log(`UserOp ${response.data.result} submitted`);

      html = `
        <html>
          <head>
            <meta property="og:title" content="Frame Wallet Transaction Submitted" />
            <meta property="og:image" content="${IMAGE_URL}" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${BASE_URL}${IMAGE_URL}" />
            <meta property="fc:frame:button:1" content="View My Frame Wallet" />
            <meta property="fc:frame:button:1:action" content="post_redirect" />
            <meta property="fc:frame:post_url" content="${BASE_URL}/v1/wallet${wallet.salt ? ('?s=' + wallet.salt) : ''}" />
          </head>
          <body>
            <img src="${IMAGE_URL}" width="800" />
            <h1>Transaction Submitted</h1>
          </body>
        </html>
      `;
    } else {
      html = `
        <html>
          <head>
            <meta property="og:title" content="Frame Wallet Transaction Error" />
            <meta property="og:image" content="${ERROR_IMAGE_URL}" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${BASE_URL}${ERROR_IMAGE_URL}" />
            <meta property="fc:frame:button:1" content="View My Frame Wallet" />
            <meta property="fc:frame:button:1:action" content="post_redirect" />
            <meta property="fc:frame:post_url" content="${BASE_URL}/v1/wallet${wallet.salt ? ('?s=' + wallet.salt) : ''}" />
          </head>
          <body>
            <img src="${ERROR_IMAGE_URL}" width="800" />
            <h1>Transaction Error</h1>
          </body>
        </html>
      `;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } else if (frameActionBody.buttonIndex === 2) {
    return redirectToViewWallet(wallet.address);
  } else {
    return new NextResponse('Unexpected frame button index', {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}

export const GET = handler;
export const POST = handler;
