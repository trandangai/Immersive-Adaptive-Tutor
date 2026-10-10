import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase.ts';
import { SessionRecord, Flashcard, LearnerProfile } from '../types/index.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. User Profile
export async function syncUserProfile(profile: {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
}): Promise<LearnerProfile> {
  const path = `users/${profile.userId}`;
  try {
    const docRef = doc(db, 'users', profile.userId);
    const existingSnap = await getDoc(docRef);

    if (existingSnap.exists()) {
      const data = existingSnap.data() as LearnerProfile;
      const updated: LearnerProfile = {
        ...data,
        displayName: profile.displayName || data.displayName,
        photoURL: profile.photoURL || data.photoURL,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(docRef, {
        displayName: updated.displayName,
        photoURL: updated.photoURL || '',
        updatedAt: updated.updatedAt,
      });
      return updated;
    } else {
      const newProfile: LearnerProfile = {
        userId: profile.userId,
        email: profile.email,
        displayName: profile.displayName || 'Learner',
        photoURL: profile.photoURL || '',
        totalSessions: 0,
        topicsMasteredCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, newProfile);
      return newProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 2. Save Tutoring Session
export async function saveSessionRecord(userId: string, session: SessionRecord): Promise<void> {
  const path = `users/${userId}/sessions/${session.id}`;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
    await setDoc(sessionRef, session);

    // Update user stats
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const current = userSnap.data() as LearnerProfile;
      await updateDoc(userRef, {
        totalSessions: (current.totalSessions || 0) + 1,
        topicsMasteredCount: (current.topicsMasteredCount || 0) + (session.topicsMastered?.length || 0),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 3. Load User Sessions
export async function fetchUserSessions(userId: string): Promise<SessionRecord[]> {
  const path = `users/${userId}/sessions`;
  try {
    const sessionsCol = collection(db, 'users', userId, 'sessions');
    const q = query(sessionsCol, orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SessionRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// 4. Save Flashcard
export async function saveFlashcardDoc(userId: string, flashcard: Flashcard): Promise<void> {
  const path = `users/${userId}/flashcards/${flashcard.id}`;
  try {
    const cardRef = doc(db, 'users', userId, 'flashcards', flashcard.id);
    await setDoc(cardRef, {
      ...flashcard,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 5. Load User Flashcards
export async function fetchUserFlashcards(userId: string): Promise<Flashcard[]> {
  const path = `users/${userId}/flashcards`;
  try {
    const cardsCol = collection(db, 'users', userId, 'flashcards');
    const q = query(cardsCol, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Flashcard);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// 6. Toggle Flashcard Mastery
export async function toggleFlashcardMastery(userId: string, cardId: string, mastered: boolean): Promise<void> {
  const path = `users/${userId}/flashcards/${cardId}`;
  try {
    const cardRef = doc(db, 'users', userId, 'flashcards', cardId);
    await updateDoc(cardRef, { mastered });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
