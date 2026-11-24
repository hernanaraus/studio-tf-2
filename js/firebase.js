import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvFPhD7cfNHWd0gy_o38W-FWbEHrqlqxA",
  authDomain: "estudio-tiempofuera.firebaseapp.com",
  databaseURL: "https://estudio-tiempofuera-default-rtdb.firebaseio.com",
  projectId: "estudio-tiempofuera",
  storageBucket: "estudio-tiempofuera.firebasestorage.app",
  messagingSenderId: "672703673632",
  appId: "1:672703673632:web:ce02dbe6543d888fa89345",
  measurementId: "G-RP0TG45YN1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Nodo raíz limpio en Realtime Database
export const DB_PATH = "studio_tf_v2";

// Administradores principales del sistema
export const ADMIN_EMAILS = [
  "hernan.araus@gmail.com",
  "contacto@tiempofuera.cl"
];

export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export function emailToKey(email) {
  return email.toLowerCase().trim().replace(/\./g, "_").replace(/@/g, "_at_");
}

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

// Verifica si el usuario tiene permiso para usar el sistema ("admin" | "control" | null)
export async function getUserRole(user) {
  if (!user || !user.email) return null;
  const email = user.email.toLowerCase().trim();
  if (isAdminEmail(email)) return "admin";

  const snap = await get(ref(db, `${DB_PATH}/controlUsers/${emailToKey(email)}`));
  if (snap.exists() && snap.val().active !== false) {
    return "control";
  }
  return null;
}

// Protege rutas privadas y entrega también el rol ("admin" | "control")
export function requireSession(onReady, options = { requireAdmin: false }) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("index.html");
      return;
    }
    const role = await getUserRole(user);
    if (!role) {
      await signOut(auth);
      window.location.replace("index.html?denied=1");
      return;
    }
    if (options.requireAdmin && role !== "admin") {
      window.location.replace("control.html");
      return;
    }
    if (typeof onReady === "function") {
      onReady(user, role);
    }
  });
}

export {
  auth,
  db,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
