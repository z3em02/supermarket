@echo off
REM Generates backend\.env from backend\.env.example with fresh random secrets
REM filled in (JWT_SECRET, SECTION_UNLOCK_SECRET, ENCRYPTION_KEY). All other
REM values (DATABASE_URL, SMTP, WhatsApp, ...) stay as the example placeholders
REM for you to fill in by hand. Uses Node's crypto, so no openssl needed.
setlocal
cd /d "%~dp0backend"

if exist .env (
  echo backend\.env already exists - refusing to overwrite.
  echo Delete it first if you really want to regenerate. WARNING: a new
  echo ENCRYPTION_KEY cannot read data encrypted with the old one.
  exit /b 1
)

node -e "const fs=require('fs'),c=require('crypto');const g=()=>c.randomBytes(32).toString('hex');let s=fs.readFileSync('.env.example','utf8');s=s.replace(/^JWT_SECRET=.*$/m,'JWT_SECRET='+g()).replace(/^SECTION_UNLOCK_SECRET=.*$/m,'SECTION_UNLOCK_SECRET='+g()).replace(/^ENCRYPTION_KEY=.*$/m,'ENCRYPTION_KEY='+g());fs.writeFileSync('.env',s);console.log('Wrote backend/.env with fresh JWT_SECRET, SECTION_UNLOCK_SECRET and ENCRYPTION_KEY.');"
if errorlevel 1 exit /b 1

echo.
echo Next: open backend\.env and set DATABASE_URL, FRONTEND_URL and SMTP vars.
echo VAPID web-push keys (optional): run  npx web-push generate-vapid-keys
endlocal
