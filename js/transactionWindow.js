import { db, ref, get } from './firebase.js';

export async function setupTransactionDetails() {
  const items = document.querySelectorAll('.transaction-item');
  
  items.forEach(item => {
    item.addEventListener('click', async function() {
      try {
        const txData = {
          id: this.dataset.txid,
          senderId: this.dataset.sender,
          recipientId: this.dataset.recipient,
          amount: this.dataset.amount,
          fee: this.dataset.fee || 0,
          timestamp: this.dataset.timestamp
        };

        const [senderSnap, recipientSnap] = await Promise.all([
          get(ref(db, `users/${txData.senderId}`)),
          get(ref(db, `users/${txData.recipientId}`))
        ]);

        showTransactionWindow({
          ...txData,
          senderName: senderSnap.val().name || 'Unknown Sender',
          recipientName: recipientSnap.val().name || 'Unknown Recipient',
          senderWallet: senderSnap.val().uid,
          recipientWallet: recipientSnap.val().uid
        });
      } catch (error) {
        console.error('Error loading transaction details:', error);
        alert('Failed to load details: ' + error.message);
      }
    });
  });
}

function showTransactionWindow(tx) {
  const modal = document.createElement('div');
  modal.className = 'transaction-modal';
  
  const date = new Date(parseInt(tx.timestamp));
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const shortTxId = tx.id.length > 13 ? tx.id.substring(0, 13) + '...' : tx.id;
  const totalAmount = parseFloat(tx.amount) + parseFloat(tx.fee);
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div class="logo-container">
          <img src="logo.svg" alt="Cryptonix Logo" class="logo">
          <span class="logo-text">Cryptonix</span>
        </div>
        <h2>Transaction Details</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        ${createDetailRow('Transaction ID:', shortTxId, true)}
        ${createDetailRow('Date:', formattedDate)}
        ${createDetailRow('Time:', formattedTime)}
        ${createDetailRow('Amount:', `CRX ${parseFloat(tx.amount).toFixed(2)}`)}
        ${createDetailRow('Transaction Fee:', `CRX ${parseFloat(tx.fee).toFixed(2)} (1%)`)}
        ${createDetailRow('Total Amount:', `CRX ${totalAmount.toFixed(2)}`)}
        
        <div class="user-detail-section">
          <div class="user-detail-box sender">
            <h3>Sender</h3>
            ${createDetailRow('Name:', tx.senderName)}
            ${createDetailRow('Address:', tx.senderWallet, true)}
          </div>
          
          <div class="user-detail-box recipient">
            <h3>Recipient</h3>
            ${createDetailRow('Name:', tx.recipientName)}
            ${createDetailRow('Address:', tx.recipientWallet, true)}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="close-btn">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  setupCopyButtons(modal);
  setupCloseButtons(modal);
}

function setupCloseButtons(modal) {
  const closeModal = () => {
    document.body.removeChild(modal);
  };

  modal.querySelector('.close-modal').addEventListener('click', closeModal);
  modal.querySelector('.close-btn').addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

function createDetailRow(label, value, withCopy = false) {
  if (withCopy) {
    return `
      <div class="detail-row">
        <span class="detail-label">${label}</span>
        <span class="detail-value">${value}</span>
        <button class="copy-btn" data-value="${value}" aria-label="Copy to clipboard">
          <svg class="copy-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
          </svg>
          Copy
        </button>
      </div>
    `;
  }
  return `
    <div class="detail-row">
      <span class="detail-label">${label}</span>
      <span class="detail-value">${value}</span>
    </div>
  `;
}

function setupCopyButtons(modal) {
  const copyButtons = modal.querySelectorAll('.copy-btn');
  copyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const value = button.getAttribute('data-value');
      navigator.clipboard.writeText(value).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = 'Copied!';
        setTimeout(() => {
          button.innerHTML = originalHTML;
        }, 2000);
      });
    });
  });
}