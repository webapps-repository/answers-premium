<#
    Vercel Restore Script (Windows)
    Restores a complete Vercel project from a backup ZIP.
#>

Write-Host "`n=== Vercel Restore Script ===`n"

# ----------------------------------------
# SELECT BACKUP ZIP
# ----------------------------------------
$zipPath = Read-Host "Enter path to your backup ZIP file"

if (-Not (Test-Path $zipPath)) {
    Write-Error "❌ Backup ZIP not found."
    exit 1
}

# Choose restore location
$restoreRoot = "$env:USERPROFILE\vercel-restore"
New-Item -ItemType Directory -Force -Path $restoreRoot | Out-Null

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$restoreDir = Join-Path $restoreRoot "restore-$timestamp"

Write-Host "📁 Creating restore directory: $restoreDir"
New-Item -ItemType Directory -Force -Path $restoreDir | Out-Null

# ----------------------------------------
# EXTRACT ZIP
# ----------------------------------------
Write-Host "📦 Extracting backup ZIP..."
Expand-Archive -Path $zipPath -DestinationPath $restoreDir -Force

Write-Host "✔ Extracted."

# ----------------------------------------
# CHECK FOR env.backup
# ----------------------------------------
$envBackupFile = Join-Path $restoreDir "env.backup"

if (-Not (Test-Path $envBackupFile)) {
    Write-Error "❌ env.backup file not found in restore directory."
    exit 1
}

Write-Host "✔ env.backup found."

# ----------------------------------------
# INITIALIZE GIT
# ----------------------------------------
Write-Host "🔧 Initializing Git repository..."

Set-Location $restoreDir
git init
git add .
git commit -m "Restore backup $timestamp"

# ----------------------------------------
# OPTIONAL: CREATE GITHUB REPO
# ----------------------------------------
$createGithub = Read-Host "Create new GitHub repo automatically? (y/n)"

if ($createGithub -eq "y") {
    $repoName = Read-Host "Enter GitHub repo name"

    Write-Host "📡 Creating GitHub repo..."
    gh repo create $repoName --public --source=. --remote=origin

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✔ GitHub repo created."
        git push -u origin main
    } else {
        Write-Error "❌ GitHub repo creation failed. Continuing without GitHub."
    }
} else {
    Write-Host "Skipping GitHub repo creation."
}

# ----------------------------------------
# DEPLOY TO VERCEL
# ----------------------------------------
Write-Host "`n🚀 Starting Vercel project creation..."

# Requires `vercel login` already done
$projectName = Read-Host "Enter Vercel project name"

# Create project + link directory
vercel link --project $projectName --yes

# ----------------------------------------
# IMPORT ENV VARS
# ----------------------------------------
Write-Host "🔑 Importing environment variables from env.backup..."

$envLines = Get-Content $envBackupFile

foreach ($line in $envLines) {
    if ($line -match "=") {
        $parts = $line.Split("=", 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()

        Write-Host " → Importing $key"

        vercel env add $key <<< "$value"
    }
}

Write-Host "✔ Environment variables imported."

# ----------------------------------------
# DEPLOY PROJECT
# ----------------------------------------
Write-Host "`n🚀 Deploying to Vercel..."

vercel --prod --confirm

Write-Host "`n🎉 Restore + Deploy complete!"
Write-Host "Project location: $restoreDir"
