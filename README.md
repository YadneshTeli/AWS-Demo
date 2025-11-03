# AWS Serverless Real-Time Chat Application 💬

A fully serverless, real-time chat application built with AWS services, featuring WebSocket communication, modern UI with Tailwind CSS, and scalable architecture.

## 🌐 Live Demo

**Frontend URL:** http://aws-chat-app-yadnesh-2025.s3-website.ap-south-1.amazonaws.com  
**WebSocket API:** wss://0k6ooykme9.execute-api.ap-south-1.amazonaws.com/production

## 📋 Project Overview

This project demonstrates a **production-ready serverless chat application** built entirely on AWS Free Tier services. It showcases modern cloud architecture patterns, real-time communication using WebSocket technology, and serverless best practices.

**What Makes This Special:**
- Zero infrastructure management - fully serverless architecture
- Real-time bidirectional communication with WebSocket API
- Automatic scaling from 0 to thousands of concurrent users
- Message persistence with NoSQL database
- Beautiful, responsive UI with modern design principles
- Complete infrastructure as code approach
- Comprehensive monitoring and logging

Users can connect from multiple browsers, devices, or locations simultaneously and chat in real-time with instant message broadcasting to all connected clients. Every message is persisted to DynamoDB for future retrieval, and all connections are tracked for reliable message delivery.

### ✨ Key Features

- ✅ **Real-time messaging** - Instant message broadcasting to all connected clients
- ✅ **Multi-user support** - Color-coded users (6 unique color schemes)
- ✅ **Message persistence** - All messages saved to DynamoDB
- ✅ **Connection tracking** - Active connections monitored in real-time
- ✅ **Modern UI** - Beautiful Tailwind CSS design with shadcn/ui principles
- ✅ **Auto-reconnect** - WebSocket heartbeat mechanism (ping every 5 minutes)
- ✅ **Responsive design** - Works on desktop, tablet, and mobile
- ✅ **100% Serverless** - No servers to manage, scales automatically

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ WebSocket (wss://)
       ▼
┌─────────────────────────────────┐
│  API Gateway (WebSocket API)    │
│  - $connect route               │
│  - $disconnect route            │
│  - sendmessage route            │
│  - $default route               │
└────────┬────────────────────────┘
         │ Triggers
         ▼
┌─────────────────────────────────┐
│      AWS Lambda Functions       │
│  - ChatAppConnect               │
│  - ChatAppDisconnect            │
│  - ChatAppSendMessage           │
│  - ChatAppDefault               │
└────────┬────────────────────────┘
         │ Read/Write
         ▼
┌─────────────────────────────────┐
│         DynamoDB Tables         │
│  - ActiveConnections            │
│  - MessageHistory               │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│      S3 Static Hosting          │
│  - index.html                   │
│  - app.js                       │
└─────────────────────────────────┘
```

### Detailed Component Flow

**1. User Connection Flow:**
- User opens the application in a browser
- Frontend establishes WebSocket connection to API Gateway
- API Gateway triggers `ChatAppConnect` Lambda function
- Lambda saves connection ID to `ActiveConnections` DynamoDB table
- Connection is now active and ready to send/receive messages

**2. Message Broadcasting Flow:**
- User types a message and clicks "Send"
- Frontend sends message with action `sendmessage` via WebSocket
- API Gateway routes to `ChatAppSendMessage` Lambda function
- Lambda performs the following:
  - Saves message to `MessageHistory` table with UUID and timestamp
  - Scans `ActiveConnections` table to get all connected clients
  - Broadcasts message to all connections using API Gateway Management API
  - Removes any stale connections that fail to receive the message
- All connected clients receive the message instantly and display it

**3. Disconnection Flow:**
- User closes browser or clicks "Disconnect"
- API Gateway detects disconnection
- Triggers `ChatAppDisconnect` Lambda function
- Lambda removes connection ID from `ActiveConnections` table
- Connection is cleaned up and resources are freed

**4. Error Handling Flow:**
- Invalid message format triggers `ChatAppDefault` Lambda
- Returns error message to the specific client
- CloudWatch logs capture all errors for debugging
- Stale connections are automatically cleaned during broadcasts

## 🛠️ AWS Services Used

| Service | Purpose | Configuration | Why This Service? |
|---------|---------|---------------|-------------------|
| **API Gateway (WebSocket)** | Real-time bidirectional communication | 4 routes ($connect, $disconnect, sendmessage, $default), production stage with auto-deploy | Enables persistent WebSocket connections for real-time messaging without managing servers |
| **Lambda** | Serverless compute for message handling | Python 3.9, 30s timeout, 128MB memory, 4 functions | Pay-per-execution model, automatic scaling, no server management |
| **DynamoDB** | NoSQL database for connections & messages | PAY_PER_REQUEST billing, 2 tables, single-digit millisecond latency | Serverless, auto-scaling NoSQL database perfect for real-time applications |
| **S3** | Static website hosting for frontend | Public read access via bucket policy, website hosting enabled | Cost-effective, highly available static content hosting |
| **IAM** | Security and access management | ChatAppLambdaRole with custom policies | Secure access control following least privilege principle |
| **CloudWatch Logs** | Logging and monitoring | 7-day retention, separate log groups per Lambda | Centralized logging for debugging and monitoring |

### Detailed Service Breakdown

#### API Gateway WebSocket API
- **API ID:** 0k6ooykme9
- **Endpoint:** wss://0k6ooykme9.execute-api.ap-south-1.amazonaws.com
- **Stage:** production (with auto-deploy enabled)
- **Route Selection:** `$request.body.action` (routes based on message action)
- **Routes:**
  - `$connect` → ChatAppConnect Lambda (handles new connections)
  - `$disconnect` → ChatAppDisconnect Lambda (handles disconnections)
  - `sendmessage` → ChatAppSendMessage Lambda (handles message broadcasting)
  - `$default` → ChatAppDefault Lambda (handles invalid routes)
- **Integration Type:** Lambda Proxy Integration (passes full request/response)

#### Lambda Functions
1. **ChatAppConnect** (connect.py)
   - Runtime: Python 3.9
   - Memory: 128 MB
   - Timeout: 30 seconds
   - Environment Variables: `TABLE_NAME=ActiveConnections`
   - Purpose: Saves new connection IDs to DynamoDB
   - Average Execution Time: ~250ms

2. **ChatAppDisconnect** (disconnect.py)
   - Runtime: Python 3.9
   - Memory: 128 MB
   - Timeout: 30 seconds
   - Environment Variables: `TABLE_NAME=ActiveConnections`
   - Purpose: Removes disconnected clients from DynamoDB
   - Average Execution Time: ~200ms

3. **ChatAppSendMessage** (sendmessage.py)
   - Runtime: Python 3.9
   - Memory: 128 MB
   - Timeout: 30 seconds
   - Environment Variables: `TABLE_NAME=ActiveConnections`, `HISTORY_TABLE_NAME=MessageHistory`
   - Purpose: Broadcasts messages to all connected clients and saves to history
   - Average Execution Time: ~500ms (scales with number of connections)

4. **ChatAppDefault** (default.py)
   - Runtime: Python 3.9
   - Memory: 128 MB
   - Timeout: 30 seconds
   - Purpose: Handles invalid routes and returns error messages
   - Average Execution Time: ~100ms

#### DynamoDB Tables
1. **ActiveConnections**
   - Billing Mode: PAY_PER_REQUEST (on-demand)
   - Primary Key: connectionId (String)
   - Attributes: timestamp, connectedAt
   - Average Item Size: ~100 bytes
   - Purpose: Track all active WebSocket connections

2. **MessageHistory**
   - Billing Mode: PAY_PER_REQUEST (on-demand)
   - Primary Key: messageId (String)
   - Sort Key: timestamp (String)
   - Attributes: connectionId, message
   - Average Item Size: ~200 bytes
   - Purpose: Store all chat messages permanently

#### S3 Bucket
- **Bucket Name:** aws-chat-app-yadnesh-2025
- **Region:** ap-south-1
- **Website Hosting:** Enabled (index.html as index document)
- **Public Access:** Enabled via bucket policy (GET requests only)
- **Files:**
  - index.html (9.6 KB) - Main UI
  - app.js (12.3 KB) - WebSocket client logic

## 📊 Database Schema

### ActiveConnections Table

**Purpose:** Track all active WebSocket connections for message broadcasting

**Schema:**
```json
{
  "connectionId": "Te8Cse4R=",           // Primary Key (String) - WebSocket connection ID
  "timestamp": "2025-11-03T20:15:30Z",  // ISO 8601 timestamp
  "connectedAt": 1699040130             // Unix timestamp (seconds since epoch)
}
```

**Key Characteristics:**
- Primary Key: `connectionId` (String, 16 characters)
- No Sort Key
- On-Demand Billing: Automatically scales read/write capacity
- TTL: Not configured (manual cleanup via disconnect Lambda)
- Average Item Size: ~100 bytes
- Typical Record Count: 0-100 (scales with concurrent users)

**Access Patterns:**
- **PutItem:** When new user connects (via ChatAppConnect)
- **DeleteItem:** When user disconnects (via ChatAppDisconnect)
- **Scan:** When broadcasting messages (via ChatAppSendMessage)
- **GetItem:** Not used in current implementation

**Example Item:**
```json
{
  "connectionId": {
    "S": "Te8Cse4RCEG="
  },
  "timestamp": {
    "S": "2025-11-03T20:15:30.123456"
  },
  "connectedAt": {
    "N": "1699040130"
  }
}
```

### MessageHistory Table

**Purpose:** Persist all chat messages for future retrieval and audit

**Schema:**
```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",  // Primary Key (UUID)
  "timestamp": "2025-11-03T20:15:30.123456Z",           // Sort Key (ISO 8601)
  "connectionId": "Te8Cse4R=",                          // Sender's connection ID
  "message": "Hello, World!"                            // Message content
}
```

**Key Characteristics:**
- Primary Key: `messageId` (String, UUID format)
- Sort Key: `timestamp` (String, ISO 8601 format with microseconds)
- On-Demand Billing: Automatically scales read/write capacity
- TTL: Not configured (permanent storage)
- Average Item Size: ~200 bytes
- Typical Record Count: Grows indefinitely (prune periodically if needed)

**Access Patterns:**
- **PutItem:** When message is sent (via ChatAppSendMessage)
- **Query:** Not used in current implementation (could add for history retrieval)
- **Scan:** Could be used for full message history (not implemented)

**Example Item:**
```json
{
  "messageId": {
    "S": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": {
    "S": "2025-11-03T20:15:30.123456"
  },
  "connectionId": {
    "S": "Te8Cse4RCEG="
  },
  "message": {
    "S": "Hello from the serverless chat!"
  }
}
```

**Potential Enhancements:**
- Add GSI (Global Secondary Index) on `connectionId` to query messages by user
- Add GSI on `timestamp` for time-based queries
- Implement TTL for automatic message expiration after X days
- Add `username` attribute for better user identification
- Add `roomId` attribute for multi-room chat support

## 💰 Cost Analysis (AWS Free Tier)

### Monthly Free Tier Limits

| Service | Free Tier Limit | Current Usage (Est.) | Usage % | Monthly Cost |
|---------|----------------|----------------------|---------|--------------|
| **Lambda Requests** | 1M requests/month | ~500 requests | 0.05% | $0.00 |
| **Lambda Duration** | 400K GB-seconds | ~50 GB-seconds | 0.01% | $0.00 |
| **DynamoDB Writes** | 25 WCU (2.5M writes) | ~100 writes | 0.004% | $0.00 |
| **DynamoDB Reads** | 25 RCU (2.5M reads) | ~200 reads | 0.008% | $0.00 |
| **DynamoDB Storage** | 25 GB | <0.01 GB | 0.0004% | $0.00 |
| **API Gateway Messages** | 1M messages | ~500 messages | 0.05% | $0.00 |
| **S3 Storage** | 5 GB | 0.025 GB | 0.5% | $0.00 |
| **S3 GET Requests** | 20K requests | ~50 requests | 0.25% | $0.00 |
| **CloudWatch Logs** | 5 GB ingestion | ~0.1 GB | 2% | $0.00 |
| **CloudWatch Log Storage** | 5 GB storage | ~0.01 GB | 0.2% | $0.00 |
| **Data Transfer Out** | 100 GB/month | ~0.05 GB | 0.05% | $0.00 |
| **TOTAL** | | | | **$0.00** |

### Cost Breakdown Details

#### Lambda Costs
- **Requests:** First 1M requests/month free
  - After free tier: $0.20 per 1M requests
  - Current usage: ~500 requests (4 functions × ~125 invocations)
  
- **Duration:** First 400K GB-seconds free
  - After free tier: $0.0000166667 per GB-second
  - Current usage: ~50 GB-seconds (128MB × 30s avg × 500 invocations)

#### DynamoDB Costs
- **On-Demand Pricing (PAY_PER_REQUEST):**
  - Reads: First 2.5M reads/month free (25 RCU)
  - Writes: First 2.5M writes/month free (25 WCU)
  - Storage: First 25 GB free
  - After free tier: $0.25 per 1M writes, $0.25 per 1M reads
  
- **Current Usage:**
  - ~100 writes/month (messages + connections)
  - ~200 reads/month (scanning connections, reading messages)
  - <0.01 GB storage (26 messages × ~200 bytes)

#### API Gateway WebSocket Costs
- **Messages:** First 1M messages/month free
  - After free tier: $1.00 per 1M messages
  - Message = connection + message sent/received
  - Current usage: ~500 messages/month

#### S3 Costs
- **Storage:** First 5 GB free
  - After free tier: $0.023 per GB/month
  - Current usage: 0.025 GB (25 KB total for 2 files)
  
- **Requests:**
  - GET: First 20K free, then $0.0004 per 1K requests
  - PUT: First 2K free, then $0.005 per 1K requests
  - Current usage: ~50 GET requests/month

#### CloudWatch Costs
- **Log Ingestion:** First 5 GB free
  - After free tier: $0.50 per GB
  - Current usage: ~0.1 GB/month (Lambda logs)
  
- **Log Storage:** First 5 GB free
  - After free tier: $0.03 per GB/month
  - Current usage: ~0.01 GB (7-day retention)

### Scaling Cost Projections

**At 100 active users (moderate usage):**
- Lambda: Still within free tier (~10K requests/month)
- DynamoDB: Still within free tier (~5K operations/month)
- API Gateway: Still within free tier (~20K messages/month)
- **Estimated Cost: $0.00/month**

**At 1,000 active users (high usage):**
- Lambda: ~100K requests ($0.00 - still within free tier)
- DynamoDB: ~50K operations ($0.00 - still within free tier)
- API Gateway: ~200K messages ($0.00 - still within free tier)
- **Estimated Cost: $0.00/month**

**At 10,000 active users (very high usage):**
- Lambda: ~1M requests ($0.00 - at free tier limit)
- DynamoDB: ~500K operations ($0.00 - still within free tier)
- API Gateway: ~2M messages (~$1.00 - exceeds free tier)
- **Estimated Cost: ~$1.00/month**

### Cost Optimization Tips

1. **DynamoDB:**
   - Use PAY_PER_REQUEST for unpredictable traffic
   - Implement message TTL to auto-delete old messages
   - Consider switching to Provisioned mode if traffic is consistent

2. **Lambda:**
   - Current 128MB memory is optimal for these functions
   - 30s timeout is safe but could be reduced to 10s for cost savings
   - Cold starts are acceptable for chat app use case

3. **CloudWatch:**
   - 7-day log retention balances debugging needs and costs
   - Consider reducing to 3 days if costs become a concern
   - Use log insights for efficient querying

4. **S3:**
   - Static files rarely change, enabling efficient caching
   - Consider CloudFront CDN for better performance (adds cost)

**Conclusion:** This application is designed to stay within AWS Free Tier indefinitely for personal/demo use and costs <$2/month even at 10K+ active users.

## 📁 Project Structure

```
AWS-Demo/
├── frontend/
│   ├── index.html          # Main HTML file with Tailwind CSS
│   └── app.js              # WebSocket client logic
├── lambda/
│   ├── connect.py          # Handle new connections
│   ├── disconnect.py       # Handle disconnections
│   ├── sendmessage.py      # Broadcast messages to all clients
│   ├── default.py          # Handle invalid routes
│   ├── connect.zip
│   ├── disconnect.zip
│   ├── sendmessage.zip
│   └── default.zip
├── infrastructure/
│   ├── trust-policy.json   # IAM trust policy for Lambda
│   ├── bucket-policy.json  # S3 bucket public access policy
│   └── aws-resources.txt   # Resource inventory
├── .gitignore
└── README.md
```

## 🎨 UI Features

- **Color-coded users** - 6 different color schemes (indigo, pink, green, blue, orange, violet)
- **Compact message layout** - Efficient use of space with clean design
- **Status indicators** - Real-time connection status with animated dots
- **Auto-scroll** - Messages automatically scroll to bottom
- **Smooth animations** - Slide-in effects for new messages
- **Responsive buttons** - Disabled states when not connected
- **Gradient backgrounds** - Modern purple/pink gradient design

## 🧪 Testing Instructions

### Local Testing
1. Open `frontend/index.html` in a browser
2. The WebSocket URL should be pre-filled
3. Click "Connect"
4. Open the same file in another browser tab
5. Send messages and verify real-time broadcasting

### Production Testing
1. Visit: http://aws-chat-app-yadnesh-2025.s3-website.ap-south-1.amazonaws.com
2. Open in multiple browsers/tabs
3. Connect all clients
4. Send messages from different tabs
5. Verify messages appear in all connected clients with different colors

## 🔒 Security Considerations

- ✅ IAM roles with least privilege access
- ✅ DynamoDB encryption at rest (default)
- ✅ S3 bucket policy restricts to GET requests only
- ✅ CloudWatch logs for audit trail
- ⚠️ Production deployments should add authentication (Cognito)

## 🐛 Troubleshooting

### Connection Issues
- Verify WebSocket URL is correct
- Check API Gateway stage is deployed
- Ensure Lambda functions have correct permissions

### Messages Not Broadcasting
- Check CloudWatch logs for Lambda errors
- Verify DynamoDB tables exist and are accessible
- Test with `wscat` command line tool

### Frontend Not Loading
- Verify S3 bucket has public read access
- Check bucket policy is correctly applied
- Ensure files uploaded with correct content-type

## 📈 Future Enhancements

- [ ] Add user authentication (Cognito)
- [ ] Implement chat rooms/channels
- [ ] Add file/image sharing
- [ ] Message read receipts
- [ ] User typing indicators
- [ ] Message search functionality
- [ ] Deploy with CDN (CloudFront)
- [ ] Add CI/CD pipeline

## 👨‍💻 Developer

**Yadnesh Teli**  
AWS Account: 324037308320  
Region: ap-south-1 (Mumbai)

## 🙏 Acknowledgments

- AWS Documentation
- Tailwind CSS for beautiful styling
- shadcn/ui for design inspiration

---

**Built with ❤️ using AWS Serverless Technologies by Yadnesh Teli (Taskuick Solutions)**