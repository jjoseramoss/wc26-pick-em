#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# OrbStack installs Docker here on macOS when its xbin path is not in the shell.
if ! command -v docker >/dev/null 2>&1; then
  export PATH="/Applications/OrbStack.app/Contents/MacOS/xbin:$PATH"
fi

# This container belongs to `supabase start` for this repository. Using its
# local psql prevents an accidental write to the linked hosted project.
docker exec -i supabase_db_wc26-pick-em \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/seed.local-demo.sql
