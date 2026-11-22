#!/usr/bin/env bash
# Post-deploy smoke test (.github/workflows/deploy.yml). Usage: ci-smoke.sh https://brainzippy.com
# 1. /api/health answers (retries: a brand-new custom domain can take a moment for DNS and the certificate).
# 2. /api/config reports exactly the feature flags this build was made with (dist/<worker>/wrangler.json), so a
#    deploy can't silently switch accounts, billing or friends on (D-030).
set -euo pipefail
origin="${1:?origin, e.g. https://brainzippy.com}"
curl -fsS --retry 10 --retry-delay 6 --retry-all-errors "$origin/api/health"
echo
config="$(ls dist/*/wrangler.json | grep -v '^dist/client/' | head -n 1)"
expected="$(jq -c '.vars as $v | ($v.ACCOUNTS_ENABLED == "true") as $a | {accounts: $a, billing: ($a and $v.BILLING_ENABLED == "true"), friends: ($a and $v.FRIENDS_ENABLED == "true")}' "$config")"
# Cache-busting query: /api/config is cacheable for 5 minutes.
actual="$(curl -fsS --retry 5 --retry-delay 5 --retry-all-errors "$origin/api/config?deploy=$(date +%s)" | jq -c '{accounts, billing, friends}')"
echo "feature flags: expected $expected, live $actual"
[ "$expected" = "$actual" ] || { echo "::error::Live feature flags differ from the build's wrangler config"; exit 1; }
