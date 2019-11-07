#!/bin/bash

# ==== Parameters ====
API_KEY=xxxx
CERT_NAME=xxxx
BASE_URL=xxxx
CERT_DIR=/path/to/certificate/save/location
# ====================

CERT_CHAIN_FILE=$CERT_DIR/$CERT_NAME.fullchain.pem
CERT_PRIVKEY_FILE=$CERT_DIR/$CERT_NAME.privkey.pem

EXTRA_ARGS=""
if [[ -f "$CERT_CHAIN_FILE" ]]; then
  EXTRA_ARGS="-d {\"IfModifiedSince\":$(date -r $CERT_CHAIN_FILE +%s)000}"
fi

DATA=$(
  curl -s -X POST \
    $BASE_URL/dl \
    -H "x-api-key: $API_KEY" \
    -H "x-certificate-name: $CERT_NAME" \
    -H 'cache-control: no-cache' \
    -H 'Content-Type: application/json' \
    $EXTRA_ARGS
)

set -e

if [[ -z "$DATA" ]]; then
  echo "Empty repsonse, assuming unmodified"
  exit 0
fi

if [[ "$(echo $DATA | jq ".cert" -r)" == "null" ]]; then
  echo "There was an issue!"
  exit 1
fi

echo $DATA | jq ".cert" -r > $CERT_CHAIN_FILE
echo $DATA | jq ".key" -r > $CERT_PRIVKEY_FILE
