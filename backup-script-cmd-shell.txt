<#
    Vercel Backup Script (Windows)
    Creates a complete backup ZIP that can be redeployed to Vercel.

    backup procedure for answers-premium using target folder C:\Users\hv\vercel-backups\
    
   1. npm install -g vercel (Vercel CLI 50.0.1)
    
   2. vercel login

      Visit https://vercel.com/oauth/device?user_code=BTFR-NCZF

  Congratulations! You are now signed in.

  To deploy something, run `vercel`.

  💡 To deploy every commit automatically,
  connect a Git Repository (vercel.link/git (https://vercel.link/git)).
  
   3. vercel link : Project: answers-premium
    
   4. vercel env pull env.backup

    > Overwriting existing env.backup file
> Downloading `development` Environment Variables for freddys-projects-be88d59b/answers-premium

Changes:
+ EMAIL_SUBJECT_PREMIUM (Updated)
+ VERCEL_OIDC_TOKEN (Updated)

✅  Updated env.backup file

  5.  powershell -ExecutionPolicy Bypass -File .\vercel-backup.ps1

=== Vercel Backup Script ===

📁 Creating backup directory: C:\Users\hv\vercel-backups\answers-premium-2025-12-14_10-42-02
⬇️ Cloning GitHub repo...
Cloning into 'C:\Users\hv\vercel-backups\answers-premium-2025-12-14_10-42-02'...
remote: Enumerating objects: 3046, done.
remote: Counting objects: 100% (129/129), done.
remote: Compressing objects: 100% (68/68), done.
remote: Total 3046 (delta 101), reused 61 (delta 61), pack-reused 2917 (from 3)
Receiving objects: 100% (3046/3046), 1.38 MiB | 8.64 MiB/s, done.
Resolving deltas: 100% (1793/1793), done.
✔ Repo cloned.
📦 Copying env.backup → C:\Users\hv\vercel-backups\answers-premium-2025-12-14_10-42-02\env.backup
🗜 Creating ZIP archive...

🎉 Backup complete!
Backup folder: C:\Users\hv\vercel-backups\answers-premium-2025-12-14_10-42-02
Backup ZIP: C:\Users\hv\vercel-backups\answers-premium-2025-12-14_10-42-02.zip

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
#>
