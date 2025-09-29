// Firebase configuration for tevra-161ec project
const firebaseConfig = {
    apiKey: "AIzaSyCz6eHmBmoDSTwZdX8gCPihQ626Ad8XhHk",
    authDomain: "tevra-161ec.firebaseapp.com",
    databaseURL: "https://tevra-161ec-default-rtdb.firebaseio.com",
    projectId: "tevra-161ec",
    storageBucket: "tevra-161ec.firebasestorage.app",
    messagingSenderId: "137873925109",
    appId: "1:137873925109:web:51bf2b7aa91aa30ba6f6bc",
    measurementId: "G-5JXFT6P09B"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app();
}

const auth = firebase.auth();
const db = firebase.database();

// Profile picture handling
document.getElementById('imageUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = document.getElementById('profilePicture');
    img.src = event.target.result;
    
    // Save to Firebase
    const user = auth.currentUser;
    if (user) {
      db.ref(`users/${user.uid}`).update({
        profilePicture: event.target.result
      }).then(() => {
        console.log('Profile picture updated');
      }).catch(error => {
        console.error('Error updating profile picture:', error);
      });
    }
  };
  reader.readAsDataURL(file);
});

// Load user profile with picture
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  
  db.ref(`users/${user.uid}`).once('value').then((snapshot) => {
    const userData = snapshot.val();
    if (!userData) {
      console.log('No user data found');
      return;
    }
    
    console.log('User data loaded:', userData);
    
    // Display profile picture if available
    if (userData.profilePicture) {
      document.getElementById('profilePicture').src = userData.profilePicture;
    }
    
    // Format date of birth for display
    const dobDisplay = userData.dob ? 
      new Date(userData.dob).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'Not set';

    // Display profile info
    document.getElementById('profileInfo').innerHTML = `
      <div class="profile-field">
        <span class="field-label">Name:</span>
        <span>${userData.name || 'Not set'}</span>
      </div>
      <div class="profile-field">
        <span class="field-label">Email:</span>
        <span>${userData.email || 'Not set'}</span>
      </div>
      <div class="profile-field">
        <span class="field-label">Mobile:</span>
        <span>${userData.mobile || 'Not set'}</span>
      </div>
      <div class="profile-field">
        <span class="field-label">Date of Birth:</span>
        <span>${dobDisplay}</span>
      </div>
      <div class="profile-field">
        <span class="field-label">Gender:</span>
        <span>${userData.gender ? formatGender(userData.gender) : 'Not set'}</span>
      </div>
      <div class="profile-field">
        <span class="field-label">Wallet Address:</span>
        <span>${userData.uid || 'Not generated'}</span>
      </div>
      <div class="profile-field">
        <span class="field-label">Balance:</span>
        <span>CRX ${userData.balance || '0.00'}</span>
      </div>
    `;

    // Set up edit profile form with current data
    document.getElementById('editName').value = userData.name || '';
    document.getElementById('editMobile').value = userData.mobile || '';
    document.getElementById('editDob').value = userData.dob || '';
    document.getElementById('editGender').value = userData.gender || '';
  }).catch(error => {
    console.error('Error loading user data:', error);
  });
});

// Helper function to format gender display
function formatGender(gender) {
  return gender.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Toggle MPIN change form
document.getElementById('changeMpinBtn').addEventListener('click', () => {
  document.getElementById('mpinChangeForm').classList.toggle('hidden');
});

// Toggle edit profile form
document.getElementById('editProfileBtn').addEventListener('click', () => {
  document.getElementById('editProfileForm').classList.remove('hidden');
});

// Cancel edit button
document.getElementById('cancelEdit').addEventListener('click', () => {
  document.getElementById('editProfileForm').classList.add('hidden');
});

// Change MPIN
document.getElementById('mpinForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const currentMpin = document.getElementById('currentMpin').value;
  const newMpin = document.getElementById('newMpin').value;
  
  const user = auth.currentUser;
  if (!user) {
    alert('Not authenticated');
    return;
  }
  
  db.ref(`users/${user.uid}`).once('value').then((snapshot) => {
    const userData = snapshot.val();
    if (userData.mpin !== currentMpin) {
      throw new Error('Current MPIN is incorrect');
    }
    
    return db.ref(`users/${user.uid}`).update({ mpin: newMpin });
  }).then(() => {
    alert('MPIN changed successfully');
    document.getElementById('mpinChangeForm').classList.add('hidden');
    document.getElementById('currentMpin').value = '';
    document.getElementById('newMpin').value = '';
  }).catch((error) => {
    console.error('MPIN change error:', error);
    alert(`MPIN change failed: ${error.message}`);
  });
});

// Update profile
document.getElementById('profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const updatedData = {
    name: document.getElementById('editName').value,
    mobile: document.getElementById('editMobile').value,
    dob: document.getElementById('editDob').value,
    gender: document.getElementById('editGender').value,
    lastUpdated: new Date().toISOString()
  };

  const user = auth.currentUser;
  if (!user) {
    alert('Not authenticated');
    return;
  }
  
  db.ref(`users/${user.uid}`).update(updatedData).then(() => {
    alert('Profile updated successfully!');
    document.getElementById('editProfileForm').classList.add('hidden');
    location.reload();
  }).catch((error) => {
    console.error('Profile update error:', error);
    alert(`Profile update failed: ${error.message}`);
  });
});

// Logout function
document.getElementById('logoutBtn').addEventListener('click', () => {
  auth.signOut().then(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html';
  }).catch((error) => {
    console.error('Logout error:', error);
    alert('Logout failed: ' + error.message);
  });
});