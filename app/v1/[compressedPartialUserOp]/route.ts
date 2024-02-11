import { promisify } from "util";
import { inflateRaw } from "zlib";
import { type NextRequest, NextResponse } from "next/server";
import { getSSLHubRpcClient, HubError, Message, MessageData, messageTypeFromJSON } from '@farcaster/hub-nodejs';
import { ethers } from "ethers";
import axios from "axios";
import { Result, ResultAsync, errAsync, ok, okAsync } from "neverthrow";
import { BASE_URL, HUB_URL, IMAGE_URL, ENTRY_POINT_ADDRESS, PIMLICO_RPC_URL } from "@/constants";
import * as contracts from "@/contracts";
import { getWalletInfoForFrameAction, type WalletInfo } from "../wallet";
import { redirectToViewWallet } from "../responses";

type RouteParams = {
  compressedPartialUserOp: string,
};

type FrameSignaturePacket = {
  trustedData?: {
    messageBytes: string,
  },
};

type ValidatedFrameAction = {
  message: Message,
  wallet: WalletInfo,
}

type MissingInfoFrameValidationError = {
  kind: 'missing',
  message: string,
  error?: any,
}

type HubFrameValidationError = {
  kind: 'hub',
  message: string,
  error?: any,
}

type WalletFrameValidationError = {
  kind: 'wallet',
  message: string,
  error: any,
}

type FrameValidationError = MissingInfoFrameValidationError | HubFrameValidationError | WalletFrameValidationError;

function intoMissingInfoFrameValidationError(message: string, error?: any): MissingInfoFrameValidationError {
  return {
    kind: 'missing',
    message,
    error,
  };
}

function intoHubFrameValidationError(message: string, error?: any): HubFrameValidationError {
  return {
    kind: 'hub',
    message,
    error,
  };
}

function intoWalletFrameValidationError(message: string, error?: any): WalletFrameValidationError {
  return {
    kind: 'wallet',
    message,
    error,
  };
}

function validateFrameAction(req: NextRequest, params: RouteParams): ResultAsync<ValidatedFrameAction, FrameValidationError> {
  const saltParam = req.nextUrl.searchParams.get('s');
  const walletSalt = saltParam ? parseInt(saltParam) : 0;

  const client = getSSLHubRpcClient(HUB_URL);
  const parsedBody: ResultAsync<FrameSignaturePacket, MissingInfoFrameValidationError> = ResultAsync.fromPromise(req.json(),
    err => intoMissingInfoFrameValidationError("Failed to process the request body as JSON", err));

  return parsedBody
    .andThen(packet => {
      if (!packet || !packet.trustedData) {
        return errAsync(intoMissingInfoFrameValidationError("Frame Signature Packet is missing or has no trustedData"));
      }
      return okAsync(packet);
    })
    .andThen(packet => {
      // TODO: Check the URL in the frame signature packet. If it doesn't match the current URL, then a developer
      // has included our frame in their own frame flow. Present a button that says "Prepare Transaction" that when
      // clicked, sends a Farcaster message to the user with this URL.

      // Validate the frame signature packet.
      console.log(packet);
      const frameMessageBytes = packet.trustedData.messageBytes;
      const frameMessage = Message.decode(Uint8Array.from(Buffer.from(frameMessageBytes, 'hex')));
      return ResultAsync.fromPromise(client.validateMessage(frameMessage),
        err => intoHubFrameValidationError("Couldn't validate message with hub", err))
    })
    .andThen(response => {
      if (!response.isOk()) {
        return errAsync(intoHubFrameValidationError(`HubError: ${response.error.message}`, response.error));
      }
      if (!response.value.valid) {
        return errAsync(intoHubFrameValidationError("Frame message was invalid"));
      }

      const validationMessage = response.value.message;
      const walletInfoPromise = getWalletInfoForFrameAction(
        validationMessage.data.fid, validationMessage.signer, walletSalt);
      const walletResult = ResultAsync.fromPromise(walletInfoPromise,
        err => intoWalletFrameValidationError("Couldn't get wallet info for the frame's user", err));
      return walletResult.map(wallet => {
        return {
          message: validationMessage,
          wallet,
        }
      });
    });
}

function respondWithInitialFrame(req, params: RouteParams) {
  const saltParam = req.nextUrl.searchParams.get('s');
  const walletSalt = saltParam ? parseInt(saltParam) : 0;

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

export async function handler(req: NextRequest, { params }: { params: RouteParams }) {
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
  if (message.data.frameActionBody.buttonIndex === 1) {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();

    // Construct the Solidity ABI-encoded version of MessageData within
    // the FrameUserOpSignature struct. Using hub-nodejs to encode MessageData
    // for us doesn't do what we want: it produces an encoded protobuf, but we
    // need Solidity ABI-encoded data.
    const messageData = message.data;
    const frameActionBody = messageData.frameActionBody;
    const castId = frameActionBody.castId;
    const castIdType = 'tuple(uint64,bytes)';
    const frameActionBodyType = `tuple(bytes,uint32,${castIdType})`;
    const messageDataType = `tuple(uint8,uint64,uint32,uint8,${frameActionBodyType})`;
    const frameSigType = `tuple(${messageDataType},bytes,bytes)`;
    
    const compressedPartialUserOpBytes = Buffer.from(params.compressedPartialUserOp, 'hex');
    const ed25519SigBytes = message.signature;

    const encodedFrameSig = abiCoder.encode([frameSigType], [[
      [messageData.type, messageData.fid, messageData.timestamp, messageData.network, [
        frameActionBody.url, frameActionBody.buttonIndex, [
          castId.fid, castId.hash
        ]
      ]],
      ed25519SigBytes,
      compressedPartialUserOpBytes,
    ]]);
    
    // Construct the wallet init code.
    let initCode = '0x';
    if (!wallet.code || wallet.code === '0x') {
      // The initCode MUST only be populated when the sender account has not been
      // deployed.
      const FrameWalletFactoryInterface = ethers.Interface.from(contracts.FrameWalletFactory.abi);
      const initCodeCallData = FrameWalletFactoryInterface.encodeFunctionData(
        'createAccount', [message.data.fid, ethers.hexlify(message.signer), walletSalt]);
      initCode = ethers.concat([contracts.FrameWalletFactory.address, initCodeCallData]);
    }

    // Assemble the fields into an eth_sendUserOperation call.
    const partialUserOp = await promisify(inflateRaw)(compressedPartialUserOpBytes);
    const decodeResult = abiCoder.decode(
      // [CHAIN_ID, callData, callGasLimit, verificationGasLimit, preVerificationGas, feeData.maxFeePerGas, feeData.maxPriorityFeePerGas]
      ['tuple(uint256, bytes, uint256, uint256, uint256, uint256, uint256)'],
      partialUserOp
    );
    const userOpComponents = decodeResult[0];

    const userOperation = {
      sender: wallet.address,
      nonce: ethers.toBeHex(wallet.nonce),
      initCode: initCode,
      callData: ethers.toBeHex(userOpComponents[1]),
      callGasLimit: ethers.toBeHex(userOpComponents[2]),
      verificationGasLimit: ethers.toBeHex(userOpComponents[3]),
      preVerificationGas: ethers.toBeHex(userOpComponents[4]),
      maxFeePerGas: ethers.toBeHex(userOpComponents[5]),
      maxPriorityFeePerGas: ethers.toBeHex(userOpComponents[6]),
      paymasterAndData: "0x",
      signature: encodedFrameSig,
    };

    const options = {
      method: "POST",
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

    const encodedUserOp = abiCoder.encode(
      ['tuple(address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes)'],
      [[userOperation.sender, userOperation.nonce, userOperation.initCode, userOperation.callData,
        userOperation.callGasLimit, userOperation.verificationGasLimit, userOperation.preVerificationGas,
        userOperation.maxFeePerGas, userOperation.maxPriorityFeePerGas, userOperation.paymasterAndData,
        userOperation.signature]]
    );
    console.log(`Encoded UserOperation: ${encodedUserOp}`);

    console.log(JSON.stringify(options, (key, value) => {
      if((typeof value).toLowerCase() === 'bigint') {
        console.log(`key ${key} is a BigInt`);
        return value.toString();
      }
      return value;
    }, 2));
    
    let response;
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

      throw error;
    }

    if (response.data.error) {
      console.error(response.data.error);
      throw new Error(response.data.error.message);
    }

    console.log(response.status);
    console.log(response.headers);
    console.log(response.data);
    console.log(`UserOp ${response.data.result} submitted`);

    const html = `
      <html>
        <head>
          <meta property="og:title" content="Frame Wallet Transaction Submitted" />
          <meta property="og:image" content="${IMAGE_URL}" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${BASE_URL}${IMAGE_URL}" />
          <meta property="fc:frame:button:1" content="View My Frame Wallet" />
          <meta property="fc:frame:button:1:action" content="post_redirect" />
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
  } else if (message.data.frameActionBody.buttonIndex === 2) {
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
