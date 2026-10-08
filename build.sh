#!/bin/sh
set -eu

# Assemble fragmented b64 assets (*.b64frag.aa, *.b64frag.ab, ...) into *.b64
find . -name '*.b64frag.aa' -type f | while IFS= read -r first; do
  stem=${first%.b64frag.aa}
  cat "$stem".b64frag.* > "$stem.b64"
done

# Decode committed base64 assets on both GNU/Linux (Render) and macOS.
# Keep the source files so local verification does not dirty the checkout.
find . -name "*.b64" -type f | while IFS= read -r source; do
  output=${source%.b64}
  temporary="${output}.tmp.$$"
  # Reading from stdin works with GNU coreutils and macOS base64.
  base64 --decode < "$source" > "$temporary"
  mv "$temporary" "$output"
done

# Extract photo tar if present (written as img/photos.tar via b64 decode)
PHOTOS_TAR="./fplb/deals/flea-tick-summer12/img/photos.tar"
if [ -f "$PHOTOS_TAR" ]; then
  tar -xf "$PHOTOS_TAR" -C "$(dirname "$PHOTOS_TAR")"
fi

echo "b64 decode done"
