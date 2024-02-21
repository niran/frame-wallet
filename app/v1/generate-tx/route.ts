import { promisify } from "util";
import * as zlib from "zlib";
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { BASE_URL, CHAIN_ID, RPC_URL, IMAGE_URL, ALCHEMY_RPC_URL, PIMLICO_RPC_URL, ENTRY_POINT_ADDRESS } from "@/constants";
import { getInitCode, getWalletInfoForFrameAction } from "../wallet";
import axios from "axios";

const provider = new ethers.JsonRpcProvider(RPC_URL);

async function handler(req) {
  /*
  {
    "untrustedData": {
      "fid": 231775,
      "url": "https://frame-wallet.vercel.app/8453:db26abfe8d0109349b76feb9f676db837e9f1aa32bdfa543f62ed01466a00c24109077e18c5bbe199f827b6bf7bd276006233e4900",
      "messageHash": "0x264e32086de5eb915e89ff23b06ceb7acfa94ef5",
      "timestamp": 1707180336000,
      "network": 1,
      "buttonIndex": 1,
      "castId": {
        "fid": 231775,
        "hash": "0x0000000000000000000000000000000000000001"
      }
    },
    "trustedData": {
      "messageBytes": "0ac101080d10df920e18b0b6cc2e20018201b0010a8f0168747470733a2f2f6672616d652d77616c6c65742e76657263656c2e6170702f383435333a6462323661626665386430313039333439623736666562396636373664623833376539663161613332626466613534336636326564303134363661303063323431303930373765313863356262653139396638323762366266376264323736303036323333653439303010011a1a08df920e121400000000000000000000000000000000000000011214264e32086de5eb915e89ff23b06ceb7acfa94ef518012240b73538b4342b8d6f590b6ea3fc59e1cc6460865024aece09674af6749e82a7934c5cba4e136c02ada585fe1b5ac55304103e7a417161e7bedbe1c641bf75d0092801322031351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419"
    }
  }
  */
  let frameData;
  try {
    frameData = await req.json();
  } catch (e) {}

  if (!frameData || !frameData.untrustedData.inputText) {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Generate Frame Wallet Transaction URL" />
          <meta property="og:image" content="${IMAGE_URL}" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${BASE_URL}${IMAGE_URL}" />
          <meta property="fc:frame:input:text" content="Call data for your transaction" />
          <meta property="fc:frame:button:1" content="Generate Frame Wallet TX URL" />
          <meta property="fc:frame:button:1:action" content="post_redirect" />
          <meta property="fc:frame:post_url" content="${BASE_URL}/v1/generate-tx" />
        </head>
        <body>
          <img src="${IMAGE_URL}" width="800" />
          <h1>Generate Frame Wallet Transaction URL</h1>
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

  // ABI encode the chainid, calldata, nonce and gas info.
  let callData = frameData.untrustedData.inputText;
  if (callData.slice(0, 2) !== '0x') {
    callData = `0x${callData}`;
  }

  // To ensure that the simulated verification doesn't short-circuit, we need to use the actual fid, signer,
  // and salt that match the dummy signature.
  const dummyFid = 231775;
  const dummySigner = "0x31351506585341467af8e18295bbd3eea2d5ea942edaf612f915f8e9cf639419";
  const dummySignature = "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002e00000000000000000000000000000000000000000000000000000000000000340000000000000000000000000000000000000000000000000000000000000000d000000000000000000000000000000000000000000000000000000000003895f0000000000000000000000000000000000000000000000000000000005e573cb000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000df68747470733a2f2f6672616d652d77616c6c65742e76657263656c2e6170702f76312f363336306330306231346630636133323761393965306437636566303030616632636662343266636536666237383362653033373765633632393763623238633465346665656530643563656566343463303763383632356462363464356266323130623534353763653863386261666234363264666333373034383434653832396466613930373333396566666334363738306635326362633465303438313034303266323263313731656633366532303634303832653030303000000000000000000000000000000000000000000000000000000000000003895f0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000040c2686aa4ae72786ffdbaeff0696df3b204438cd6d28009d49dd408b02ff131df4f178c3e7ea7794bf64399a4108ac9e08ca12b29d2e2a225a0f2b5848acea900000000000000000000000000000000000000000000000000000000000000005e6360c00b14f0ca327a99e0d7cef000af2cfb42fce6fb783be0377ec6297cb28c4e4feee0d5ceef44c07c8625db64d5bf210b5457ce8c8bafb462dfc3704844e829dfa907339effc46780f52cbc4e04810402f22c171ef36e2064082e00000000";
  const dummyWallet = await getWalletInfoForFrameAction(dummyFid, dummySigner, 0);

  const userOperation = {
    sender: dummyWallet.address,
    nonce: ethers.toBeHex(dummyWallet.nonce),
    initCode: getInitCode(dummyWallet, dummyFid, dummySigner),
    paymasterAndData: "0x",
    signature: dummySignature,
    callData: ethers.hexlify(callData),
  };

  const options = {
    method: "POST",
    // NOTE: Only Alchemy is successfully estimating gas for our user operations.
    url: ALCHEMY_RPC_URL,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    data: {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_estimateUserOperationGas",
      params: [
        userOperation,
        ENTRY_POINT_ADDRESS,
      ],
    },
  };

  console.log(JSON.stringify(options, null, 2));
  
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
  }

  if (response.data.error) {
    console.error(response.data.error);
  }

  const estimates = response.data?.result;
  const callGasLimit = ethers.getBigInt(estimates?.callGasLimit ?? 500_000);
  // Alchemy estimated 265,368 for verification gas, which is too low. Through trial and error,
  // verificationGasLimit fails on Pimlico at 3,000,000, but succeeds at 5,000,000. We hardcode
  // that gas limit instead of using the estimate.
  const verificationGasLimit = 5_000_000;
  // Pre-verification gas was initially estimated at 25,000 based on this blog post:
  // https://www.stackup.sh/blog/an-analysis-of-preverificationgas
  // Alchemy rejected that amount for eth_sendUserOperation and gave a requirement of 39,114.
  // Estimating a simple call with Alchemy via eth_estimateUserOperationGas gave an estimate of 62,352.
  const preVerificationGas = ethers.getBigInt(estimates?.preVerificationGas ?? 40_000);

  const feeData = await provider.getFeeData();
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const partialUserOp = abiCoder.encode(
    ['tuple(uint256, bytes, uint256, uint256, uint256, uint256, uint256)'],
    [[CHAIN_ID, callData, callGasLimit, verificationGasLimit, preVerificationGas, feeData.maxFeePerGas, feeData.maxPriorityFeePerGas]]
  );
  console.log("PartialUserOp:[CHAIN_ID, callData, callGasLimit, verificationGasLimit, preVerificationGas, feeData.maxFeePerGas, feeData.maxPriorityFeePerGas]");
  console.log([CHAIN_ID, callData, callGasLimit, verificationGasLimit, preVerificationGas, feeData.maxFeePerGas, feeData.maxPriorityFeePerGas]);

  // Compress the ABI encoded partial user op.
  const partialUserOpBytes = ethers.getBytes(partialUserOp);
  const compressedPartialUserOpBuffer = await promisify(zlib.deflateRaw)(partialUserOpBytes, { level: zlib.constants.Z_BEST_COMPRESSION });
  const compressedPartialUserOp = compressedPartialUserOpBuffer.toString('hex');
  
  const signUrl = `${BASE_URL}/v1/${compressedPartialUserOp}`;
  if (signUrl.length > 256) {
    console.warn("Frame URL length is longer than 256 (Farcaster maximum)");
  }

  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': signUrl,
    },
  });
}

export const GET = handler;
export const POST = handler;
