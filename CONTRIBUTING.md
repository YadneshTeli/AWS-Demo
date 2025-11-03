# Contributing to AWS Serverless Chat Application

First off, thank you for considering contributing to this project! It's people like you that make this project such a great tool for learning AWS serverless architecture.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to yadneshteli@gmail.com.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots, etc.)
- **Describe the behavior you observed and what you expected**
- **Include AWS service logs** (CloudWatch, API Gateway logs)
- **Specify your environment:** AWS region, Node.js version, browser, etc.

**Example Bug Report:**
```
Title: Messages not broadcasting to all connected clients

Description:
When User A sends a message, User B and User C don't receive it.

Steps to Reproduce:
1. Open the application in 3 browser tabs
2. Connect all three clients
3. Send a message from tab 1
4. Check tabs 2 and 3

Expected: Message appears in all tabs
Actual: Message only appears in tab 1

Environment:
- Region: ap-south-1
- Browser: Chrome 120
- Lambda logs: [paste CloudWatch logs]
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any AWS services or technologies involved**
- **Consider cost implications** (keep it Free Tier friendly)

**Example Enhancement:**
```
Title: Add user authentication with AWS Cognito

Description:
Currently, users are anonymous and identified only by connectionId.
Adding Cognito authentication would allow:
- Persistent user identities
- User profiles with display names
- Private messaging capabilities
- Message history per user

Implementation:
- AWS Cognito User Pool
- Cognito Identity Pool for DynamoDB access
- Update Lambda functions to use Cognito claims
- Update frontend with sign-in/sign-up UI

Cost Impact: Cognito has 50K free MAU in Free Tier
```

### Pull Requests

We actively welcome your pull requests:

1. **Fork the repo** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Test your changes thoroughly** (see Testing Guidelines)
4. **Update the documentation** if needed
5. **Ensure your code follows the existing style**
6. **Write a clear PR description** explaining your changes

## Development Setup

### Prerequisites

- AWS Account with Free Tier access
- AWS CLI v2.x configured
- Python 3.9+ (for Lambda functions)
- Node.js 16+ and npm (for development tools)
- Git
- Text editor (VS Code recommended)

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/YadneshTeli/AWS-Demo.git
cd AWS-Demo

# 2. Install development dependencies (optional)
npm install -g wscat  # For WebSocket testing
pip install boto3 pytest  # For Lambda testing

# 3. Set up AWS credentials
aws configure

# 4. Create DynamoDB tables (if testing locally)
aws dynamodb create-table \
    --table-name ActiveConnections \
    --attribute-definitions AttributeName=connectionId,AttributeType=S \
    --key-schema AttributeName=connectionId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region ap-south-1

aws dynamodb create-table \
    --table-name MessageHistory \
    --attribute-definitions \
        AttributeName=messageId,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=messageId,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region ap-south-1

# 5. Deploy Lambda functions
cd lambda
./deploy.ps1  # Or follow manual deployment steps in README
```

### Testing Your Changes Locally

```bash
# 1. Test Lambda functions locally
cd lambda
python -m pytest tests/  # If you add tests

# 2. Test frontend locally
cd frontend
# Open index.html in browser
# Connect to your API Gateway WebSocket URL

# 3. Test with wscat
wscat -c "wss://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/production"
# Send: {"action":"sendmessage","message":"Test message"}
```

## Pull Request Process

1. **Create a descriptive branch name:**
   ```bash
   git checkout -b feature/add-typing-indicators
   git checkout -b fix/message-broadcasting-issue
   git checkout -b docs/update-deployment-guide
   ```

2. **Make your changes** and commit with clear messages:
   ```bash
   git add .
   git commit -m "feat: Add typing indicator feature"
   git commit -m "fix: Resolve message broadcasting to stale connections"
   git commit -m "docs: Add troubleshooting section for DynamoDB errors"
   ```

3. **Push to your fork:**
   ```bash
   git push origin feature/add-typing-indicators
   ```

4. **Open a Pull Request** with:
   - Clear title describing the change
   - Detailed description of what changed and why
   - Screenshots/videos if UI changes
   - AWS CloudWatch logs if backend changes
   - Reference to related issues (Fixes #123)

5. **Wait for review:**
   - Address any feedback from maintainers
   - Keep your branch up to date with `main`
   - Be responsive to comments

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(lambda): Add message edit functionality

- Update sendmessage.py to handle edit action
- Add messageId to edit requests
- Update DynamoDB schema for edit history

Closes #45

fix(frontend): Resolve color coding issue for connectionIds

- Fix colorIndex calculation for special characters
- Add fallback color for invalid connectionIds
- Update color assignment algorithm

Fixes #67

docs(readme): Add CloudWatch troubleshooting section

- Add section for Lambda timeout errors
- Include common DynamoDB permission issues
- Provide wscat testing examples
```

## Coding Standards

### Python (Lambda Functions)

```python
# Use clear function names
def lambda_handler(event, context):
    """
    Handle WebSocket connections.
    
    Args:
        event: API Gateway WebSocket event
        context: Lambda context object
        
    Returns:
        dict: Response with statusCode and body
    """
    pass

# Follow PEP 8 style guide
# Use type hints where appropriate
def broadcast_message(message: str, connections: list) -> None:
    """Broadcast message to all active connections."""
    pass

# Handle exceptions gracefully
try:
    table.put_item(Item=item)
except ClientError as e:
    print(f"DynamoDB error: {e}")
    return {'statusCode': 500, 'body': 'Error saving message'}

# Use environment variables for configuration
TABLE_NAME = os.environ.get('TABLE_NAME', 'ActiveConnections')

# Add logging for debugging
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.info(f"Processing message from {connection_id}")
```

### JavaScript (Frontend)

```javascript
// Use descriptive variable names
const chatMessages = document.getElementById('chatMessages');
const connectButton = document.getElementById('connectBtn');

// Use const/let instead of var
const colors = [...];
let websocket = null;

// Add JSDoc comments for functions
/**
 * Display a message in the chat interface
 * @param {Object} data - Message data from WebSocket
 * @param {string} data.message - The message text
 * @param {string} data.connectionId - Sender's connection ID
 * @param {string} data.timestamp - ISO timestamp
 */
function displayMessage(data) {
    // Implementation
}

// Handle errors gracefully
ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    displaySystemMessage('Connection error occurred', 'error');
};

// Use modern JavaScript features
const messageDiv = document.createElement('div');
messageDiv.innerHTML = `
    <div class="message ${colorClass}">
        ${escapeHtml(message)}
    </div>
`;
```

### HTML/CSS

```html
<!-- Use semantic HTML -->
<main class="chat-container">
    <section class="messages" role="log" aria-live="polite">
        <!-- Messages -->
    </section>
</main>

<!-- Use Tailwind utility classes consistently -->
<button class="px-4 py-2 bg-blue-500 hover:bg-blue-600 
               text-white rounded-lg transition-colors">
    Send
</button>

<!-- Add accessibility attributes -->
<input 
    type="text" 
    id="messageInput"
    aria-label="Message input"
    placeholder="Type your message..."
/>
```

## Testing Guidelines

### Manual Testing Checklist

Before submitting a PR, test the following:

**Backend (Lambda + DynamoDB):**
- [ ] New connections are saved to ActiveConnections
- [ ] Disconnections remove entries from ActiveConnections
- [ ] Messages are saved to MessageHistory
- [ ] Messages broadcast to all connected clients
- [ ] Stale connections are cleaned up properly
- [ ] CloudWatch logs show no errors

**Frontend:**
- [ ] UI renders correctly on desktop
- [ ] UI renders correctly on mobile
- [ ] WebSocket connects successfully
- [ ] Messages display with correct colors
- [ ] Auto-scroll works properly
- [ ] Disconnect button works
- [ ] Status indicator updates correctly
- [ ] Heartbeat mechanism functions

**Cross-browser Testing:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Test with Multiple Clients

```bash
# Terminal 1
wscat -c "wss://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/production"

# Terminal 2
wscat -c "wss://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/production"

# Send from Terminal 1
{"action":"sendmessage","message":"Hello from client 1"}

# Verify it appears in Terminal 2
```

### Check CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/ChatAppSendMessage --follow

# Check for errors
aws logs filter-pattern /aws/lambda/ChatAppSendMessage --filter-pattern "ERROR"

# View API Gateway logs (if enabled)
aws logs tail /aws/apigateway/ChatAppWebSocketAPI --follow
```

## Documentation

### When to Update Documentation

Update documentation when you:
- Add a new feature
- Change existing functionality
- Fix a bug that wasn't documented
- Add new AWS services
- Change deployment procedures
- Update dependencies

### Documentation Files to Update

- **README.md**: Main project documentation
- **Code comments**: Python docstrings, JSDoc comments
- **Architecture diagrams**: If infrastructure changes
- **CONTRIBUTING.md**: If contribution process changes

### Documentation Style

- Use clear, concise language
- Include code examples
- Add screenshots for UI changes
- Provide AWS CLI commands where applicable
- Mention cost implications for new features
- Update table of contents if adding new sections

## Questions?

If you have questions about contributing:

1. Check existing [Issues](https://github.com/YadneshTeli/AWS-Demo/issues)
2. Check existing [Pull Requests](https://github.com/YadneshTeli/AWS-Demo/pulls)
3. Create a new issue with the `question` label
4. Email: yadneshteli@gmail.com

## Recognition

Contributors will be recognized in:
- README.md Contributors section
- Release notes for significant contributions
- Project acknowledgments

Thank you for contributing to making this project better! 🎉

---

**Happy Contributing!** 🚀
