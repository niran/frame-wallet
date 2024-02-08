#!/bin/bash
if [ -n $2 ]
then
  SERVER="http://localhost:3000";
else
  SERVER="https://frame-wallet.vercel.app/";
fi

PAYLOAD='{"untrustedData":{"inputText":"'"$1"'"}}'

curl -d $PAYLOAD -H "Content-Type: application/json" $SERVER/v1/generate-tx -v
