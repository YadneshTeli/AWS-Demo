# AWS Serverless Real-Time Chat Application

A fully serverless real-time chat application built using AWS services including API Gateway WebSocket API, Lambda, DynamoDB, and S3.

## 🏗️ Architecture

```
Frontend (S3) → API Gateway WebSocket → Lambda Functions → DynamoDB
                                              ↓
                                        CloudWatch Logs
```

## 🚀 AWS Services Used

- **API Gateway WebSocket API** - Real-time bidirectional communication
- **AWS Lambda** - Serverless compute (Python 3.9)
- **Amazon DynamoDB** - NoSQL database for connections and messages
- **Amazon S3** - Static website hosting
- **AWS IAM** - Access control and permissions
- **CloudWatch Logs** - Monitoring and debugging

## 📁 Project Structure

```
AWS-Demo/
├── frontend/
│   ├── index.html          # Modern UI with Tailwind CSS
│   └── app.js              # WebSocket client logic
├── lambda/
│   ├── connect.py          # Handle new connections
│   ├── disconnect.py       # Handle disconnections
│   ├── sendmessage.py      # Broadcast messages
│   └── default.py          # Handle unknown routes
├── infrastructure/
│   └── (IAM policies, configs)
└── README.md
```

## ✨ Features

- ✅ Real-time message broadcasting to all connected clients
- ✅ Connection state management with DynamoDB
- ✅ Message persistence in DynamoDB
- ✅ Modern, responsive UI with Tailwind CSS
- ✅ Auto-scrolling chat interface
- ✅ Heartbeat mechanism to maintain connections
- ✅ WebSocket URL persistence (localStorage)
- ✅ System notifications for connection events
- ✅ 100% Serverless architecture

## 🗄️ Database Schema

### ActiveConnections Table
- **Partition Key**: `connectionId` (String)
- **Attributes**: `timestamp`, `connectedAt`

### MessageHistory Table
- **Partition Key**: `messageId` (String)
- **Sort Key**: `timestamp` (String)
- **Attributes**: `connectionId`, `message`

## 🛠️ Deployment Status

- [ ] DynamoDB Tables
- [ ] Lambda Functions
- [ ] IAM Roles & Policies
- [ ] API Gateway WebSocket API
- [ ] S3 Static Website
- [ ] Frontend Deployment

## 💰 Cost Analysis (AWS Free Tier)

- **API Gateway**: Within 1M messages/month limit
- **Lambda**: Within 1M requests/month limit
- **DynamoDB**: Within 25GB storage limit
- **S3**: Within 5GB storage limit
- **Total Cost**: $0.00 (within Free Tier limits)

## 🧪 Testing Instructions

1. Open frontend URL in browser
2. Enter WebSocket URL
3. Click "Connect"
4. Open same URL in another browser tab
5. Send messages between tabs
6. Verify real-time message delivery

## 📝 Development Log

- ✅ Prerequisites verified (AWS CLI, Node.js, Git, wscat)
- ✅ Project structure initialized
- ✅ Lambda functions developed
- ✅ Modern frontend with Tailwind CSS created
- ⏳ AWS resources deployment (in progress)

## 🎯 Next Steps

1. Create DynamoDB tables
2. Create IAM roles and policies
3. Deploy Lambda functions
4. Create WebSocket API
5. Deploy frontend to S3
6. End-to-end testing

## 👤 Author

Yadnesh Teli

## 📄 License

This project is for educational and assessment purposes.

---

**Built with ❤️ using AWS Serverless Technologies**
