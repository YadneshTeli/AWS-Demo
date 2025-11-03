<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## AWS Free Tier Feasibility

**YES, this project is 100% doable on AWS Free Tier** and perfect for assessment submission. Here's the breakdown:[^1][^2]

### Free Tier Limits (12 Months for New Accounts)

**API Gateway WebSocket**: 1 million messages + 750,000 connection minutes per month. For a chat app with moderate testing, you'd need thousands of messages daily to exceed this.[^3][^1]

**AWS Lambda**: 1 million requests + 400,000 GB-seconds of compute per month (remains free even after 12 months). Each message triggers one Lambda invocation, so you can handle extensive testing.[^2][^4]

**DynamoDB**: 25 GB storage + 25 read/write capacity units per month (always free). Your chat messages and connections will use minimal storage unless you store millions of messages.[^5][^4]

**S3 (Frontend Hosting)**: 5 GB storage + 20,000 GET requests per month. Your HTML/CSS/JS files will be under 5 MB total.[^6]

**CloudWatch Logs**: 5 GB log ingestion per month. This is the main concern - Lambda generates logs by default, so configure log retention to 7 days to stay within limits.[^4][^5]

### Cost Protection Tips

Set up billing alerts immediately at \$1 and \$5 thresholds to monitor usage. Since new AWS customers now get up to \$200 in Free Tier credits (available for 6 months), you have extra buffer even if you slightly exceed limits. For assessment purposes with moderate testing (testing with 5-10 concurrent users for a few hours daily), you'll stay comfortably within free tier.[^1][^6][^4]

***

## Complete Execution Workflow

### Phase 1: AWS Account \& Environment Setup

**Step 1**: Create AWS account at aws.amazon.com/free and verify email/payment method (no charges for free tier usage)[^6]

**Step 2**: Install AWS CLI on your machine:

```bash
# Windows (using installer)
Download from: https://awscli.amazonaws.com/AWSCLIV2.msi

# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Step 3**: Configure AWS CLI with credentials:

```bash
aws configure
# Enter: Access Key ID
# Enter: Secret Access Key
# Enter: Default region (e.g., us-east-1)
# Enter: Default output format (json)
```

**Step 4**: Set up billing alerts in AWS Console:

- Navigate to Billing Dashboard → Budgets → Create Budget
- Set budget amount: \$5
- Configure email alerts at 50%, 80%, 100%


### Phase 2: Project Initialization

**Step 5**: Create project directory structure:

```bash
mkdir aws-chat-app
cd aws-chat-app

mkdir -p frontend lambda infrastructure

# Create files
touch frontend/index.html frontend/styles.css frontend/app.js
touch lambda/connect.py lambda/disconnect.py lambda/sendmessage.py lambda/default.py
touch infrastructure/cloudformation-template.yaml
touch README.md
```

**Step 6**: Initialize Git repository:

```bash
git init
git add .
git commit -m "Initial project structure"
```


### Phase 3: DynamoDB Tables Creation

**Step 7**: Create ActiveConnections table:

```bash
aws dynamodb create-table \
    --table-name ActiveConnections \
    --attribute-definitions AttributeName=connectionId,AttributeType=S \
    --key-schema AttributeName=connectionId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

**Step 8**: Create MessageHistory table:

```bash
aws dynamodb create-table \
    --table-name MessageHistory \
    --attribute-definitions \
        AttributeName=messageId,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=messageId,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

**Step 9**: Verify tables created:

```bash
aws dynamodb list-tables
aws dynamodb describe-table --table-name ActiveConnections
aws dynamodb describe-table --table-name MessageHistory
```


### Phase 4: Lambda Functions Development

**Step 10**: Create `lambda/connect.py`:

```python
import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME', 'ActiveConnections'))

def lambda_handler(event, context):
    connection_id = event['requestContext']['connectionId']
    
    try:
        table.put_item(
            Item={
                'connectionId': connection_id,
                'timestamp': str(context.get_remaining_time_in_millis())
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps('Connection established')
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
```

**Step 11**: Create `lambda/disconnect.py`:

```python
import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME', 'ActiveConnections'))

def lambda_handler(event, context):
    connection_id = event['requestContext']['connectionId']
    
    try:
        table.delete_item(
            Key={
                'connectionId': connection_id
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps('Disconnected')
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
```

**Step 12**: Create `lambda/sendmessage.py`:

```python
import json
import boto3
import os
from datetime import datetime
import uuid

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('TABLE_NAME', 'ActiveConnections'))
history_table = dynamodb.Table(os.environ.get('HISTORY_TABLE_NAME', 'MessageHistory'))

def lambda_handler(event, context):
    connection_id = event['requestContext']['connectionId']
    domain_name = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    
    # Parse message
    body = json.loads(event.get('body', '{}'))
    message = body.get('message', '')
    
    if not message:
        return {'statusCode': 400, 'body': 'Message is required'}
    
    # Save to history
    message_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    try:
        history_table.put_item(
            Item={
                'messageId': message_id,
                'timestamp': timestamp,
                'connectionId': connection_id,
                'message': message
            }
        )
        
        # Get all connections
        response = connections_table.scan()
        connections = response.get('Items', [])
        
        # Broadcast to all connections
        apigw_management = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=f'https://{domain_name}/{stage}'
        )
        
        formatted_message = json.dumps({
            'timestamp': timestamp,
            'message': message,
            'connectionId': connection_id
        })
        
        for conn in connections:
            try:
                apigw_management.post_to_connection(
                    Data=formatted_message,
                    ConnectionId=conn['connectionId']
                )
            except apigw_management.exceptions.GoneException:
                # Connection is stale, remove it
                connections_table.delete_item(
                    Key={'connectionId': conn['connectionId']}
                )
            except Exception as e:
                print(f"Error sending to {conn['connectionId']}: {e}")
        
        return {
            'statusCode': 200,
            'body': json.dumps('Message sent')
        }
        
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
```

**Step 13**: Create `lambda/default.py`:

```python
import json
import boto3

def lambda_handler(event, context):
    connection_id = event['requestContext']['connectionId']
    domain_name = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    
    apigw_management = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=f'https://{domain_name}/{stage}'
    )
    
    try:
        apigw_management.post_to_connection(
            Data=json.dumps({'error': 'Invalid request'}),
            ConnectionId=connection_id
        )
    except Exception as e:
        print(f"Error: {e}")
    
    return {
        'statusCode': 200,
        'body': json.dumps('Default route')
    }
```

**Step 14**: Package Lambda functions:

```bash
cd lambda

# Create deployment packages
zip connect.zip connect.py
zip disconnect.zip disconnect.py
zip sendmessage.zip sendmessage.py
zip default.zip default.py

cd ..
```


### Phase 5: IAM Role Creation

**Step 15**: Create IAM role for Lambda:

```bash
# Create trust policy file
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
    --role-name ChatAppLambdaRole \
    --assume-role-policy-document file://trust-policy.json
```

**Step 16**: Attach policies to IAM role:

```bash
# Attach AWS managed policy for Lambda basic execution
aws iam attach-role-policy \
    --role-name ChatAppLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create custom policy for DynamoDB and API Gateway
cat > lambda-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:GetItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/ActiveConnections",
        "arn:aws:dynamodb:us-east-1:*:table/MessageHistory"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "execute-api:ManageConnections"
      ],
      "Resource": "arn:aws:execute-api:us-east-1:*:*/*/*/*"
    }
  ]
}
EOF

# Create and attach custom policy
aws iam create-policy \
    --policy-name ChatAppLambdaPolicy \
    --policy-document file://lambda-policy.json

# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Attach custom policy
aws iam attach-role-policy \
    --role-name ChatAppLambdaRole \
    --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/ChatAppLambdaPolicy
```


### Phase 6: Lambda Functions Deployment

**Step 17**: Create Connect Lambda function:

```bash
aws lambda create-function \
    --function-name ChatAppConnect \
    --runtime python3.9 \
    --role arn:aws:iam::${ACCOUNT_ID}:role/ChatAppLambdaRole \
    --handler connect.lambda_handler \
    --zip-file fileb://lambda/connect.zip \
    --timeout 30 \
    --environment Variables={TABLE_NAME=ActiveConnections}
```

**Step 18**: Create Disconnect Lambda function:

```bash
aws lambda create-function \
    --function-name ChatAppDisconnect \
    --runtime python3.9 \
    --role arn:aws:iam::${ACCOUNT_ID}:role/ChatAppLambdaRole \
    --handler disconnect.lambda_handler \
    --zip-file fileb://lambda/disconnect.zip \
    --timeout 30 \
    --environment Variables={TABLE_NAME=ActiveConnections}
```

**Step 19**: Create SendMessage Lambda function:

```bash
aws lambda create-function \
    --function-name ChatAppSendMessage \
    --runtime python3.9 \
    --role arn:aws:iam::${ACCOUNT_ID}:role/ChatAppLambdaRole \
    --handler sendmessage.lambda_handler \
    --zip-file fileb://lambda/sendmessage.zip \
    --timeout 30 \
    --environment Variables={TABLE_NAME=ActiveConnections,HISTORY_TABLE_NAME=MessageHistory}
```

**Step 20**: Create Default Lambda function:

```bash
aws lambda create-function \
    --function-name ChatAppDefault \
    --runtime python3.9 \
    --role arn:aws:iam::${ACCOUNT_ID}:role/ChatAppLambdaRole \
    --handler default.lambda_handler \
    --zip-file fileb://lambda/default.zip \
    --timeout 30
```

**Step 21**: Verify Lambda functions created:

```bash
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `ChatApp`)].FunctionName'
```


### Phase 7: API Gateway WebSocket API Creation

**Step 22**: Create WebSocket API:

```bash
aws apigatewayv2 create-api \
    --name ChatAppWebSocket \
    --protocol-type WEBSOCKET \
    --route-selection-expression '$request.body.action'
```

**Step 23**: Get API ID (save this for later steps):

```bash
API_ID=$(aws apigatewayv2 get-apis --query 'Items[?Name==`ChatAppWebSocket`].ApiId' --output text)
echo "API ID: $API_ID"
```

**Step 24**: Create Lambda integrations:

```bash
# Connect integration
CONNECT_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ChatAppConnect \
    --query 'IntegrationId' --output text)

# Disconnect integration
DISCONNECT_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ChatAppDisconnect \
    --query 'IntegrationId' --output text)

# SendMessage integration
SENDMESSAGE_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ChatAppSendMessage \
    --query 'IntegrationId' --output text)

# Default integration
DEFAULT_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ChatAppDefault \
    --query 'IntegrationId' --output text)
```

**Step 25**: Create routes:

```bash
# $connect route
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key '$connect' \
    --target integrations/$CONNECT_INTEGRATION_ID

# $disconnect route
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key '$disconnect' \
    --target integrations/$DISCONNECT_INTEGRATION_ID

# sendmessage route
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'sendmessage' \
    --target integrations/$SENDMESSAGE_INTEGRATION_ID

# $default route
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key '$default' \
    --target integrations/$DEFAULT_INTEGRATION_ID
```

**Step 26**: Grant API Gateway permission to invoke Lambda functions:

```bash
# Connect permission
aws lambda add-permission \
    --function-name ChatAppConnect \
    --statement-id apigateway-connect \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:${API_ID}/*"

# Disconnect permission
aws lambda add-permission \
    --function-name ChatAppDisconnect \
    --statement-id apigateway-disconnect \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:${API_ID}/*"

# SendMessage permission
aws lambda add-permission \
    --function-name ChatAppSendMessage \
    --statement-id apigateway-sendmessage \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:${API_ID}/*"

# Default permission
aws lambda add-permission \
    --function-name ChatAppDefault \
    --statement-id apigateway-default \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:${API_ID}/*"
```

**Step 27**: Create deployment stage:

```bash
aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name production \
    --auto-deploy
```

**Step 28**: Get WebSocket URL:

```bash
WEBSOCKET_URL="wss://${API_ID}.execute-api.us-east-1.amazonaws.com/production"
echo "WebSocket URL: $WEBSOCKET_URL"
# Save this URL - you'll need it for frontend
```


### Phase 8: Frontend Development

**Step 29**: Create `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AWS Serverless Chat App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>AWS Serverless Chat Application</h1>
            <p class="subtitle">Real-time messaging powered by WebSocket API, Lambda & DynamoDB</p>
        </header>
        
        <main>
            <section class="connection-section">
                <div class="input-group">
                    <label for="websocketUrl">WebSocket URL:</label>
                    <input type="text" id="websocketUrl" 
                           placeholder="wss://your-api-id.execute-api.region.amazonaws.com/production">
                </div>
                
                <div class="button-group">
                    <button id="connectBtn" class="btn btn-primary">Connect</button>
                    <button id="disconnectBtn" class="btn btn-danger" disabled>Disconnect</button>
                </div>
                
                <div id="status" class="status disconnected">
                    <span class="status-dot"></span>
                    <span class="status-text">Disconnected</span>
                </div>
            </section>
            
            <section class="chat-section">
                <div id="chatMessages" class="messages-container"></div>
                
                <div class="input-group">
                    <input type="text" id="messageInput" 
                           placeholder="Type your message..." 
                           disabled>
                    <button id="sendBtn" class="btn btn-primary" disabled>Send</button>
                </div>
            </section>
        </main>
        
        <footer>
            <p>Built with AWS Lambda, API Gateway WebSocket, DynamoDB</p>
        </footer>
    </div>
    
    <script src="app.js"></script>
</body>
</html>
```

**Step 30**: Create `frontend/styles.css`:

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.container {
    background: white;
    border-radius: 15px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 800px;
    width: 100%;
    overflow: hidden;
}

header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    text-align: center;
}

header h1 {
    font-size: 2rem;
    margin-bottom: 10px;
}

.subtitle {
    font-size: 0.9rem;
    opacity: 0.9;
}

main {
    padding: 30px;
}

.connection-section {
    margin-bottom: 30px;
    padding-bottom: 30px;
    border-bottom: 2px solid #eee;
}

.input-group {
    margin-bottom: 15px;
}

.input-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
}

.input-group input[type="text"] {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s;
}

.input-group input[type="text"]:focus {
    outline: none;
    border-color: #667eea;
}

.button-group {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-danger {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
}

.btn-danger:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(245, 87, 108, 0.4);
}

.status {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 600;
}

.status.connected {
    background: #d4edda;
    color: #155724;
}

.status.disconnected {
    background: #f8d7da;
    color: #721c24;
}

.status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
}

.status.connected .status-dot {
    background: #28a745;
    animation: pulse 2s infinite;
}

.status.disconnected .status-dot {
    background: #dc3545;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.chat-section {
    margin-top: 30px;
}

.messages-container {
    height: 400px;
    overflow-y: auto;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 15px;
    background: #f9f9f9;
}

.message {
    background: white;
    padding: 12px 15px;
    margin-bottom: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.message-time {
    font-size: 0.75rem;
    color: #888;
    margin-bottom: 5px;
}

.message-content {
    font-size: 0.95rem;
    color: #333;
    word-wrap: break-word;
}

.messages-container::-webkit-scrollbar {
    width: 8px;
}

.messages-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}

.messages-container::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 10px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
    background: #555;
}

.chat-section .input-group {
    display: flex;
    gap: 10px;
}

.chat-section .input-group input {
    flex: 1;
}

.chat-section .input-group button {
    width: auto;
}

footer {
    background: #f8f9fa;
    padding: 20px;
    text-align: center;
    color: #666;
    font-size: 0.9rem;
}

@media (max-width: 600px) {
    header h1 {
        font-size: 1.5rem;
    }
    
    .subtitle {
        font-size: 0.8rem;
    }
    
    main {
        padding: 20px;
    }
    
    .messages-container {
        height: 300px;
    }
    
    .button-group {
        flex-direction: column;
    }
    
    .btn {
        width: 100%;
    }
}
```

**Step 31**: Create `frontend/app.js`:

```javascript
let ws = null;
let heartbeatInterval = null;

// DOM elements
const websocketUrlInput = document.getElementById('websocketUrl');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const statusElement = document.getElementById('status');
const statusText = statusElement.querySelector('.status-text');

// Load saved WebSocket URL from localStorage
window.addEventListener('DOMContentLoaded', () => {
    const savedUrl = localStorage.getItem('websocketUrl');
    if (savedUrl) {
        websocketUrlInput.value = savedUrl;
    }
});

// Connect button handler
connectBtn.addEventListener('click', connect);

// Disconnect button handler
disconnectBtn.addEventListener('click', disconnect);

// Send button handler
sendBtn.addEventListener('click', sendMessage);

// Enter key to send message
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !messageInput.disabled) {
        sendMessage();
    }
});

function connect() {
    const url = websocketUrlInput.value.trim();
    
    if (!url) {
        alert('Please enter WebSocket URL');
        return;
    }
    
    if (!url.startsWith('wss://')) {
        alert('WebSocket URL must start with wss://');
        return;
    }
    
    // Save URL to localStorage
    localStorage.setItem('websocketUrl', url);
    
    // Create WebSocket connection
    ws = new WebSocket(url);
    
    ws.onopen = () => {
        console.log('Connected to WebSocket');
        updateStatus(true);
        displaySystemMessage('Connected to chat server');
        
        // Enable message input and send button
        messageInput.disabled = false;
        sendBtn.disabled = false;
        
        // Disable connect button, enable disconnect button
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        websocketUrlInput.disabled = true;
        
        // Start heartbeat
        startHeartbeat();
    };
    
    ws.onmessage = (event) => {
        console.log('Message received:', event.data);
        
        try {
            const data = JSON.parse(event.data);
            displayMessage(data);
        } catch (e) {
            displaySystemMessage(event.data);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        displaySystemMessage('Connection error occurred');
    };
    
    ws.onclose = () => {
        console.log('Disconnected from WebSocket');
        updateStatus(false);
        displaySystemMessage('Disconnected from chat server');
        
        // Disable message input and send button
        messageInput.disabled = true;
        sendBtn.disabled = true;
        
        // Enable connect button, disable disconnect button
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        websocketUrlInput.disabled = false;
        
        // Stop heartbeat
        stopHeartbeat();
        
        ws = null;
    };
}

function disconnect() {
    if (ws) {
        ws.close();
    }
}

function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected to server');
        return;
    }
    
    // Send message
    const payload = {
        action: 'sendmessage',
        message: message
    };
    
    ws.send(JSON.stringify(payload));
    
    // Clear input
    messageInput.value = '';
    messageInput.focus();
}

function displayMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    
    if (data.timestamp) {
        const date = new Date(data.timestamp);
        timeDiv.textContent = date.toLocaleString();
    } else {
        timeDiv.textContent = new Date().toLocaleString();
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (data.connectionId) {
        contentDiv.textContent = `[${data.connectionId.substring(0, 8)}...] ${data.message}`;
    } else {
        contentDiv.textContent = data.message || JSON.stringify(data);
    }
    
    messageDiv.appendChild(timeDiv);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function displaySystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.style.background = '#e9ecef';
    messageDiv.style.fontStyle = 'italic';
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleString();
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = `[System] ${message}`;
    
    messageDiv.appendChild(timeDiv);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateStatus(connected) {
    if (connected) {
        statusElement.classList.remove('disconnected');
        statusElement.classList.add('connected');
        statusText.textContent = 'Connected';
    } else {
        statusElement.classList.remove('connected');
        statusElement.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
    }
}

function startHeartbeat() {
    // Send ping every 5 minutes to keep connection alive
    heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
            console.log('Heartbeat sent');
        }
    }, 5 * 60 * 1000);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}
```


### Phase 9: Frontend Deployment

**Step 32**: Create S3 bucket for frontend hosting:

```bash
BUCKET_NAME="aws-chat-app-frontend-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region us-east-1
```

**Step 33**: Configure bucket for static website hosting:

```bash
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html
```

**Step 34**: Create bucket policy for public access:

```bash
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
```

**Step 35**: Upload frontend files to S3:

```bash
aws s3 sync frontend/ s3://$BUCKET_NAME --acl public-read
```

**Step 36**: Get S3 website URL:

```bash
echo "Frontend URL: http://${BUCKET_NAME}.s3-website-us-east-1.amazonaws.com"
```


### Phase 10: Testing \& Verification

**Step 37**: Test WebSocket connection using wscat:

```bash
# Install wscat (if not installed)
npm install -g wscat

# Test connection (replace with your API ID)
wscat -c wss://${API_ID}.execute-api.us-east-1.amazonaws.com/production

# After connection, send test message:
# {"action":"sendmessage","message":"Hello from wscat"}
```

**Step 38**: Test with frontend:

- Open the S3 website URL in your browser
- Paste WebSocket URL in the input field
- Click "Connect"
- Open another browser tab/window with same URL
- Send messages between both tabs to verify broadcasting

**Step 39**: Verify DynamoDB tables have data:

```bash
# Check active connections
aws dynamodb scan --table-name ActiveConnections

# Check message history
aws dynamodb scan --table-name MessageHistory
```

**Step 40**: Check Lambda function logs:

```bash
# View recent logs for each function
aws logs tail /aws/lambda/ChatAppConnect --since 10m --follow
aws logs tail /aws/lambda/ChatAppSendMessage --since 10m --follow
```


### Phase 11: Documentation for Assessment Submission

**Step 41**: Create comprehensive README.md:

```markdown
# AWS Serverless Real-Time Chat Application

## Project Overview
A fully serverless real-time chat application built using AWS services including API Gateway WebSocket API, Lambda, and DynamoDB.

## Architecture
- **Frontend**: HTML, CSS, JavaScript (hosted on S3)
- **API**: API Gateway WebSocket API
- **Backend**: AWS Lambda (Python 3.9)
- **Database**: Amazon DynamoDB (2 tables)
- **IAM**: Custom roles and policies

## AWS Services Used
1. API Gateway WebSocket API - Real-time bidirectional communication
2. AWS Lambda - Serverless compute for handling messages
3. Amazon DynamoDB - NoSQL database for connections and message history
4. Amazon S3 - Static website hosting
5. AWS IAM - Access control and permissions
6. CloudWatch Logs - Monitoring and debugging

## Deployment Details
- **WebSocket API ID**: [Your API ID]
- **WebSocket URL**: wss://[api-id].execute-api.us-east-1.amazonaws.com/production
- **Frontend URL**: http://[bucket-name].s3-website-us-east-1.amazonaws.com
- **Region**: us-east-1

## Features
- Real-time message broadcasting to all connected clients
- Connection state management
- Message persistence in DynamoDB
- Auto-scrolling chat interface
- Responsive design for mobile devices
- Heartbeat mechanism to maintain connections

## Database Schema
### ActiveConnections Table
- Partition Key: connectionId (String)
- Attributes: timestamp

### MessageHistory Table
- Partition Key: messageId (String)
- Sort Key: timestamp (String)
- Attributes: connectionId, message

## Testing Instructions
1. Open frontend URL in browser
2. Enter WebSocket URL
3. Click "Connect"
4. Open same URL in another tab
5. Send messages between tabs
6. Verify messages appear in both tabs instantly

## Cost Analysis (Free Tier)
- API Gateway: Within 1M messages/month limit
- Lambda: Within 1M requests/month limit
- DynamoDB: Within 25GB storage limit
- S3: Within 5GB storage limit
- **Total Cost**: $0.00 (within Free Tier limits)

## Future Enhancements
- Add Amazon Cognito for user authentication
- Implement private chat rooms
- Add message delivery status
- Integrate with SNS for notifications
- Add file sharing capability
```

**Step 42**: Take screenshots for documentation:

- Architecture diagram (create using draw.io or Lucidchart)
- AWS Console showing DynamoDB tables
- AWS Console showing Lambda functions
- AWS Console showing API Gateway routes
- Frontend interface showing connection status
- Chat messages being exchanged between two tabs
- CloudWatch logs showing Lambda execution

**Step 43**: Create project presentation document with:

- Problem statement and objectives
- Architecture overview
- Implementation details
- Testing results
- Challenges faced and solutions
- Conclusion and learning outcomes


### Phase 12: Version Control \& Submission Preparation

**Step 44**: Commit all code to Git:

```bash
git add .
git commit -m "Complete AWS serverless chat application"
```

**Step 45**: Push to GitHub:

```bash
# Create new repository on GitHub
# Then push
git remote add origin https://github.com/yourusername/aws-chat-app.git
git branch -M main
git push -u origin main
```

**Step 46**: Create GitHub README with:

- Project title and description
- Architecture diagram
- Setup instructions
- WebSocket URL and Frontend URL
- Screenshots
- Technologies used
- Future enhancements

**Step 47**: Document all AWS resource ARNs for assessment:

```bash
# Create a file with all resource details
cat > aws-resources.txt << EOF
Project: AWS Serverless Chat Application
Date: $(date)

DynamoDB Tables:
- ActiveConnections: arn:aws:dynamodb:us-east-1:${ACCOUNT_ID}:table/ActiveConnections
- MessageHistory: arn:aws:dynamodb:us-east-1:${ACCOUNT_ID}:table/MessageHistory

Lambda Functions:
- ChatAppConnect: arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ChatAppConnect
- ChatAppDisconnect: arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ChatAppDisconnect
- ChatAppSendMessage: arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ChatAppSendMessage
- ChatAppDefault: arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ChatAppDefault

API Gateway:
- API ID: ${API_ID}
- WebSocket URL: wss://${API_ID}.execute-api.us-east-1.amazonaws.com/production

S3 Bucket:
- Bucket Name: ${BUCKET_NAME}
- Website URL: http://${BUCKET_NAME}.s3-website-us-east-1.amazonaws.com

IAM Role:
- Role Name: ChatAppLambdaRole
- Role ARN: arn:aws:iam::${ACCOUNT_ID}:role/ChatAppLambdaRole
EOF
```

**Step 48**: Create a video demonstration (2-3 minutes) showing:

- AWS Console with all deployed resources
- Opening frontend in two browser tabs
- Connecting to WebSocket
- Sending and receiving messages in real-time
- Showing DynamoDB table content
- Showing CloudWatch logs

Your AWS Serverless Chat Application is now complete and ready for assessment submission. All resources remain deployed on AWS for evaluation.[^7][^8][^9][^2][^1]
<span style="display:none">[^10][^11][^12][^13]</span>

<div align="center">⁂</div>

[^1]: https://aws.amazon.com/api-gateway/pricing/

[^2]: https://aws.amazon.com/lambda/pricing/

[^3]: https://www.stormit.cloud/blog/amazon-api-gateway-pricing/

[^4]: https://www.reddit.com/r/aws/comments/hughfl/question_about_free_tier_for_aws_lambda/

[^5]: https://www.cloudoptimo.com/blog/aws-free-tier-isnt-unlimited-know-the-limits-before-you-get-billed/

[^6]: https://aws.amazon.com/free/

[^7]: https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-chat-app.html

[^8]: https://blog.devops.dev/building-a-serverless-chat-app-using-api-gateway-websocket-api-and-python-lambda-ebabcb8310ab

[^9]: https://github.com/aws-samples/serverless-websocket-chat

[^10]: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html

[^11]: https://www.amazonaws.cn/en/api-gateway/pricing/

[^12]: https://www.w3schools.com/aws/aws_cloudessentials_ps_freetier.php

[^13]: https://aws.amazon.com/about-aws/whats-new/2015/05/aws-educate-students-and-educators-can-access-aws-technology-cloud-courses-training-and-collaboration-tools/

