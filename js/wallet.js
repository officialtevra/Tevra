import { auth, db, ref, get, update, set, onValue } from './firebase.js';
import { setupTransactionDetails } from './transactionWindow.js';

// Initialize wallet functionality
export function initWallet() {
    setupBalanceListener();
    setupTransactionHandlers();
    setupTransferPage(); // Added this line to initialize transfer page functionality
}

// Setup real-time balance listener
function setupBalanceListener() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const userRef = ref(db, `users/${user.uid}`);
        
        onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (!userData) return;

            // Update balance display
            updateBalanceDisplay(userData.balance);
            
            // Update last updated time
            updateLastUpdatedTime();
            
            // Load transactions
            if (document.getElementById('transactionsList')) {
                loadRecentTransactions(user.uid);
            }
        }, {
            onlyOnce: false // Keep listening for changes
        });
    });
}

// Setup transfer page specific functionality
function setupTransferPage() {
    auth.onAuthStateChanged((user) => {
        if (!user) return;

        const userRef = ref(db, `users/${user.uid}`);
        
        onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (!userData) return;

            // Update balance display specifically for transfer page
            const balanceElement = document.getElementById('userBalance');
            if (balanceElement) {
                balanceElement.textContent = `CRX ${userData.balance?.toFixed(2) || '0.00'}`;
            }

            // Add balance validation for transfer form
            const amountInput = document.getElementById('amount');
            if (amountInput) {
                amountInput.addEventListener('input', function() {
                    const amount = parseFloat(this.value) || 0;
                    const fee = amount * 0.01;
                    const total = amount + fee;
                    
                    // Check if sufficient balance
                    if (total > userData.balance) {
                        this.setCustomValidity('Insufficient balance');
                        const errorElement = document.getElementById('amountError');
                        if (errorElement) {
                            errorElement.textContent = 'Insufficient balance for this transaction';
                            errorElement.style.display = 'block';
                        }
                    } else {
                        this.setCustomValidity('');
                        const errorElement = document.getElementById('amountError');
                        if (errorElement) {
                            errorElement.style.display = 'none';
                        }
                    }
                    
                    const feeElement = document.getElementById('feeAmount');
                    const totalElement = document.getElementById('totalAmount');
                    if (feeElement && totalElement) {
                        feeElement.textContent = `CRX ${fee.toFixed(2)}`;
                        totalElement.textContent = `CRX ${total.toFixed(2)}`;
                    }
                });
            }
        });
    });
}

// Update balance in all relevant elements
function updateBalanceDisplay(balance) {
    const balanceAmount = parseFloat(balance) || 0;
    const formattedBalance = balanceAmount.toFixed(2);
    
    // Update all balance display elements
    const balanceElements = [
        document.getElementById('balanceAmount'),
        document.querySelector('[data-balance]'),
        document.querySelector('.balance-amount'),
        document.getElementById('userBalance') // Added transfer page balance element
    ];
    
    balanceElements.forEach(element => {
        if (element) {
            element.textContent = formattedBalance;
        }
    });
}

// Update last updated time
function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    const timeElements = [
        document.getElementById('lastUpdated'),
        document.querySelector('[data-time-updated]')
    ];
    
    timeElements.forEach(element => {
        if (element) {
            element.textContent = `Last updated: ${timeString}`;
        }
    });
}

// Setup transaction handlers
function setupTransactionHandlers() {
    const transferForm = document.getElementById('transferForm');
    if (transferForm) {
        transferForm.addEventListener('submit', handleTransfer);
    }
}

// Handle money transfer
async function handleTransfer(e) {
    e.preventDefault();
    
    const recipientUid = document.getElementById('recipientUid').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const mpin = document.getElementById('mpin').value;
    
    const transferBtn = document.getElementById('transferBtn');
    if (transferBtn) {
        transferBtn.disabled = true;
        transferBtn.textContent = 'Processing...';
    }
    
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Not logged in');
        
        // Validate inputs
        if (!/^CRX[a-zA-Z0-9]{35}$/.test(recipientUid)) {
            throw new Error('Invalid wallet address! Must start with CRX and be 38 characters');
        }
        
        if (!/^\d{6}$/.test(mpin)) {
            throw new Error('MPIN must be exactly 6 digits');
        }
        
        const TRANSACTION_FEE = 0.01; // 1% fee
        const totalAmount = amount + (amount * TRANSACTION_FEE);
        
        const userSnapshot = await get(ref(db, `users/${user.uid}`));
        const userData = userSnapshot.val();
        
        if (userData.mpin !== mpin) throw new Error('Wrong MPIN');
        if (userData.balance < totalAmount) {
            throw new Error(`Insufficient balance (includes ${TRANSACTION_FEE*100}% fee)`);
        }
        
        const allUsers = await get(ref(db, 'users'));
        let recipientId = null;
        
        allUsers.forEach((child) => {
            if (child.val().uid === recipientUid) {
                recipientId = child.key;
            }
        });
        
        if (!recipientId) throw new Error('Recipient not found');
        
        const transactionId = Date.now().toString();
        
        await update(ref(db, 'users'), {
            [`${user.uid}/balance`]: userData.balance - totalAmount,
            [`${recipientId}/balance`]: (allUsers.val()[recipientId].balance || 0) + amount
        });
        
        await set(ref(db, `transactions/${transactionId}`), {
            senderId: user.uid,
            recipientId,
            amount,
            fee: amount * TRANSACTION_FEE,
            totalAmount: totalAmount,
            timestamp: Date.now(),
            status: 'completed'
        });
        
        alert(`Successfully sent CRX ${amount.toFixed(2)} (Fee: CRX ${(amount*TRANSACTION_FEE).toFixed(2)})`);
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Transfer error:', error);
        alert(`Transfer failed: ${error.message}`);
    } finally {
        const transferBtn = document.getElementById('transferBtn');
        if (transferBtn) {
            transferBtn.disabled = false;
            transferBtn.textContent = 'Send Now';
        }
    }
}

// Load recent transactions
async function loadRecentTransactions(userId) {
    try {
        const transactionsRef = ref(db, 'transactions');
        const snapshot = await get(transactionsRef);
        
        const transactions = [];
        snapshot.forEach((child) => {
            const tx = child.val();
            if (tx.senderId === userId || tx.recipientId === userId) {
                transactions.push({
                    id: child.key,
                    ...tx
                });
            }
        });

        transactions.sort((a, b) => b.timestamp - a.timestamp);
        
        displayTransactions(transactions.slice(0, 5), userId);
    } catch (error) {
        console.error('Error loading transactions:', error);
        displayError('Failed to load transactions');
    }
}

// Display transactions in UI
function displayTransactions(transactions, userId) {
    const container = document.getElementById('transactionsList');
    if (!container) return;

    if (transactions.length === 0) {
        container.innerHTML = '<div class="no-transactions">No transactions found</div>';
        return;
    }

    container.innerHTML = transactions.map(tx => {
        const isSender = tx.senderId === userId;
        const shortTxId = tx.id.length > 13 ? tx.id.substring(0, 13) : tx.id;
        const date = new Date(parseInt(tx.timestamp)).toLocaleDateString();
        
        return `
            <div class="transaction-item"
                 data-txid="${tx.id}"
                 data-sender="${tx.senderId}"
                 data-recipient="${tx.recipientId}"
                 data-amount="${tx.amount}"
                 data-fee="${tx.fee || 0}"
                 data-timestamp="${tx.timestamp}">
                <div class="transaction-icon">
                    <i class="fas fa-${isSender ? 'arrow-up' : 'arrow-down'}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">
                        ${isSender ? 'Sent' : 'Received'} ${date}
                    </div>
                    <div class="transaction-date">
                        TX: ${shortTxId}
                    </div>
                </div>
                <div class="transaction-amount ${isSender ? 'negative' : 'positive'}">
                    ${isSender ? '-' : '+'} CRX ${tx.amount.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');

    if (typeof setupTransactionDetails === 'function') {
        setupTransactionDetails();
    }
}

// Display error message
function displayError(message) {
    const container = document.getElementById('transactionsList');
    if (container) {
        container.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// Initialize wallet when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initWallet();
});