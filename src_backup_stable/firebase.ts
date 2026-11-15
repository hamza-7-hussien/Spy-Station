import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "spy-station-new.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://spy-station-new-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "spy-station-new",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "spy-station-new.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "917373852984",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:917373852984:web:b40bc65040bdb0895ff5cd"
};

// Initialize only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.database();

let storageInstance: firebase.storage.Storage | null = null;
try {
  storageInstance = firebase.storage();
} catch (e) {
  console.warn('Firebase Storage unavailable:', e);
}

export const storage = storageInstance;
export { firebase };
