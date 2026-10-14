/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Roadmap,
  Flashcard,
  SessionRecord,
  LearnerProfile,
  MasteryLevel,
  SocraticMessage,
} from './types/index.ts';
import {
  initAuth,
  signInWithGoogle,
  logOut,
  getAccessToken,
  testConnection,
} from './lib/firebase.ts';
import {
  syncUserProfile,
  saveSessionRecord,
  fetchUserSessions,
  saveFlashcardDoc,
  fetchUserFlashcards,
  toggleFlashcardMastery,
} from './lib/firestoreService.ts';
import { Navbar } from './components/Navbar.tsx';
import { MaterialIngestion } from './components/MaterialIngestion.tsx';
import { RoadmapView } from './components/RoadmapView.tsx';
import { SocraticVoiceSession } from './components/SocraticVoiceSession.tsx';
import { SummaryDashboard } from './components/SummaryDashboard.tsx';
import { FlashcardsDeck } from './components/FlashcardsDeck.tsx';
import { HistoryDrawer } from './components/HistoryDrawer.tsx';
import { DriveModal } from './components/DriveModal.tsx';
import { TestRunnerModal } from './components/TestRunnerModal.tsx';
import { PrivacyPolicy } from './components/PrivacyPolicy.tsx';
import { TermsOfService } from './components/TermsOfService.tsx';
import { Footer } from './components/Footer.tsx';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Authentication & Profile
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [hasDriveToken, setHasDriveToken] = useState(false);

  // App Navigation & Views
  const [activeTab, setActiveTab] = useState<'tutor' | 'flashcards' | 'history'>('tutor');
  const [viewState, setViewState] = useState<'ingest' | 'roadmap' | 'session' | 'summary'>('ingest');

  // Core Data
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [completedSession, setCompletedSession] = useState<SessionRecord | null>(null);
  const [pastSessions, setPastSessions] = useState<SessionRecord[]>([]);

  // UI state
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  // Persistent dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return true; // default to dark deep-space theme
    }
    return true;
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [legalPage, setLegalPage] = useState<'none' | 'privacy' | 'terms'>('none');

  // Handle URL routes for Privacy Policy and Terms of Service (Google OAuth requirement)
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/privacy' || path === '/privacy-policy') {
        setLegalPage('privacy');
      } else if (path === '/terms' || path === '/terms-of-service') {
        setLegalPage('terms');
      } else {
        setLegalPage('none');
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  const handleNavigateLegal = (view: 'privacy' | 'terms' | 'app') => {
    if (view === 'privacy') {
      window.history.pushState({}, '', '/privacy');
      setLegalPage('privacy');
    } else if (view === 'terms') {
      window.history.pushState({}, '', '/terms');
      setLegalPage('terms');
    } else {
      window.history.pushState({}, '', '/');
      setLegalPage('none');
    }
  };

  // Sync dark class on documentElement and persist
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Auth & DB Initialization
  useEffect(() => {
    testConnection();

    const unsubscribe = initAuth(
      async (authenticatedUser, token) => {
        setUser(authenticatedUser);
        setHasDriveToken(Boolean(token));
        showToast(`Signed in as ${authenticatedUser.displayName || 'Learner'}`, 'success');

        // Sync profile & load Firestore data
        try {
          const userProf = await syncUserProfile({
            userId: authenticatedUser.uid,
            email: authenticatedUser.email || '',
            displayName: authenticatedUser.displayName || '',
            photoURL: authenticatedUser.photoURL || '',
          });
          setProfile(userProf);

          const userCards = await fetchUserFlashcards(authenticatedUser.uid);
          if (userCards && userCards.length > 0) {
            setFlashcards(userCards);
          }

          const userSessions = await fetchUserSessions(authenticatedUser.uid);
          if (userSessions && userSessions.length > 0) {
            setPastSessions(userSessions);
          }
        } catch (err) {
          console.warn('Initial Firestore fetch warning:', err);
        }
      },
      () => {
        setUser(null);
        setProfile(null);
        setHasDriveToken(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSignIn = async () => {
    try {
      const res = await signInWithGoogle();
      if (res.accessToken) {
        setHasDriveToken(true);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sign-in failed', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      showToast('Signed out successfully', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Generate Session Roadmap from content or topic title
  const handleGenerateRoadmap = async (content: string, topicTitle: string) => {
    setIsLoadingRoadmap(true);
    try {
      const res = await fetch('/api/gemini/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, topicTitle }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate roadmap from AI');
      }

      const generatedRoadmap: Roadmap = await res.json();
      setRoadmap(generatedRoadmap);
      setViewState('roadmap');
      setActiveTab('tutor');
      showToast(`Roadmap ready: ${generatedRoadmap.topicTitle}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error generating roadmap', 'error');
    } finally {
      setIsLoadingRoadmap(false);
    }
  };

  // Handle Google Drive Document selection
  const handleDriveDocumentImported = (content: string, filename: string) => {
    handleGenerateRoadmap(content, filename.replace(/\.[^/.]+$/, ''));
  };

  // Complete Tutoring Session
  const handleFinishVoiceSession = async (data: {
    messages: SocraticMessage[];
    flashcards: Flashcard[];
    masteryLevel: MasteryLevel;
    comprehensionScore: number;
    topicsMastered: string[];
    topicsNeedingReview: string[];
    notes: string[];
  }) => {
    if (!roadmap) return;

    // Merge new flashcards
    if (data.flashcards.length > 0) {
      setFlashcards(prev => {
        const combined = [...data.flashcards, ...prev];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique;
      });
    }

    const sessionSummaryNotes = data.notes.map(n => `- ${n}`).join('\n');

    const newRecord: SessionRecord = {
      id: `session-${Date.now()}`,
      userId: user?.uid || 'guest-learner',
      topicTitle: roadmap.topicTitle,
      subjectArea: roadmap.subjectArea,
      masteryLevel: data.masteryLevel,
      comprehensionScore: data.comprehensionScore,
      pacingStatus: 'optimal',
      summaryNotes: sessionSummaryNotes,
      topicsMastered: data.topicsMastered.length > 0 ? data.topicsMastered : [roadmap.checkpoints[0]?.title || 'Core Principles'],
      topicsNeedingReview: data.topicsNeedingReview,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCompletedSession(newRecord);
    setPastSessions(prev => [newRecord, ...prev]);
    setViewState('summary');

    // Auto-save to Firestore if signed in
    if (user) {
      saveSessionToCloud(newRecord, data.flashcards);
    }
  };

  const saveSessionToCloud = async (recordToSave?: SessionRecord, cardsToSave?: Flashcard[]) => {
    if (!user) {
      showToast('Please sign in to save your sessions to the database', 'info');
      return;
    }
    const session = recordToSave || completedSession;
    if (!session) return;

    setIsSavingSession(true);
    try {
      await saveSessionRecord(user.uid, session);

      // Save flashcards
      const cards = cardsToSave || flashcards;
      for (const card of cards.slice(0, 5)) {
        await saveFlashcardDoc(user.uid, card);
      }

      showToast('Session & Flashcards saved to Firestore!', 'success');
    } catch (err) {
      showToast('Failed to save to database', 'error');
      console.error(err);
    } finally {
      setIsSavingSession(false);
    }
  };

  // Toggle Flashcard Mastery
  const handleToggleCardMastery = async (cardId: string, currentStatus: boolean) => {
    const updatedStatus = !currentStatus;
    setFlashcards(prev =>
      prev.map(c => (c.id === cardId ? { ...c, mastered: updatedStatus } : c))
    );

    if (user) {
      try {
        await toggleFlashcardMastery(user.uid, cardId, updatedStatus);
      } catch (e) {
        console.warn('Could not update card in Firestore:', e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050811] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 relative selection:bg-cyan-500/30 selection:text-cyan-800 dark:selection:text-cyan-200">
      {/* Ambient Deep Space / Clean Studio Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl transition-opacity" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-violet-600/10 dark:bg-violet-600/5 rounded-full blur-3xl transition-opacity" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-cyan-600/10 dark:bg-cyan-600/5 rounded-full blur-3xl transition-opacity" />
      </div>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md border ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800'
                : 'bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/90 dark:text-indigo-200 dark:border-indigo-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-indigo-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Navbar
        user={user}
        profile={profile}
        hasDriveToken={hasDriveToken}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        flashcardCount={flashcards.length}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenTestRunner={() => setIsTestRunnerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col justify-start">
        {legalPage === 'privacy' && (
          <PrivacyPolicy onBack={() => handleNavigateLegal('app')} />
        )}

        {legalPage === 'terms' && (
          <TermsOfService onBack={() => handleNavigateLegal('app')} />
        )}

        {legalPage === 'none' && (
          <>
            {/* TAB 1: Socratic Tutor Workflow */}
            {activeTab === 'tutor' && (
              <>
                {viewState === 'ingest' && (
                  <MaterialIngestion
                    onGenerateRoadmap={handleGenerateRoadmap}
                    onOpenDriveModal={() => setIsDriveModalOpen(true)}
                    isLoading={isLoadingRoadmap}
                  />
                )}

                {viewState === 'roadmap' && roadmap && (
                  <RoadmapView
                    roadmap={roadmap}
                    onStartSession={() => setViewState('session')}
                    onReset={() => setViewState('ingest')}
                  />
                )}

                {viewState === 'session' && roadmap && (
                  <SocraticVoiceSession
                    roadmap={roadmap}
                    onFinishSession={handleFinishVoiceSession}
                    onBackToRoadmap={() => setViewState('roadmap')}
                  />
                )}

                {viewState === 'summary' && completedSession && (
                  <SummaryDashboard
                    session={completedSession}
                    flashcards={flashcards}
                    onStartNewSession={() => {
                      setRoadmap(null);
                      setViewState('ingest');
                    }}
                    onSaveToCloud={() => saveSessionToCloud()}
                    isSaving={isSavingSession}
                  />
                )}
              </>
            )}

            {/* TAB 2: Flashcards Deck */}
            {activeTab === 'flashcards' && (
              <div className="max-w-4xl mx-auto w-full">
                <FlashcardsDeck
                  flashcards={flashcards}
                  onToggleMastery={handleToggleCardMastery}
                />
              </div>
            )}

            {/* TAB 3: History Drawer */}
            {activeTab === 'history' && (
              <div className="w-full">
                <HistoryDrawer
                  sessions={pastSessions}
                  onSelectSession={session => {
                    setCompletedSession(session);
                    setViewState('summary');
                    setActiveTab('tutor');
                  }}
                  onStartNew={() => {
                    setViewState('ingest');
                    setActiveTab('tutor');
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer with Privacy Policy and Terms of Service links */}
      <Footer onNavigate={handleNavigateLegal} />

      {/* Google Drive Browser Modal */}
      <DriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onSelectDocument={handleDriveDocumentImported}
      />

      {/* System Test Functions & Diagnostics Modal */}
      <TestRunnerModal
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
      />
    </div>
  );
}
