import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDtzl6tAzUWSpuqubdp9FU1PIMvK7tcl3I",
  authDomain: "spy-station-new.firebaseapp.com",
  databaseURL: "https://spy-station-new-default-rtdb.firebaseio.com",
  projectId: "spy-station-new",
  storageBucket: "spy-station-new.firebasestorage.app",
  messagingSenderId: "917373852984",
  appId: "1:917373852984:web:b40bc65040bdb0895ff5cd"
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
