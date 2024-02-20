#!/bin/bash
if [ -n $2 ]
then
  SERVER="http://localhost:3000";
else
  SERVER="https://0xfw.vercel.app/";
fi

PAYLOAD='{"untrustedData":{"inputText":"'"$1"'"}}'

curl -d $PAYLOAD -H "Content-Type: application/json" $SERVER/v1/generate-tx -v
