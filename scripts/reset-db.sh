#!/usr/bin/env bash
set -euo pipefail

# Efface complètement le schema public…
echo "Dropping public schema…"
supabase db remote execute "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Recrée les extensions indispensables
echo "Creating extensions pgcrypto, uuid-ossp, cube, earthdistance…"
supabase db remote execute "
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE EXTENSION IF NOT EXISTS uuid-ossp;
  CREATE EXTENSION IF NOT EXISTS cube;
  CREATE EXTENSION IF NOT EXISTS earthdistance;
"

# Réapplique le schéma
echo "Pushing schema (BDD.sql)…"
supabase db push

# Redeploy de la fonction serverless
echo "Deploying delete_user function…"
supabase functions deploy delete_user

echo "✅ Database reset and schema reapplied."
