<#
    Vercel Backup Script (Windows)
    Creates a complete backup ZIP that can be redeployed to Vercel.
#>

Write-Host "`n=== Vercel Backup Script ===`n"

# ----------------------------------------
# CONFIGURATION — EDIT THESE
# ----------------------------------------

# GitHub repo to clone
$repoUrl = "https://github.com/YOUR_USERNAME/answers-premium.git"

# Local backup workspace
$backupRoot = "$env:USERPROFILE\vercel-backups"

# Your env backup file (must exist)
$envBackupFile = "$env:USERPROFILE\env.backup"

# Backup name prefix
$backupName = "answers-premium"

# ----------------------------------------
# CHECK REQUIREMENTS
# ----------------------------------------

if (-Not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Git is not installed. Install Git and try again."
    exit 1
}

if (-Not (Test-Path $envBackupFile)) {
    Write-Error "❌ Env backup file not found: $envBackupFile"
    exit 1
}

# Create root directory for backups
if (-Not (Test-Path $backupRoot)) {
    New-Item -Path $backupRoot -ItemType Directory | Out-Null
}

# Timestamp for versioning
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path $backupRoot "$backupName-$timestamp"

Write-Host "📁 Creating backup directory: $backupDir"
New-Item -Path $backupDir -ItemType Directory | Out-Null

# ----------------------------------------
# CLONE REPOSITORY
# ----------------------------------------

Write-Host "⬇️ Cloning GitHub repo..."
git clone $repoUrl $backupDir

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Git clone failed."
    exit 1
}

Write-Host "✔ Repo cloned."

# ----------------------------------------
# INJECT ENV BACKUP FILE
# ----------------------------------------

$envDest = Join-Path $backupDir "env.backup"

Write-Host "📦 Copying env.backup → $envDest"
Copy-Item -Path $envBackupFile -Destination $envDest -Force

# ----------------------------------------
# CREATE ZIP ARCHIVE
# ----------------------------------------

$zipPath = "$backupRoot\$backupName-$timestamp.zip"

Write-Host "🗜 Creating ZIP archive..."
Compress-Archive -Path "$backupDir\*" -DestinationPath $zipPath -Force

Write-Host "`n🎉 Backup complete!"
Write-Host "Backup folder: $backupDir"
Write-Host "Backup ZIP: $zipPath`n"

# ----------------------------------------
# Summary
# ----------------------------------------

Write-Host @"
Your Vercel backup includes:

 • Full project code from GitHub
 • vercel.json, api/, lib/, package.json, etc.
 • env.backup file for re-import to Vercel
 • A dated backup ZIP ready for restore

To restore:
1. Upload ZIP to GitHub or Vercel "Upload Project"
2. Import env.backup into Vercel → Settings → Environment Variables
3. Deploy

Done!
"@
