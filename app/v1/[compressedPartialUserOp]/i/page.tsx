import { ImageResponse } from 'next/og';
import { NextResponse, type NextRequest } from 'next/server';
import { RouteParams } from '../types';
import { decompress } from '../userop';
import { BytesLike, TransactionDescription, ethers } from 'ethers';
import axios from 'axios';


const executeSelector = {
  hex: '0xb61d27f6',
  text: 'execute(address,uint256,bytes)',
};

type ParsedArguments = {
  type: string,
  value: string,
}

type ParsedTransaction = {
  signature: string,
  args: ParsedArguments[],
}

function parseTransactionArgs(signatures, callData): ParsedTransaction | undefined {
  let txData: TransactionDescription | null = null;
  let signature: string | undefined = undefined;

  for (const potentialSig of signatures) {
    const iface = ethers.Interface.from([`function ${potentialSig}`]);
    try {
      txData = iface.parseTransaction({ data: ethers.hexlify(callData) });
    } catch (e) {} finally {
      signature = potentialSig;
      if (txData?.args !== undefined) {
        break;
      }
    }
  }

  const argsLength = txData?.args?.length;
  if (txData === null || signature === undefined || argsLength === undefined) {
    return;
  }

  const args: ParsedArguments[] = [];
  for (let i = 0; i < argsLength; i++) {
    args.push({
      type: txData.fragment.inputs[i].type,
      value: txData.args[i].toString(),
    });
  }
  return {
    signature,
    args,
  };
}

async function decode(callData: BytesLike): Promise<ParsedTransaction> {
  const callDataBytes  = ethers.getBytes(callData);
  let functionSelectorBytes = callDataBytes.slice(0, 4);
  let functionSelectorHex = ethers.hexlify(functionSelectorBytes);

  if (functionSelectorHex === executeSelector.hex) {
    console.log("Selector is execute()");
    // We always expect to be sending an execute() call to the wallet. Use the callData within
    // the execute call for our search.
    const executeTx = parseTransactionArgs([executeSelector.text], callData);
    const innerCallData = executeTx?.args?.[2]?.value;
    if (innerCallData) {
      callData = innerCallData;
      const innerCallDataBytes = ethers.getBytes(callData);
      functionSelectorBytes = innerCallDataBytes.slice(0, 4);
      functionSelectorHex = ethers.hexlify(functionSelectorBytes);
    }
  }

  const searchResult = await axios.request({
    url: `https://www.4byte.directory/api/v1/signatures/?hex_signature=${functionSelectorHex}`,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    }
  });

  console.log(searchResult);
  if (searchResult.status === axios.HttpStatusCode.Ok) {
    const results: Array<any> = (searchResult?.data?.results || []);
    // Function selector collisions are common. We use the oldest selector that can decode
    // the provided callData.
    results.sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
    const signatures: string[] = results.map(r => r?.text_signature);
    console.log(searchResult.data.results);
    const parsedArgs = parseTransactionArgs(signatures, callData);
    if (parsedArgs) {
      return parsedArgs;
    }
  }

  return {
    signature: functionSelectorHex,
    args: [{
      type: 'raw',
      value: ethers.hexlify(callDataBytes.slice(4)),
    }],
  };
}

export default async function GET({ params }: { params: RouteParams }) {
  const frameUserOp = await decompress(params.compressedPartialUserOp);
  const txInfo = await decode(frameUserOp.callData);
  const argRows = txInfo.args.map(({ type, value }, i) => {
    return (
      <tr key={i}>
        <td>{type}</td>
        <td>{value}</td>
      </tr>
    );
  });

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1>Frame Wallet</h1>
      <h2>{txInfo.signature}</h2>
      <table>
        {argRows}
      </table>
    </div>
  );
}
