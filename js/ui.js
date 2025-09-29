import { auth, db, ref, get, update } from './firebase.js';

// Initialize UI components
export function initUI() {
    setupProfileSection();
    setupMPINChange();
}

// Setup profile section
function setupProfileSection() {
    auth.onAuthStateChanged(async (user) => {
        if (!user || !document.getElementById('profileInfo')) return;

        const userData = await loadUserWithTransactions(user.uid);
        if (!userData) return;

        displayProfileInfo(userData);
        setupQRCode(userData.uid);
        setupCopyButton();
    });
}

// Load user data
async function loadUserWithTransactions(userId) {
    try {
        const userRef = ref(db, `users/${userId}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
            return userSnapshot.val();
        }
        return null;
    } catch (error) {
        console.error('Error loading user data:', error);
        return null;
    }
}

// Display profile information
function displayProfileInfo(userData) {
    const profileInfo = document.getElementById('profileInfo');
    if (!profileInfo) return;

    profileInfo.innerHTML = `
        <div class="profile-field">
            <span class="field-label">Name:</span>
            <span>${userData.name || 'Not set'}</span>
        </div>
        <div class="profile-field">
            <span class="field-label">Email:</span>
            <span>${userData.email || 'Not set'}</span>
        </div>
        <div class="profile-field">
            <span class="field-label">Wallet UID:</span>
            <div id="walletSection">
                <div id="walletQr"></div>
                <div style="display: flex; align-items: center; margin-top: 5px;">
                    <span id="walletAddress" style="margin-right: 10px;">${userData.uid}</span>
                    <button id="copyButton">Copy</button>
                </div>
            </div>
        </div>
        <div class="profile-field">
            <span class="field-label">Balance:</span>
            <span data-balance>CRX ${userData.balance?.toFixed(2) || '0.00'}</span>
        </div>
    `;
}

// Setup QR code for wallet address
function setupQRCode(walletAddress) {
    if (!walletAddress || !document.getElementById('walletQr')) return;
    
    new QRCode(document.getElementById('walletQr'), {
        text: walletAddress,
        width: 100,
        height: 100,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Setup copy button for wallet address
function setupCopyButton() {
    const copyButton = document.getElementById('copyButton');
    if (!copyButton) return;
    
    copyButton.addEventListener('click', () => {
        const walletAddress = document.getElementById('walletAddress')?.textContent;
        if (!walletAddress) return;
        
        navigator.clipboard.writeText(walletAddress).then(() => {
            alert('Wallet address copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy wallet address');
        });
    });
}

// Setup MPIN change functionality
function setupMPINChange() {
    const changeMpinBtn = document.getElementById('changeMpinBtn');
    if (changeMpinBtn) {
        changeMpinBtn.addEventListener('click', () => {
            document.getElementById('mpinChangeForm').classList.toggle('show');
        });
    }

    const mpinForm = document.getElementById('mpinForm');
    if (mpinForm) {
        mpinForm.addEventListener('submit', handleMPINChange);
    }
}

// Handle MPIN change
async function handleMPINChange(e) {
    e.preventDefault();
    
    const currentMpin = document.getElementById('currentMpin').value;
    const newMpin = document.getElementById('newMpin').value;
    
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        
        // Validate MPIN
        if (!/^\d{6}$/.test(newMpin)) {
            throw new Error('New MPIN must be exactly 6 digits');
        }
        
        // Verify current MPIN
        const userSnapshot = await get(ref(db, `users/${user.uid}`));
        if (userSnapshot.val().mpin !== currentMpin) {
            throw new Error('Current MPIN is incorrect');
        }
        
        // Update MPIN
        await update(ref(db, `users/${user.uid}`), { mpin: newMpin });
        alert('MPIN changed successfully');
        document.getElementById('mpinChangeForm').classList.remove('show');
    } catch (error) {
        console.error('MPIN change error:', error);
        alert(`MPIN change failed: ${error.message}`);
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initUI();
});