import { 
  auth,
  db,
  ref,
  set,
  get,
  push,
  onValue,
  update
} from './firebase.js';

// DOM Elements
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const cameraBtn = document.getElementById('cameraBtn');
const imageUpload = document.getElementById('imageUpload');
const attachmentBtn = document.querySelector('.fa-paperclip').parentElement;
const searchBtn = document.getElementById('searchBtn');
const menuBtn = document.getElementById('menuBtn');
const searchModal = document.getElementById('searchModal');
const closeModal = document.querySelector('.close-modal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const viewProfileBtn = document.getElementById('viewProfile');
const clearChatBtn = document.getElementById('clearChat');
const logoutBtn = document.getElementById('logoutBtn');

// Textarea auto-resize and button state management
messageInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
  updateSendButtonState();
});

// Enter key press handler
messageInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) {
      sendMessage();
    }
  }
});

// Send button click handler
sendBtn.addEventListener('click', sendMessage);

// Camera button click event (camera only)
cameraBtn.addEventListener('click', () => {
  imageUpload.setAttribute('capture', 'camera');
  imageUpload.click();
});

// Attachment button click event (gallery images)
attachmentBtn.addEventListener('click', () => {
  imageUpload.removeAttribute('capture');
  imageUpload.click();
});

// Image select handler
imageUpload.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  // File validation
  if (!file.type.match('image.*')) {
    alert('Please select only image files');
    return;
  }

  // File size check (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image size must be less than 5MB');
    return;
  }

  // File reader setup
  const reader = new FileReader();

  reader.onload = function(event) {
    const imageDataUrl = event.target.result;
    
    // Set image as text in message input
    messageInput.value = `[IMAGE:${imageDataUrl}]`;
    updateSendButtonState();
  };

  reader.onerror = function() {
    alert('Error loading image');
  };

  // Read file as data URL
  reader.readAsDataURL(file);
});

// Update send button state
function updateSendButtonState() {
  sendBtn.disabled = messageInput.value.trim() === '';
}

// Search button click event
searchBtn.addEventListener('click', () => {
  searchModal.style.display = 'block';
  searchInput.focus();
});

// Modal close event
closeModal.addEventListener('click', () => {
  searchModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === searchModal) {
    searchModal.style.display = 'none';
  }
});

// Search functionality
searchInput.addEventListener('input', function() {
  const searchTerm = this.value.toLowerCase();
  searchResults.innerHTML = '';
  
  if (searchTerm.length < 2) return;
  
  // Search messages from Firebase
  const messagesRef = ref(db, 'messages');
  get(messagesRef).then((snapshot) => {
    const results = [];
    
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      if (message.content.toLowerCase().includes(searchTerm)) {
        results.push({
          id: childSnapshot.key,
          ...message
        });
      }
    });
    
    // Display results
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="no-results">No results found</div>';
    } else {
      results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.innerHTML = `
          <div class="result-content">${highlightSearchTerm(result.content, searchTerm)}</div>
          <div class="result-time">${formatTime(result.timestamp)}</div>
        `;
        resultItem.addEventListener('click', () => {
          scrollToMessage(result.id);
        });
        searchResults.appendChild(resultItem);
      });
    }
  });
});

// Three-dot menu functionality
viewProfileBtn.addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = 'index.html';
});

clearChatBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const confirmClear = confirm('Are you sure you want to delete all chat messages?');
  if (confirmClear) {
    try {
      const messagesRef = ref(db, 'messages');
      await set(messagesRef, null);
      alert('Chat cleared successfully');
    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Failed to clear chat');
    }
  }
});

logoutBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await auth.signOut();
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed');
  }
});

// User authentication check
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  if (!user.emailVerified) {
    alert('Please verify your email to use chat');
    window.location.href = 'verify-email.html';
    return;
  }

  // Load chat messages
  loadMessages(user.uid);
});

// Send message function
async function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;

  const user = auth.currentUser;
  if (!user) return;

  sendBtn.disabled = true;
  messageInput.disabled = true;

  try {
    const userRef = ref(db, `users/${user.uid}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      throw new Error('User data not found');
    }
    
    const userData = userSnapshot.val();
    const newMessageRef = push(ref(db, 'messages'));
    
    await set(newMessageRef, {
      content,
      userId: user.uid,
      userName: userData.name,
      timestamp: Date.now(),
      status: 'sent'
    });
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
    imageUpload.value = ''; // Reset image input
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  } finally {
    sendBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  }
}

// Load messages function
function loadMessages(currentUserId) {
  const messagesRef = ref(db, 'messages');
  
  onValue(messagesRef, (snapshot) => {
    chatContainer.innerHTML = '';
    
    const messages = [];
    snapshot.forEach((childSnapshot) => {
      const messageData = childSnapshot.val();
      if (messageData && messageData.content && messageData.userId && messageData.timestamp) {
        messages.push({
          id: childSnapshot.key,
          ...messageData
        });
      }
    });
    
    // Sort by time (oldest to newest)
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    messages.forEach(message => {
      const isOutgoing = message.userId === currentUserId;
      const messageElement = document.createElement('div');
      messageElement.className = `message ${isOutgoing ? 'outgoing-message' : 'incoming-message'}`;
      messageElement.setAttribute('data-message-id', message.id);
      
      // Check if this is an image message
      if (message.content.startsWith('[IMAGE:') && message.content.endsWith(']')) {
        const imageDataUrl = message.content.substring(7, message.content.length - 1);
        messageElement.innerHTML = `
          <div class="message-image">
            <img src="${imageDataUrl}" alt="Image" class="uploaded-image">
            <div class="image-actions">
              <button class="action-btn download-btn" data-url="${imageDataUrl}">
                <i class="fas fa-download"></i>
              </button>
            </div>
          </div>
          <div class="message-time">
            ${formatTime(message.timestamp)}
            ${isOutgoing ? '<i class="fas fa-check-double"></i>' : ''}
          </div>
        `;
      } else {
        // Regular text message
        messageElement.innerHTML = `
          <div class="message-content">${message.content.replace(/\n/g, '<br>')}</div>
          <div class="message-time">
            ${formatTime(message.timestamp)}
            ${isOutgoing ? '<i class="fas fa-check-double"></i>' : ''}
          </div>
        `;
      }
      
      chatContainer.appendChild(messageElement);
    });
    
    // Image download button events
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const imageUrl = btn.dataset.url;
        downloadImage(imageUrl);
      });
    });
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
}

// Helper functions
function highlightSearchTerm(text, term) {
  const regex = new RegExp(`(${term})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

function scrollToMessage(messageId) {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageElement) {
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    messageElement.classList.add('highlight-message');
    setTimeout(() => {
      messageElement.classList.remove('highlight-message');
    }, 2000);
  }
  searchModal.style.display = 'none';
}

function downloadImage(url) {
  const link = document.createElement('a');
  link.href = url;
  link.download = `chat-image-${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  
  try {
    const date = new Date(Number(timestamp));
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  } catch (e) {
    console.error('Error formatting time:', e);
    return '';
  }
}