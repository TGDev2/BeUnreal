<#
.SYNOPSIS
  Drop schema public and reapply BDD.sql via Supabase CLI (Windows PowerShell)

.DESCRIPTION
  Vérifie la présence de la CLI supabase,
  efface le schema, recrée les extensions,
  pousse le schéma et redéploie la fonction delete_user.
#>

# Stop on error
$ErrorActionPreference = 'Stop'

Write-Host "Vérification de la CLI supabase..."
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Error "CLI supabase introuvable. Installez-la via Scoop ou Chocolatey."
    exit 1
}

Write-Host "Suppression du schema public…"
supabase db remote execute "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" | Write-Host

Write-Host "Création des extensions…"
supabase db remote execute @"
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE EXTENSION IF NOT EXISTS uuid-ossp;
  CREATE EXTENSION IF NOT EXISTS cube;
  CREATE EXTENSION IF NOT EXISTS earthdistance;
"@ | Write-Host

Write-Host "👉 Application du schéma (BDD.sql)…"
supabase db push | Write-Host

Write-Host "👉 Déploiement de la fonction delete_user…"
supabase functions deploy delete_user | Write-Host

Write-Host "✅ Base de données réinitialisée et schéma appliqué."
