export const BASE_URL = "https://frame-wallet.vercel.app";
export const HUB_URL = process.env['HUB_URL'] || "nemes.farcaster.xyz:2283";
export const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
export const IMAGE_URL = "/images/robot-check.png";

// Sepolia
export const CHAIN_ID = 84532;
export const RPC_URL = "https://sepolia.base.org";
export const PIMLICO_RPC_URL = "https://api.pimlico.io/v1/base-sepolia/rpc?apikey=" + (process.env.PIMLICO_API_KEY || '');
export const ALCHEMY_RPC_URL = process.env.ALCHEMY_API_KEY ? "https://base-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY : null;

