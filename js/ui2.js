
import { auth, db, ref, get, update } from './firebase.js';

// ... (পুরানো কোড অপরিবর্তিত রাখুন)

// Enhanced transaction history loader
auth.onAuthStateChanged(async (user) => {
  if (!user || !document.getElementById('transactionsList')) return;
  
  try {
    const transactionsRef = ref(db, 'transactions');
    const snapshot = await get(transactionsRef);
    
    if (!snapshot.exists()) {
      document.getElementById('transactionsList').innerHTML = 
        '<div class="no-transactions">No transactions found</div>';
      return;
    }
    
    const transactions = [];
    snapshot.forEach((child) => {
      const tx = child.val();
      // শুধুমাত্র সংশ্লিষ্ট ট্রানজাকশনগুলো ফিল্টার করুন
      if (tx.senderId === user.uid || tx.recipientId === user.uid) {
        transactions.push({
          id: child.key,
          ...tx
        });
      }
    });
    
    if (transactions.length === 0) {
      document.getElementById('transactionsList').innerHTML = 
        '<div class="no-transactions">No transactions found</div>';
      return;
    }
    
    // সাজান নতুন থেকে পুরানো ক্রমে
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    
    // ইউজার ডেটা লোড করুন
    const usersRef = ref(db, 'users');
    const usersSnapshot = await get(usersRef);
    const users = usersSnapshot.val();
    
    // ট্রানজাকশন ডিসপ্লে করুন
    const container = document.getElementById('transactionsList');
    container.innerHTML = transactions.map(tx => {
      const isSender = tx.senderId === user.uid;
      const otherUserId = isSender ? tx.recipientId : tx.senderId;
      const otherUser = users[otherUserId] || {};
      
      return `
        <div class="transaction-item">
          <div>
            <strong>${new Date(tx.timestamp).toLocaleString()}</strong><br>
            ${isSender ? 'Sent to' : 'Received from'} 
            ${otherUser.name || 'Unknown'} (${otherUserId.slice(-4)})
            <div class="tx-status">Status: ${tx.status || 'completed'}</div>
            <div class="tx-id">TX ID: ${tx.id}</div>
          </div>
          <div class="${isSender ? 'debit' : 'credit'}">
            ₹${tx.amount.toFixed(2)}
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error("Error loading transactions:", error);
    document.getElementById('transactionsList').innerHTML = 
      `<div class="no-transactions error">Error loading transactions: ${error.message}</div>`;
  }
});

// ... (বাকি কোড অপরিবর্তিত রাখুন)