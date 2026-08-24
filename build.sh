#!/bin/sh
set -eu

# Decode committed base64 assets on both GNU/Linux (Render) and macOS.
# Keep the source files so local verification does not dirty the checkout.
find . -name "*.b64" -type f | while IFS= read -r source; do
  output=${source%.b64}
  temporary="${output}.tmp.$$"
  # Reading from stdin works with GNU coreutils and macOS base64.
  base64 --decode < "$source" > "$temporary"
  mv "$temporary" "$output"
done
echo "b64 decode done"
