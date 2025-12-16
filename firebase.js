

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7A_GEEy51qmy3NMWmNHpM_AEPAqXMeq8",
  authDomain: "arloid-164ff.firebaseapp.com",
  projectId: "arloid-164ff",
  storageBucket: "arloid-164ff.appspot.com",
  messagingSenderId: "839613067262",
  appId: "1:839613067262:web:83574cc7f446c45ede9aaf"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

