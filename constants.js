export const BASE_URL = "https://0xfw.vercel.app";
export const HUB_URL = process.env['HUB_URL'] || "nemes.farcaster.xyz:2283";
export const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
export const IMAGE_URL = "/images/robot-check.png";
export const ERROR_IMAGE_URL = "/images/robot-error.png";

// Base Mainnet
export const CHAIN_ID = 8453;
export const RPC_URL = "https://mainnet.base.org";
export const PIMLICO_RPC_URL = "https://api.pimlico.io/v1/base/rpc?apikey=" + (process.env.PIMLICO_API_KEY || '');
export const ALCHEMY_RPC_URL = process.env.ALCHEMY_API_KEY ? "https://base-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY : undefined;

