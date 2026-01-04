# BankHire Start All Script
# Starts backend, web, and mobile app on different ports
# IMPORTANT: Metro/mobile should always run on port 8081, if already running restart but don't run on another port

Write-Host "Killing existing processes on ports 3000, 3002, 8081..." -ForegroundColor Yellow
$ports = @(3000, 3002, 8081)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Setting up database..." -ForegroundColor Yellow
Start-Process -FilePath "node.exe" -ArgumentList "setup-db.js" -WorkingDirectory "C:\Satya_RealtimeProjects\BankHire\bankhire" -NoNewWindow -Wait

Write-Host "Running database migrations (adding missing columns)..." -ForegroundColor Yellow
Start-Process -FilePath "node.exe" -ArgumentList "tools/addReferralResumeFields.js" -WorkingDirectory "C:\Satya_RealtimeProjects\BankHire\bankhire" -NoNewWindow -Wait

Write-Host "Starting BankHire Backend on port 3002..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-Command cd 'C:\Satya_RealtimeProjects\BankHire\bankhire'; npm run dev" -NoNewWindow

Write-Host "Waiting 5 seconds for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Starting BankHire Web App on port 3000..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-Command cd 'C:\Satya_RealtimeProjects\BankHire\bankhire-web'; npm start" -NoNewWindow

Write-Host "Waiting 3 seconds for web to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Starting BankHire Mobile App (Expo) in LAN mode..." -ForegroundColor Green
# Detect a sensible LAN IP for the machine to let devices connect directly
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' -and $_.AddressState -eq 'Preferred'} | Select-Object -First 1 -ExpandProperty IPAddress) -join ''
if (-not $ip) { $ip = '127.0.0.1' }
Write-Host "Detected host IP: $ip" -ForegroundColor Yellow
# Start Expo in LAN mode and export DEV_API_HOST env var for convenience
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -Command cd 'C:\Satya_RealtimeProjects\BankHire\bankhire-mobile'; $env:DEV_API_HOST='$ip'; npx expo start --lan --port 8081" -NoNewWindow -WorkingDirectory "C:\Satya_RealtimeProjects\BankHire\bankhire-mobile"

Write-Host "All services started! Check terminals for status." -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3002" -ForegroundColor White
Write-Host "Web: http://localhost:3000" -ForegroundColor White
Write-Host "Mobile: Check Expo CLI for QR code/port" -ForegroundColor White