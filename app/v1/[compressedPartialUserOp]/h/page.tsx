import { RouteParams } from '../types';
import { decompress } from '../userop';
import { BytesLike, TransactionDescription, ethers } from 'ethers';
import axios from 'axios';
import { redDark, gray } from '@radix-ui/colors';
import { loadImageURIFromFile } from '../load-file';


const executeSelector = {
  hex: '0xb61d27f6',
  text: 'execute(address,uint256,bytes)',
};

interface ParsedArguments {
  type: string,
  value: string,
}

interface ParsedMethodCall {
  signature: string,
  args: ParsedArguments[],
}

interface ParsedTransaction extends ParsedMethodCall {
  to: string,
  value: string,
}


function parseTransactionArgs(signatures: string[], callData: BytesLike): ParsedMethodCall | undefined {
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

async function decode(callData: BytesLike): Promise<ParsedMethodCall | ParsedTransaction> {
  const callDataBytes  = ethers.getBytes(callData);
  let functionSelectorBytes = callDataBytes.slice(0, 4);
  let functionSelectorHex = ethers.hexlify(functionSelectorBytes);
  let executeArgs: { to: string, value: string } | undefined = undefined;

  if (functionSelectorHex === executeSelector.hex) {
    // We always expect to be sending an execute() call to the wallet. Use the callData within
    // the execute call for our search.
    const executeTx = parseTransactionArgs([executeSelector.text], callData);
    const to = executeTx?.args?.[0]?.value;
    const value = executeTx?.args?.[1]?.value;
    const innerCallData = executeTx?.args?.[2]?.value;
    if (innerCallData) {
      callData = innerCallData;
      const innerCallDataBytes = ethers.getBytes(callData);
      functionSelectorBytes = innerCallDataBytes.slice(0, 4);
      functionSelectorHex = ethers.hexlify(functionSelectorBytes);
    }
    if (to && value) {
      executeArgs = {
        to,
        value,
      };
    }
  }

  const searchResult = await axios.request({
    url: `https://www.4byte.directory/api/v1/signatures/?hex_signature=${functionSelectorHex}`,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    }
  });

  if (searchResult.status === axios.HttpStatusCode.Ok) {
    const results: Array<any> = (searchResult?.data?.results || []);
    // Function selector collisions are common. We use the oldest selector that can decode
    // the provided callData.
    results.sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
    const signatures: string[] = results.map(r => r?.text_signature);
    const parsedArgs = parseTransactionArgs(signatures, callData);
    if (parsedArgs) {
      if (executeArgs) {
        return { ...parsedArgs, ...executeArgs };
      } else {
        return { ...parsedArgs  };
      }
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

function keyValueRow(key: string, value: string, i: number) {
  if (value.length > 12) {
    value = value.slice(0, 6) + '...' + value.slice(-4);
  }
  return (
    <div key={i} style={{
      display: 'flex',
      flexDirection: 'row',
    }}>
      <div style={{
        margin: '5px 10px',
        fontStyle: 'italic',
      }}>{key}</div>
      <div style={{
        margin: '5px 10px',
        minWidth: '20%',
      }}>{value}</div>
    </div>
  );
}

export default async function handler({ params }: { params: RouteParams }) {
  const frameUserOp = await decompress(params.compressedPartialUserOp);
  const txInfo = await decode(frameUserOp.callData);
  const funcName = txInfo.signature.split('(')[0];
  const argsPlaceholder = txInfo.args.length ? '...' : '';
  const argRows = txInfo.args.map(({ type, value }, i) => keyValueRow(type, value, i));
  let executeRows: Array<any> = [];
  if ('to' in txInfo) {
    const startIndex = argRows.length;
    executeRows = [
      keyValueRow('to', txInfo.to, startIndex),
      keyValueRow('value', ethers.formatUnits(txInfo.value, 'gwei') + ' gwei', startIndex + 1),
    ];
  }
  const totalGas = frameUserOp.preVerificationGas + frameUserOp.verificationGasLimit + frameUserOp.callGasLimit;
  const totalFee = totalGas * frameUserOp.maxFeePerGas;
  const totalFeeGwei = Math.round(parseFloat(ethers.formatUnits(totalFee, 'gwei')));
  const gasRow = keyValueRow('gas', totalFeeGwei.toString() + ' gwei', argRows.length + 2);
  const baseLogoURI = await loadImageURIFromFile('public/images/Base_Wordmark_Blue.svg', 'image/svg+xml');

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px',
        fontSize: '24px',
        fontFamily: 'Roboto_Mono_400 monospace',
        backgroundColor: gray.gray2,
      }}
    >
      <div style={{
        height: '20%',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}>
          <div style={{
            border: '10px solid #333',
            width: '75px',
            height: '75px',
            fontSize: '40px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '20px',
          }}>
            💰
          </div>
          <h1>Frame Wallet</h1>
        </div>
        <img src={ baseLogoURI } style={{ height: '60px' }} />
      </div>
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'center',
        flexGrow: 8,
        overflowWrap: 'break-word',
        wordWrap: 'break-word',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: '25px',
          maxWidth: '50%',
          minWidth: '20%',
          fontFamily: 'monospace',
        }}>
          <h2 style={{
            marginTop: 0,
            marginBottom: '5px',
            fontSize: '1.3em',
            fontWeight: 'bold',
          }}>{`${funcName}(${argsPlaceholder})`}</h2>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}>
            {argRows}
            {executeRows}
            {gasRow}
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: '25px',
          maxWidth: '50%',
          minWidth: '20%',
        }}>
          <p>Step 1: Preview Transaction</p>
          <p>Step 2: Deposit gas money in your Frame Wallet</p>
          <p>Step 3: Sign Transaction</p>
        </div>
      </div>
      <div
        style={{
          height: '10%',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          justifyContent: 'center',
          color: redDark.red9,
          fontWeight: 'bolder',
        }}
      >
        Frame Wallet is experimental software. Use at your own risk.
      </div>
    </div>
  );
}
