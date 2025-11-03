# AWS Chat App Deployment Script
# This script deploys all Lambda functions

$ErrorActionPreference = "Stop"

Write-Host "=== AWS Serverless Chat App Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ROLE_ARN = "arn:aws:iam::324037308320:role/ChatAppLambdaRole"
$REGION = "ap-south-1"
$RUNTIME = "python3.9"
$TIMEOUT = 30

# Lambda Functions
$functions = @(
    @{Name="ChatAppConnect"; Handler="connect.lambda_handler"; Zip="lambda/connect.zip"; EnvVars="TABLE_NAME=ActiveConnections"},
    @{Name="ChatAppDisconnect"; Handler="disconnect.lambda_handler"; Zip="lambda/disconnect.zip"; EnvVars="TABLE_NAME=ActiveConnections"},
    @{Name="ChatAppSendMessage"; Handler="sendmessage.lambda_handler"; Zip="lambda/sendmessage.zip"; EnvVars="TABLE_NAME=ActiveConnections,HISTORY_TABLE_NAME=MessageHistory"},
    @{Name="ChatAppDefault"; Handler="default.lambda_handler"; Zip="lambda/default.zip"; EnvVars=""}
)

Write-Host "Deploying Lambda Functions..." -ForegroundColor Yellow
Write-Host ""

foreach ($func in $functions) {
    Write-Host "Deploying $($func.Name)..." -ForegroundColor Green
    
    # Check if function exists
    $exists = aws lambda get-function --function-name $func.Name --region $REGION 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Updating existing function..." -ForegroundColor Cyan
        aws lambda update-function-code `
            --function-name $func.Name `
            --zip-file fileb://$($func.Zip) `
            --region $REGION | Out-Null
    } else {
        Write-Host "  Creating new function..." -ForegroundColor Cyan
        
        $envVarsJson = @{}
        if ($func.EnvVars -ne "") {
            $func.EnvVars -split "," | ForEach-Object {
                $kv = $_ -split "="
                $envVarsJson[$kv[0]] = $kv[1]
            }
        }
        
        $envVarsString = ($envVarsJson | ConvertTo-Json -Compress)
        
        aws lambda create-function `
            --function-name $func.Name `
            --runtime $RUNTIME `
            --role $ROLE_ARN `
            --handler $func.Handler `
            --zip-file fileb://$($func.Zip) `
            --timeout $TIMEOUT `
            --environment "Variables=$envVarsString" `
            --region $REGION | Out-Null
    }
    
    Write-Host "  ✓ $($func.Name) deployed successfully" -ForegroundColor Green
    Write-Host ""
}

Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create API Gateway WebSocket API" -ForegroundColor White
Write-Host "2. Configure routes and integrations" -ForegroundColor White
Write-Host "3. Deploy API stage" -ForegroundColor White
