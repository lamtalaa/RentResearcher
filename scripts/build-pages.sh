#!/usr/bin/env bash
# Builds the fully static GitHub Pages version of the app.
# API route handlers can't be part of a Next.js static export, so they are
# stashed for the duration of the build (the static client scores the
# prebuilt snapshot in the browser instead).
set -euo pipefail
cd "$(dirname "$0")/.."

STASH_DIR=$(mktemp -d)
trap 'if [ -d "$STASH_DIR/api" ]; then rm -rf src/app/api; mv "$STASH_DIR/api" src/app/api; fi; rm -rf "$STASH_DIR"' EXIT
mv src/app/api "$STASH_DIR/api"

STATIC_EXPORT=1 PAGES_BASE_PATH="${PAGES_BASE_PATH:-/RentResearcher}" npx next build
touch out/.nojekyll
echo "Static site written to out/"
