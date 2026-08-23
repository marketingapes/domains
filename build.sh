#!/bin/sh
# Decode any *.b64 files into their binary originals (assets committed as base64 text).
find . -name "*.b64" | while read -r f; do base64 -d "$f" > "${f%.b64}" && rm "$f"; done
echo "b64 decode done"
