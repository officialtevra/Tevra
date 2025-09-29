import { 
  auth,
  db,
  ref,
  set,
  get,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from './firebase.js';

// Improved wallet address generator
function generateWalletAddress(userId) {
  // Crypto-friendly character set (removed ambiguous characters)
  const cryptoChars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const hexChars = '0123456789abcdef';
  
  // Create hash from user ID for more uniqueness
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  hash = Math.abs(hash);

  // Generate 35-character mixed string
  let addressPart = '';
  const timestamp = Date.now().toString(36).slice(-8);
  
  for (let i = 0; i < 35; i++) {
    // Alternate between crypto chars and hex chars for better appearance
    const charset = i % 2 === 0 ? cryptoChars : hexChars;
    const seed = (hash + i + timestamp.charCodeAt(i % timestamp.length)) % charset.length;
    addressPart += charset[seed];
  }

  // Ensure no trailing zeros or patterns
  while (addressPart.endsWith('0') || 
         addressPart.endsWith('000') || 
         /(.)\1{3,}$/.test(addressPart)) {
    addressPart = addressPart.slice(0, -1) + 
                 cryptoChars[(hash + addressPart.length) % cryptoChars.length];
  }

  const walletAddress = 'CRX' + addressPart;
  
  // Final validation
  if (walletAddress.length !== 38) {
    console.error('Invalid address length:', walletAddress);
    // Fallback generation
    return 'CRX' + Array.from({length: 35}, (_, i) => 
      cryptoChars[(hash + i) % cryptoChars.length]).join('');
  }

  return walletAddress;
}

// Registration function
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const mpin = document.getElementById('mpin').value;
  
  // Validation
  if (!name || !email || !password || !mpin) {
    alert('Please fill all fields');
    return;
  }
  
  if (password.length < 8 || password.length > 12) {
    alert('Password must be 8-12 characters');
    return;
  }
  
  if (!/^\d{6}$/.test(mpin)) {
    alert('MPIN must be 6 digits');
    return;
  }

  try {
    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 2. Send email verification
    await sendEmailVerification(user);
    
    // 3. Generate wallet address (38 characters)
    const walletAddress = generateWalletAddress(user.uid);
    
    // 4. Prepare user data
    const userData = {
      name,
      email,
      mpin,
      uid: walletAddress,
      balance: 0.10,
      createdAt: new Date().toISOString(),
      emailVerified: false
    };
    
    // 5. Save to database
    await set(ref(db, `users/${user.uid}`), userData);
    
    alert(`Registration successful! Verification link sent to ${email}\nYour wallet address: ${walletAddress}`);
    window.location.href = 'verify-email.html';
  } catch (error) {
    console.error('Registration error:', error);
    
    let errorMessage = 'Registration failed. Please try again.';
    switch(error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Email already registered';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Please enter valid email';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password must be 8-12 characters';
        break;
      case 'PERMISSION_DENIED':
        errorMessage = 'Database error. Please contact support';
        break;
    }
    
    alert(errorMessage);
  }
});

// Login function with email verification check
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if email is verified
    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error('EMAIL_NOT_VERIFIED');
    }
    
    // Verify user exists in database
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      await signOut(auth);
      throw new Error('User data not found. Please register again.');
    }
    
    window.location.href = 'profile.html';
  } catch (error) {
    console.error('Login error:', error);
    
    let errorMessage = 'Login failed. Please try again.';
    if (error.code === 'auth/user-not-found' || error.message === 'User data not found. Please register again.') {
      errorMessage = 'No account found with this email.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password.';
    } else if (error.message === 'EMAIL_NOT_VERIFIED') {
      errorMessage = 'Email not verified. Please check your inbox for verification link.';
    }
    
    alert(errorMessage);
  }
});

// Logout function
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = '../login.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed. Please try again.');
  }
});
