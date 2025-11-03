// WebSocket connection and UI state management
let ws = null;
let heartbeatInterval = null;

// DOM Elements
const websocketUrlInput = document.getElementById('websocketUrl');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const statusElement = document.getElementById('status');
const statusText = document.getElementById('statusText');
const statusDetails = document.getElementById('statusDetails');

// Load saved WebSocket URL from localStorage
window.addEventListener('DOMContentLoaded', () => {
    const savedUrl = localStorage.getItem('websocketUrl');
    if (savedUrl) {
        websocketUrlInput.value = savedUrl;
    } else {
        // Default WebSocket URL for production
        websocketUrlInput.value = 'wss://0k6ooykme9.execute-api.ap-south-1.amazonaws.com/production';
    }
});

// Event Listeners
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
sendBtn.addEventListener('click', sendMessage);

// Send message on Enter key
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !messageInput.disabled) {
        sendMessage();
    }
});

/**
 * Establish WebSocket connection
 */
function connect() {
    const url = websocketUrlInput.value.trim();
    
    // Validation
    if (!url) {
        showNotification('Please enter WebSocket URL', 'error');
        return;
    }
    
    if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
        showNotification('WebSocket URL must start with wss:// or ws://', 'error');
        return;
    }
    
    // Save URL to localStorage
    localStorage.setItem('websocketUrl', url);
    
    // Create WebSocket connection
    console.log('Connecting to:', url);
    ws = new WebSocket(url);
    
    // Connection opened
    ws.onopen = () => {
        console.log('✅ Connected to WebSocket');
        updateStatus('connected', 'Connected', 'Active connection established');
        displaySystemMessage('Connected to chat server successfully! 🎉');
        
        // Enable message controls
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
        
        // Disable connect button, enable disconnect
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        websocketUrlInput.disabled = true;
        
        // Start heartbeat to keep connection alive
        startHeartbeat();
    };
    
    // Message received
    ws.onmessage = (event) => {
        console.log('📨 Message received:', event.data);
        
        try {
            const data = JSON.parse(event.data);
            
            // Handle different message types
            if (data.error) {
                displaySystemMessage(`Error: ${data.error}`, 'error');
            } else {
                displayMessage(data);
            }
        } catch (e) {
            // Plain text message
            displaySystemMessage(event.data);
        }
    };
    
    // Connection error
    ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        displaySystemMessage('Connection error occurred. Please check your URL and try again.', 'error');
    };
    
    // Connection closed
    ws.onclose = (event) => {
        console.log('🔌 Disconnected from WebSocket', event);
        updateStatus('disconnected', 'Disconnected', 'Connection closed');
        
        const reason = event.reason || 'Connection closed';
        displaySystemMessage(`Disconnected: ${reason}`, 'warning');
        
        // Disable message controls
        messageInput.disabled = true;
        sendBtn.disabled = true;
        
        // Enable connect button, disable disconnect
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        websocketUrlInput.disabled = false;
        
        // Stop heartbeat
        stopHeartbeat();
        
        ws = null;
    };
}

/**
 * Close WebSocket connection
 */
function disconnect() {
    if (ws) {
        console.log('Disconnecting...');
        ws.close(1000, 'User initiated disconnect');
    }
}

/**
 * Send message to WebSocket server
 */
function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) {
        showNotification('Please enter a message', 'warning');
        return;
    }
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        showNotification('Not connected to server', 'error');
        return;
    }
    
    // Prepare message payload
    const payload = {
        action: 'sendmessage',
        message: message
    };
    
    try {
        ws.send(JSON.stringify(payload));
        console.log('📤 Message sent:', payload);
        
        // Clear input
        messageInput.value = '';
        messageInput.focus();
    } catch (e) {
        console.error('Error sending message:', e);
        showNotification('Failed to send message', 'error');
    }
}

/**
 * Display chat message in UI
 */
function displayMessage(data) {
    // Clear placeholder if this is the first message (only if it exists and is the only child)
    const placeholder = chatMessages.querySelector('.flex.items-center.justify-center');
    if (placeholder && chatMessages.children.length === 1) {
        chatMessages.innerHTML = '';
    }
    
    // Generate consistent color based on connectionId
    const colorIndex = data.connectionId ? data.connectionId.charCodeAt(0) % 6 : 0;
    const colors = [
        { bg: 'from-indigo-500 to-purple-600', border: 'border-indigo-300', bgLight: 'bg-indigo-100', text: 'text-indigo-800' },
        { bg: 'from-pink-500 to-rose-600', border: 'border-pink-300', bgLight: 'bg-pink-100', text: 'text-pink-800' },
        { bg: 'from-green-500 to-emerald-600', border: 'border-green-300', bgLight: 'bg-green-100', text: 'text-green-800' },
        { bg: 'from-blue-500 to-cyan-600', border: 'border-blue-300', bgLight: 'bg-blue-100', text: 'text-blue-800' },
        { bg: 'from-orange-500 to-amber-600', border: 'border-orange-300', bgLight: 'bg-orange-100', text: 'text-orange-800' },
        { bg: 'from-violet-500 to-fuchsia-600', border: 'border-violet-300', bgLight: 'bg-violet-100', text: 'text-violet-800' }
    ];
    const userColor = colors[colorIndex];
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `slide-in ${userColor.bgLight} border-2 ${userColor.border} rounded-lg p-2.5 mb-2 shadow-md hover:shadow-lg transition-all duration-200`;
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex items-center justify-between mb-1.5';
    
    const userDiv = document.createElement('div');
    userDiv.className = 'flex items-center gap-1.5';
    
    const avatar = document.createElement('div');
    avatar.className = `w-6 h-6 rounded-full bg-gradient-to-r ${userColor.bg} flex items-center justify-center text-white text-xs font-bold`;
    avatar.textContent = data.connectionId ? data.connectionId.substring(0, 2).toUpperCase() : 'SY';
    
    const userId = document.createElement('span');
    userId.className = `text-xs font-bold ${userColor.text}`;
    userId.textContent = data.connectionId ? `User ${data.connectionId.substring(0, 8)}` : 'System';
    
    userDiv.appendChild(avatar);
    userDiv.appendChild(userId);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'text-xs text-gray-500';
    
    if (data.timestamp) {
        const date = new Date(data.timestamp);
        timeDiv.textContent = date.toLocaleTimeString();
    } else {
        timeDiv.textContent = new Date().toLocaleTimeString();
    }
    
    headerDiv.appendChild(userDiv);
    headerDiv.appendChild(timeDiv);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'text-sm text-gray-900 font-medium break-words pl-7';
    contentDiv.textContent = data.message || JSON.stringify(data);
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Display system message
 */
function displaySystemMessage(message, type = 'info') {
    // Clear placeholder if this is the first message (only if it exists and is the only child)
    const placeholder = chatMessages.querySelector('.flex.items-center.justify-center');
    if (placeholder && chatMessages.children.length === 1) {
        chatMessages.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    
    let bgColor = 'bg-blue-50 border-blue-200';
    let textColor = 'text-blue-700';
    let icon = '📢';
    
    if (type === 'error') {
        bgColor = 'bg-red-50 border-red-200';
        textColor = 'text-red-700';
        icon = '❌';
    } else if (type === 'warning') {
        bgColor = 'bg-yellow-50 border-yellow-200';
        textColor = 'text-yellow-700';
        icon = '⚠️';
    } else if (type === 'success') {
        bgColor = 'bg-green-50 border-green-200';
        textColor = 'text-green-700';
        icon = '✅';
    }
    
    messageDiv.className = `slide-in ${bgColor} border rounded-lg p-2 mb-2 text-center`;
    
    const content = document.createElement('p');
    content.className = `text-xs font-medium ${textColor}`;
    content.textContent = `${icon} ${message}`;
    
    const time = document.createElement('span');
    time.className = 'text-xs opacity-75 block mt-0.5';
    time.textContent = new Date().toLocaleTimeString();
    
    messageDiv.appendChild(content);
    messageDiv.appendChild(time);
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Update connection status UI
 */
function updateStatus(state, text, details) {
    if (state === 'connected') {
        statusElement.className = 'flex items-center gap-3 p-4 rounded-xl bg-green-50 border-2 border-green-200';
        statusText.textContent = text;
        statusText.className = 'font-semibold text-green-700 text-sm';
        statusDetails.textContent = details;
        statusDetails.className = 'text-green-600 text-xs ml-auto';
        
        // Update status dot with pulse animation
        const dot = statusElement.querySelector('div div');
        dot.className = 'w-3 h-3 rounded-full bg-green-500 pulse-slow';
    } else {
        statusElement.className = 'flex items-center gap-3 p-4 rounded-xl bg-red-50 border-2 border-red-200';
        statusText.textContent = text;
        statusText.className = 'font-semibold text-red-700 text-sm';
        statusDetails.textContent = details;
        statusDetails.className = 'text-red-600 text-xs ml-auto';
        
        // Update status dot
        const dot = statusElement.querySelector('div div');
        dot.className = 'w-3 h-3 rounded-full bg-red-500';
    }
}

/**
 * Show temporary notification
 */
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    displaySystemMessage(message, type);
}

/**
 * Start heartbeat to keep connection alive
 * Sends ping every 5 minutes
 */
function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({ action: 'ping' }));
                console.log('💓 Heartbeat sent');
            } catch (e) {
                console.error('Heartbeat failed:', e);
            }
        }
    }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Stop heartbeat interval
 */
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log('💓 Heartbeat stopped');
    }
}

// Log app initialization
console.log('🚀 AWS Serverless Chat Application initialized');
console.log('📝 Enter WebSocket URL and click Connect to start');
