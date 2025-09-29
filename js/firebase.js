import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update,
  push,
  onValue
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { 
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  ref,
  set,
  get,
  update,
  push,
  onValue
};