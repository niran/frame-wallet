# Frame Wallet

Frame Wallet is a proof-of-concept frame you can cast on Farcaster to let your followers send any transaction you chooseon the Base network. Each Farcaster ID (FID) is associated with an ERC 4337 account abstraction wallet that accepts frame button clicks on this frame as authorization for the given transaction.

## For Frame Creators

Frame Wallet helps you create a frame without writing any code or paying gas fees for your users. For an example of where this is useful, consider the [Seedbucks frame](https://warpcast.com/worm.eth/0x2f7eb39e) that required users to *submit their wallet's seed phrase* to mint tokens. The [developer's stated goal](https://warpcast.com/worm.eth/0x2dc7c5a1) was to avoid paying gas costs and to avoid writing frontend code to connect with the user's wallet. Frame Wallet accomplishes the same goals without asking users to share the one thing every wallet begs them not to share.

If you want users to send Base transactions to mint a token, mint an NFT, or take some other actions onchain, here's what you do:

1. Generate the calldata for your transaction using [Foundry's `cast calldata` command](https://book.getfoundry.sh/reference/cast/cast-calldata).
2. Generate a transaction URL by cloning this repository, running the dev server with `npm run dev`, and calling the transaction generation script with `bash scripts/generate-tx.sh <calldata>`. (We intend to replace this step with a web user interface.)
3. Test your frame in the [Frame Validator](https://warpcast.com/~/developers/frames).
4. Cast the URL to your transaction frame!

## For Users

If you've seen a Frame Wallet transaction on Farcaster, here's what you need to know to use it:

* **Your Frame Wallet already has an address on Base.** You can view the address by clicking the "View My Frame Wallet" button in the frame. There's nothing at that address yet, but once you sign a Frame Wallet transaction, the wallet will be deployed for you.
* **Your Frame Wallet needs gas.** All Base transactions have a small fee of $0.10 to roughly a dollar. To pay the fee, you need to send ETH to your Frame Wallet address on Base before you can use any Frame Wallet transactions.
* **Frame Wallet is an experimental proof-of-concept.** You may encounter bugs when using Frame Wallet.
* **Frame Wallet is temporary.** Without the frame server we run at `0xfw.vercel.app`, there is no way to access your Frame Wallet. Use it for fun, and if there's anything in it that you want to keep, send it to another wallet by following the developer instructions above.

## Known Issues

* Gas prices are encoded in the transaction URLs, so they don't adapt to changing network conditions. If the gas prices could change over time, anyone on the network could rebroadcast your transaction with high prices that would drain your Frame Wallet's ETH.

## Future Directions

### Paymaster

It'd be nice to be able to subsidize gas for Frame Wallet users, and Frame Wallet was built with this use case in mind. The signed Farcaster message within each transaction contains the FID of the user who sent the cast, and the cast ID that contains the frame. A paymaster can be deployed that subsidizes transactions by user or by cast. That paymaster should use the `isValidUserOp` hook provided on the wallet to avoid the high gas usage of decompressing and validating the Farcaster signature. The frame server also would need to be updated to conditionally pass that paymaster in the transaction.

## How Frame Wallet Works

Farcaster frames send a signed message to the frame server every time a button is clicked on a frame. These signatures are Ed22519 signatures that can't directly control Ethereum accounts. However, now that we have ERC 4337, any cryptographic signatures can control Ethereum accounts. Frame Wallet demonstrates that by associating Farcaster IDs and their signing keys with ERC 4337 wallets. Beyond Farcaster signatures, it's now possible to use all sorts of encryption to control wallets: DKIM signatures from emails, SSL certificates for web content, or most promisingly, passkeys controlled by fingerprint scanners on your devices.

We hope Frame Wallet gets you thinking about things you can build on Base with ERC 4337!
