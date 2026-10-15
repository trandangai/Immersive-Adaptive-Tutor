import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firebaseConfig.firestoreDatabaseId as required by the Firebase Skill
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Google Auth Provider (Standard profile & email - 100% verified by Google with zero warning prompts)
export const googleProvider = new GoogleAuthProvider();

// Google Drive Auth Provider (Only invoked when user explicitly requests Drive import)
export const driveProvider = new GoogleAuthProvider();
driveProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
driveProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'online',
});

// In-memory token caching (NOT in localStorage, as mandated by security skill)
let cachedAccessToken: string | null = null;
let cachedDriveAccessToken: string | null = null;
let isSigningIn = false;

// Test Firestore connection on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or waiting for auth.');
    }
    return false;
  }
}

// Auth State Listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string | null }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign-in failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Request Drive access on-demand when user explicitly connects Google Drive
export const requestGoogleDriveAccess = async (): Promise<string | null> => {
  try {
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;
    cachedDriveAccessToken = token;
    return token;
  } catch (error) {
    console.error('Google Drive authorization failed:', error);
    throw error;
  }
};

// Access token getters
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  return cachedDriveAccessToken;
};

// Set tokens manually if refreshed
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const setDriveAccessToken = (token: string | null) => {
  cachedDriveAccessToken = token;
};

// Sign out
export const logOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedDriveAccessToken = null;
};
