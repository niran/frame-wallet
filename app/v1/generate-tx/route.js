import { promisify } from "util";
import { deflateRaw, inflateRaw } from "zlib";
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { BASE_URL, CHAIN_ID, RPC_URL, IMAGE_URL } from "@/constants";

const provider = new ethers.JsonRpcProvider(RPC_URL);

export async function REQUEST(req) {
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

  const feeData = await provider.getFeeData();
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  // TODO: Change callGasLimit from 1000000 to a value derived from simulating the userOp.
  const callGasLimit = 1000000;
  const verificationGasLimit = 10000000;
  const preVerificationGas = 25000; // See also: https://www.stackup.sh/blog/an-analysis-of-preverificationgas
  const partialUserOp = abiCoder.encode(
    ['tuple(uint256, bytes, uint256, uint256, uint256, uint256, uint256)'],
    [[CHAIN_ID, callData, callGasLimit, verificationGasLimit, preVerificationGas, feeData.maxFeePerGas, feeData.maxPriorityFeePerGas]]
  );
  console.log(`feeData: ${JSON.stringify(feeData, 0, 2)}`);
  console.log(`PartialUserOp: ${partialUserOp}`);
  console.log(`length: ${(partialUserOp.length - 2) / 2} bytes`);

  // Compress the ABI encoded partial user op.
  const partialUserOpBytes = ethers.getBytes(partialUserOp);
  const compressedPartialUserOpBuffer = await promisify(deflateRaw)(partialUserOpBytes);
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

export const GET = REQUEST;
export const POST = REQUEST;
