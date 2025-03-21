import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBdykKdxVObEfRhXBan03inX5O8v8498-E",
    authDomain: "chatapp-for-saas.firebaseapp.com",
    databaseURL: "https://chatapp-for-saas-default-rtdb.firebaseio.com/",
    projectId: "chatapp-for-saas",
    storageBucket: "chatapp-for-saas.appspot.com",
    messagingSenderId: "478952298721",
    appId: "1:478952298721:web:d837d1ae272a072854bfa0"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getDatabase(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { auth, googleProvider, db };
