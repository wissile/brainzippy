#!/usr/bin/env bash
# D1 migrations for the deploy workflow (.github/workflows/deploy.yml). Runs after `npm run build`, so wrangler uses
# the flattened config for the environment (dist/<worker>/wrangler.json) and finds the database by its name.
#
#   ci-d1.sh pre  <database_name> <env>   before `wrangler deploy`: migrate only if the database already exists
#                                         (the very first deploy creates it, so there is nothing to migrate yet)
#   ci-d1.sh post <database_name> <env>   after `wrangler deploy`: always migrate (no-op when already up to date)
#
# Migrations must stay backward compatible with the Worker version that is live while they run (additive changes);
# see docs/DATABASE.md.
set -euo pipefail
phase="${1:?pre|post}" db="${2:?database name}" env="${3:?environment}"
case "$phase" in
  pre)
    if npx wrangler d1 list --json | jq -e --arg db "$db" 'any(.[]; .name == $db)' > /dev/null; then
      npx wrangler d1 migrations apply "$db" --remote --env "$env"
    else
      echo "::notice::D1 database \"$db\" does not exist yet; wrangler deploy will create it, then migrations run."
    fi
    ;;
  post)
    npx wrangler d1 migrations apply "$db" --remote --env "$env"
    ;;
  *)
    echo "usage: ci-d1.sh pre|post <database_name> <env>" >&2
    exit 2
    ;;
esac
