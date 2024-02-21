import { promisify } from "util";
import * as zlib from "zlib";
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { BASE_URL, CHAIN_ID, RPC_URL, IMAGE_URL, ALCHEMY_RPC_URL, PIMLICO_RPC_URL, ENTRY_POINT_ADDRESS } from "@/constants";
import { getInitCode, getWalletInfoForFrameAction } from "../wallet";
import axios from "axios";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const sampleBundle = "0x1fad948c00000000000000000000000000000000000000000000000000000000000000400000000000000000000000004337019d937ebcbd73dd750072d86c1ce664b350000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000006e4f5a6060e8f7645cc2d57b7236a5ba2387c6ff00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000186a000000000000000000000000000000000000000000000000000000000004c4b400000000000000000000000000000000000000000000000000000000000009c4000000000000000000000000000000000000000000000000000000000000f4b4200000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a4b61d27f60000000000000000000000004200000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000003b9aca0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000004d0e30db00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000000d000000000000000000000000000000000000000000000000000000000003895f0000000000000000000000000000000000000000000000000000000005e72e81000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000ad68747470733a2f2f307866772e76657263656c2e6170702f76312f363336306330306231346630346232626232653239373637373838303537393662313664303135653739316636663037666363366366633132666366656665643834356664653839383066393063346262366339616137663433313663303632323031623365303361633637396432323630303534333032303137393936306238663739333733303930303930303f733d3200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003895f0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000040c2da57c2ee19a92905fd1c43d7d7a6cad4803a95814d6743a991a21a8811354ff32dcd81591cfbcc6d9c7eb44a0f5ad7801ad981e00f5bfcc774017d9ddbde0400000000000000000000000000000000000000000000000000000000000000476360c00b14f04b2bb2e2976778805796b16d015e791f6f07fcc6cfc12fcfefed845fde8980f90c4bb6c9aa7f4316c062201b3e03ac679d22600543020179960b8f79373090090000000000000000000000000000000000000000000000000000";

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
  const dummySignature = "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000000d000000000000000000000000000000000000000000000000000000000003895f0000000000000000000000000000000000000000000000000000000005e7144b000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000af68747470733a2f2f307866772e76657263656c2e6170702f76312f363336306330306231346630346232626232653239373637373838303566336130306266623438666237303331653539633637343966363738613738663566336262626463323266656665343430633066643462623663396161376634333136373063323534633338366366303065623539613730383538633139303430343039656535633236336465306430633634303230300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003895f0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000040a8e1f31939d5dd821674284ed6333bf9fa7c24e3744455553127c6b0a2c2fd701c3d611fa57360faf7ffc0e06650695b42410564e9179fd36ff6fda0f93bf202000000000000000000000000000000000000000000000000000000000000004a6360c00b14f04b2bb2e2976778805f3a00bfb48fb7031e59c6749f678a78f5f3bbbdc22fefe440c0fd4bb6c9aa7f431670c254c386cf00eb59a70858c19040409ee5c263de0d0c64020000000000000000000000000000000000000000000000";
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
  let callGasLimit = ethers.getBigInt(estimates?.callGasLimit ?? 500_000);
  if (callGasLimit < 100_000) {
    callGasLimit = ethers.getBigInt(100_000);
  }
  // Alchemy estimated 265,368 for verification gas, which is too low. Through trial and error,
  // verificationGasLimit fails on Pimlico at 3,000,000, but succeeds at 5,000,000. We hardcode
  // that gas limit instead of using the estimate.
  const verificationGasLimit = 5_000_000;
  // * Pre-verification gas was initially estimated at 25,000 based on this blog post:
  //     https://www.stackup.sh/blog/an-analysis-of-preverificationgas
  // * Alchemy rejected that amount for eth_sendUserOperation and gave a requirement of 39,114.
  // * Estimating a simple call with Alchemy via eth_estimateUserOperationGas gave an estimate
  //     of 62,352.
  // * On mainnet, Alchemy is returning ridiculously high estimates for pre-verification gas,
  //     like 4,826,431,322. This makes the transactions cost more than $15, which all goes
  //     to the bundler who is only paying $1 for the transaction.
  // * The Pimlico bundler we use seems to accept transactions that it loses money on.
  //     Example: https://basescan.org/tx/0x8ea6595f60bfe35d45707dba097251bfc4475e3f7497391407ee5f2e588cb7f3
  //     L2 chains have an L1 component to the fee that can't be directly mapped to the
  //     UserOperation gas fields. It's the L1 component that Pimlico doesn't seem to collect.
  //     We expect this behavior to change, so we need to account for the L1 fee similarly to
  //     the way Alchemy does: by estimating it and charging for it via pre-verification gas.
  //     https://www.alchemy.com/blog/l2-gas-and-signature-aggregators
  const feeData = await provider.getFeeData();
  const l1FeeData = await (new ethers.JsonRpcProvider('https://cloudflare-eth.com')).getFeeData();
  const directPreVerificationGas = ethers.toBigInt(40_000);
  const transactionLength = ethers.getBytes(sampleBundle).length + ethers.getBytes(callData).length;
  const experimentalL1FeeFactor = 0.3
  const l1Gas = ethers.toBigInt(Math.round((transactionLength * 16 + 188) * 0.684 * experimentalL1FeeFactor));
  const l1Fee = (l1FeeData.maxFeePerGas ?? ethers.parseUnits('30', 'gwei')) * l1Gas;
  const l2GasEquivalent = l1Fee / (feeData.maxFeePerGas ?? ethers.toBigInt(1_000_000));
  const preVerificationGas = directPreVerificationGas + l2GasEquivalent;

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
