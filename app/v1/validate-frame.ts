import { type NextRequest } from "next/server";
import { getSSLHubRpcClient, Message } from '@farcaster/hub-nodejs';
import { ResultAsync, errAsync } from "neverthrow";
import { HUB_URL } from "@/constants";
import { getWalletInfoForFrameAction, WalletInfo } from "./wallet";
import { RouteParams } from "./[compressedPartialUserOp]/types";

export interface FrameSignaturePacket {
  trustedData?: {
    messageBytes: string;
  };
};

export interface ValidatedFrameAction {
  message: Message;
  wallet: WalletInfo;
};

export interface MissingInfoFrameValidationError {
  kind: 'missing';
  message: string;
  error?: any;
};

export interface HubFrameValidationError {
  kind: 'hub';
  message: string;
  error?: any;
};

export interface WalletFrameValidationError {
  kind: 'wallet';
  message: string;
  error: any;
};

export type FrameValidationError = MissingInfoFrameValidationError | HubFrameValidationError | WalletFrameValidationError;

export function intoMissingInfoFrameValidationError(message: string, error?: any): MissingInfoFrameValidationError {
  return {
    kind: 'missing',
    message,
    error,
  };
}

export function intoHubFrameValidationError(message: string, error?: any): HubFrameValidationError {
  return {
    kind: 'hub',
    message,
    error,
  };
}

export function intoWalletFrameValidationError(message: string, error?: any): WalletFrameValidationError {
  return {
    kind: 'wallet',
    message,
    error,
  };
}

export function validateFrameAction(req: NextRequest, params: RouteParams): ResultAsync<ValidatedFrameAction, FrameValidationError> {
  const saltParam = req.nextUrl.searchParams.get('s');
  const walletSalt = saltParam ? parseInt(saltParam) : 0;

  const client = getSSLHubRpcClient(HUB_URL);
  const parsedBody: ResultAsync<FrameSignaturePacket, MissingInfoFrameValidationError> = ResultAsync.fromPromise(req.json(),
    err => intoMissingInfoFrameValidationError("Failed to process the request body as JSON", err));

  return parsedBody
    .andThen(packet => {
      if (!packet?.trustedData?.messageBytes) {
        return errAsync(intoMissingInfoFrameValidationError("Frame Signature Packet is missing or has no trustedData"));
      }

      // TODO: Check the URL in the frame signature packet. If it doesn't match the current URL, then a developer
      // has included our frame in their own frame flow. Present a button that says "Prepare Transaction" that when
      // clicked, sends a Farcaster message to the user with this URL.
      // Validate the frame signature packet.
      console.log(packet);
      const frameMessageBytes = packet.trustedData.messageBytes;
      const frameMessage = Message.decode(Uint8Array.from(Buffer.from(frameMessageBytes, 'hex')));
      return ResultAsync.fromPromise(client.validateMessage(frameMessage),
        err => intoHubFrameValidationError("Couldn't validate message with hub", err));
    })
    .andThen(response => {
      if (!response.isOk()) {
        return errAsync(intoHubFrameValidationError(`HubError: ${response.error.message}`, response.error));
      }

      const validationMessage = response.value?.message;
      if (!response.value.valid || !validationMessage?.data) {
        return errAsync(intoHubFrameValidationError("Frame message was invalid"));
      }

      const walletInfoPromise = getWalletInfoForFrameAction(
        validationMessage.data.fid, validationMessage.signer, walletSalt);
      const walletResult = ResultAsync.fromPromise(walletInfoPromise,
        err => intoWalletFrameValidationError("Couldn't get wallet info for the frame's user", err));
      return walletResult.map(wallet => {
        return {
          message: validationMessage,
          wallet,
        };
      });
    });
}
