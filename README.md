# AWS Serverless Real-Time Chat Application 💬

A fully serverless, real-time chat application built with AWS services, featuring WebSocket communication, modern UI with Tailwind CSS, and scalable architecture.

## 🌐 Live Demo

**Frontend URL:** http://aws-chat-app-yadnesh-2025.s3-website.ap-south-1.amazonaws.com  
**WebSocket API:** wss://0k6ooykme9.execute-api.ap-south-1.amazonaws.com/production

## 📋 Project Overview

This project demonstrates a complete serverless chat application using AWS Free Tier services. Users can connect from multiple browsers/devices and chat in real-time with message broadcasting and persistence.

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

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ WebSocket
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

## 🛠️ AWS Services Used

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **API Gateway (WebSocket)** | Real-time bidirectional communication | 4 routes, production stage with auto-deploy |
| **Lambda** | Serverless compute for message handling | Python 3.9, 30s timeout, 4 functions |
| **DynamoDB** | NoSQL database for connections & messages | PAY_PER_REQUEST billing, 2 tables |
| **S3** | Static website hosting for frontend | Public read access, website hosting enabled |
| **IAM** | Security and access management | Custom policies for Lambda execution |
| **CloudWatch Logs** | Logging and monitoring | 7-day retention for Lambda logs |

## 📊 Database Schema

### ActiveConnections Table
```
Primary Key: connectionId (String)
Attributes:
  - connectionId: Unique WebSocket connection ID
  - timestamp: ISO 8601 timestamp of connection
  - connectedAt: Unix timestamp
```

### MessageHistory Table
```
Primary Key: messageId (String)
Sort Key: timestamp (String)
Attributes:
  - messageId: UUID for each message
  - timestamp: ISO 8601 timestamp
  - connectionId: Sender's connection ID
  - message: Message content
```

## 💰 Cost Analysis (AWS Free Tier)

| Service | Free Tier Limit | Monthly Cost (Estimated) |
|---------|----------------|--------------------------|
| Lambda | 1M requests, 400K GB-seconds | $0.00 |
| DynamoDB | 25 GB storage, 25 RCU/WCU | $0.00 |
| API Gateway | 1M messages | $0.00 |
| S3 | 5 GB storage, 20K GET requests | $0.00 |
| CloudWatch | 5 GB logs | $0.00 |
| **Total** | | **$0.00** (within Free Tier) |

**Note:** This application stays comfortably within AWS Free Tier limits for moderate usage.

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

**Built with ❤️ using AWS Serverless Technologies**
