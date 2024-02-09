forge create --interactive --rpc-url https://sepolia.base.org lib/frame-verifier/src/libraries/Ed25519_pow.sol:Ed25519_pow
forge create --interactive --rpc-url https://sepolia.base.org lib/frame-verifier/src/libraries/Sha512.sol:Sha512
forge create --interactive --rpc-url https://sepolia.base.org lib/frame-verifier/src/libraries/Blake3.sol:Blake3
forge create --interactive --rpc-url https://sepolia.base.org lib/frame-verifier/src/libraries/Ed25519.sol:Ed25519
forge create --interactive --rpc-url https://sepolia.base.org lib/frame-verifier/src/FrameVerifier.sol:FrameVerifier
forge create --interactive --rpc-url https://sepolia.base.org src/FrameWalletFactory.sol:FrameWalletFactory --constructor-args 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
