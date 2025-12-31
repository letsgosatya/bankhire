# BankHire Project Instructions

## Port Configuration
- **Backend API**: Always runs on port 3002
- **Web App**: Always runs on port 3000
- **Mobile App (Expo/Metro)**: Always runs on port 8081

## Important Notes
- Metro/mobile should always run on port 8081
- If already running, restart it but don't run on another port
- Use the `start-all.ps1` script to start all services properly

## Development Setup
1. Run `start-all.ps1` to start all services
2. Backend: http://localhost:3002
3. Web App: http://localhost:3000
4. Mobile App: http://localhost:8081

## Server Management
- All servers are started in background processes and will keep running
- Use `start-all.ps1` to restart all services if needed
- Processes will continue running even after the script completes

## Testing
- Use browser for easy testing of mobile app functionality
- Test on actual mobile device for native experience

## Environment
- OTP is hardcoded to "123456" for testing
- Database is seeded with sample data