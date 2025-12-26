
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyASt7FZ1p8Ggfc2KQjsojIh6zl8fYzP9fo",
  authDomain: "vedarthainvoice.firebaseapp.com",
  databaseURL: "https://vedarthainvoice-default-rtdb.firebaseio.com",
  projectId: "vedarthainvoice",
  storageBucket: "vedarthainvoice.firebasestorage.app",
  messagingSenderId: "616190681776",
  appId: "1:616190681776:web:d90ac589d3187650d65175",
  measurementId: "G-3FVXTX6HQB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
