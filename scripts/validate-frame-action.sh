#!/bin/bash
# 
# From https://warpcast.notion.site/Outdated-Docs-a8a98ca76a6446508c862c670ebc4cde
# // Hub Validation Example
# // Raw message bytes as hex:
# 0a42080d10c4aa0118c6d1922e20018201320a12687474703a2f2f6578616d706c652e636f6d10011a1a08c4aa0112141fd48ddc9d5910046acfa5e1b91d253763e320c31214230a1291ae8e220bf9173d9090716981402bdd3d18012240f08c907486afe1c3311565b7a27c1f0011c74bd22ba167abe8ba30a35e808cbeae674aef7b74d3161c6186e48e3cc4d843c5ec9dc1dce9c6b71547adcc02c90c28013220196a70ac9847d59e039d0cfcf0cde1adac12f5fb447bb53334d67ab18246306c

# // CURL to validate with nemes:
# echo '0a42080d10c4aa0118c6d1922e20018201320a12687474703a2f2f6578616d706c652e636f6d10011a1a08c4aa0112141fd48ddc9d5910046acfa5e1b91d253763e320c31214230a1291ae8e220bf9173d9090716981402bdd3d18012240f08c907486afe1c3311565b7a27c1f0011c74bd22ba167abe8ba30a35e808cbeae674aef7b74d3161c6186e48e3cc4d843c5ec9dc1dce9c6b71547adcc02c90c28013220196a70ac9847d59e039d0cfcf0cde1adac12f5fb447bb53334d67ab18246306c' \
#   | xxd -r -p \
#   | curl -X POST "https://nemes.farcaster.xyz:2281/v1/validateMessage" \
#      -H "Content-Type: application/octet-stream" \
#      --data-binary @- \
#   | jq

# // Output
# {
#   "valid": true,
#   "message": {
#     "data": {
#       "type": "MESSAGE_TYPE_FRAME_ACTION",
#       "fid": 21828,
#       "timestamp": 96774342,
#       "network": "FARCASTER_NETWORK_MAINNET",
#       "frameActionBody": {
#         "url": "aHR0cDovL2V4YW1wbGUuY29t",
#         "buttonIndex": 1,
#         "castId": {
#           "fid": 21828,
#           "hash": "0x1fd48ddc9d5910046acfa5e1b91d253763e320c3"
#         }
#       }
#     },
#     "hash": "0x230a1291ae8e220bf9173d9090716981402bdd3d",
#     "hashScheme": "HASH_SCHEME_BLAKE3",
#     "signature": "8IyQdIav4cMxFWW3onwfABHHS9IroWer6Lowo16AjL6uZ0rve3TTFhxhhuSOPMTYQ8XsncHc6ca3FUetzALJDA==",
# 		"signer": "0x196a70ac9847d59e039d0cfcf0cde1adac12f5fb447bb53334d67ab18246306c"
#   }
# }
echo $1 \
  | xxd -r -p \
  | curl -X POST "https://hub-api.neynar.com/v1/validateMessage" \
     -H "Content-Type: application/octet-stream" \
     -H "api_key: $NEYNAR_API_KEY" \
     --data-binary @- \
  | jq
