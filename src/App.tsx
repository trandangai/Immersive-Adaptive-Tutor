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
import { AlertCircle, CheckCircle2, Mic, ArrowRight } from 'lucide-react';

export default function App() {
  // Authentication & Profile
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [hasDriveToken, setHasDriveToken] = useState(false);

  // App Navigation & Views
  const [activeTab, setActiveTab] = useState<'tutor' | 'flashcards' | 'history'>('tutor');
  const [viewState, setViewState] = useState<'ingest' | 'roadmap' | 'session' | 'summary'>('ingest');

  // Active Voice Session State (keeps session alive in background across tabs/views)
  const [hasActiveVoiceSession, setHasActiveVoiceSession] = useState(false);
  const [activeCheckpointIndex, setActiveCheckpointIndex] = useState(0);
  const [sessionKey, setSessionKey] = useState(1);

  // Core Data
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [completedSession, setCompletedSession] = useState<SessionRecord | null>(null);
  const [pastSessions, setPastSessions] = useState<SessionRecord[]>([]);

  // UI state
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveModalTab, setDriveModalTab] = useState<'upload' | 'samples' | 'drive'>('upload');
  const [ingestPrefill, setIngestPrefill] = useState<{ topicTitle: string; content: string } | null>(null);
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
        // Immediately reset in-memory data from any previous account/guest session
        setFlashcards([]);
        setPastSessions([]);
        setCompletedSession(null);
        setHasActiveVoiceSession(false);

        setUser(authenticatedUser);
        setHasDriveToken(Boolean(token));
        showToast(`Signed in as ${authenticatedUser.displayName || authenticatedUser.email || 'Learner'}`, 'success');

        // Sync profile & load Firestore data strictly for this authenticated account
        try {
          const userProf = await syncUserProfile({
            userId: authenticatedUser.uid,
            email: authenticatedUser.email || '',
            displayName: authenticatedUser.displayName || '',
            photoURL: authenticatedUser.photoURL || '',
          });
          setProfile(userProf);

          // Fetch only this account's flashcards from Firestore
          const userCards = await fetchUserFlashcards(authenticatedUser.uid);
          setFlashcards(userCards || []);

          // Fetch only this account's sessions from Firestore
          const userSessions = await fetchUserSessions(authenticatedUser.uid);
          setPastSessions(userSessions || []);
        } catch (err) {
          console.warn('Initial Firestore fetch warning:', err);
          setFlashcards([]);
          setPastSessions([]);
        }
      },
      () => {
        // User logged out: completely clear account-specific memory and active session caches
        setUser(null);
        setProfile(null);
        setHasDriveToken(false);
        setFlashcards([]);
        setPastSessions([]);
        setCompletedSession(null);
        setRoadmap(null);
        setHasActiveVoiceSession(false);
        try {
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('socratic_active_session_')) {
              sessionStorage.removeItem(key);
            }
          });
        } catch {}
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
      setUser(null);
      setProfile(null);
      setHasDriveToken(false);
      setFlashcards([]);
      setPastSessions([]);
      setCompletedSession(null);
      setRoadmap(null);
      setHasActiveVoiceSession(false);
      try {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('socratic_active_session_')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch {}
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
      setHasActiveVoiceSession(false);
      setActiveCheckpointIndex(0);
      setSessionKey(k => k + 1);
      setViewState('roadmap');
      setActiveTab('tutor');
      showToast(`Roadmap ready: ${generatedRoadmap.topicTitle}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error generating roadmap', 'error');
    } finally {
      setIsLoadingRoadmap(false);
    }
  };

  // Handle Navigation
  const handleNavigateHome = () => {
    setLegalPage('none');
    setActiveTab('tutor');
    setViewState('ingest');
  };

  const handleResumeVoiceSession = () => {
    setActiveTab('tutor');
    setViewState('session');
  };

  const handleStartVoiceSession = (restart = false) => {
    if (restart) {
      if (roadmap) {
        try {
          sessionStorage.removeItem(`socratic_active_session_${roadmap.topicTitle.replace(/[^a-zA-Z0-9]/g, '_')}`);
        } catch {}
      }
      setSessionKey(k => k + 1);
      setActiveCheckpointIndex(0);
    }
    setHasActiveVoiceSession(true);
    setViewState('session');
    setActiveTab('tutor');
  };

  // Handle Google Drive / Document Upload selection
  const handleDriveDocumentImported = (content: string, filename: string, autoGenerate: boolean = true) => {
    const cleanTitle = filename.replace(/\.[^/.]+$/, '').trim();
    setIngestPrefill({ topicTitle: cleanTitle, content });

    if (autoGenerate) {
      handleGenerateRoadmap(content, cleanTitle);
    } else {
      setViewState('ingest');
      setActiveTab('tutor');
      showToast(`Loaded document: ${cleanTitle}`, 'info');
    }
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
    setHasActiveVoiceSession(false);
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
      // Save flashcards
      const cards = cardsToSave || flashcards;
      for (const card of cards) {
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

  // Real-time flashcard generated during session
  const handleFlashcardGenerated = async (card: Flashcard) => {
    setFlashcards(prev => {
      if (prev.some(c => c.id === card.id)) return prev;
      return [card, ...prev];
    });

    if (user) {
      try {
        await saveFlashcardDoc(user.uid, card);
      } catch (err) {
        console.warn('Could not auto-save generated flashcard to Firestore:', err);
      }
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
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'tutor' && hasActiveVoiceSession) {
            setViewState('session');
          }
        }}
        flashcardCount={flashcards.length}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenTestRunner={() => setIsTestRunnerOpen(true)}
        onNavigateHome={handleNavigateHome}
        hasActiveVoiceSession={hasActiveVoiceSession}
        onResumeVoiceSession={handleResumeVoiceSession}
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
                    onOpenDriveModal={(tab = 'upload') => {
                      setDriveModalTab(tab);
                      setIsDriveModalOpen(true);
                    }}
                    isLoading={isLoadingRoadmap}
                    initialTopic={ingestPrefill?.topicTitle}
                    initialContent={ingestPrefill?.content}
                  />
                )}

                {viewState === 'roadmap' && roadmap && (
                  <RoadmapView
                    roadmap={roadmap}
                    onStartSession={() => handleStartVoiceSession(hasActiveVoiceSession)}
                    onResumeSession={handleResumeVoiceSession}
                    hasActiveSession={hasActiveVoiceSession}
                    activeCheckpointIndex={activeCheckpointIndex}
                    onReset={() => {
                      setHasActiveVoiceSession(false);
                      setViewState('ingest');
                    }}
                  />
                )}

                {viewState === 'summary' && completedSession && (
                  <SummaryDashboard
                    session={completedSession}
                    flashcards={flashcards}
                    onStartNewSession={() => {
                      setRoadmap(null);
                      setHasActiveVoiceSession(false);
                      setViewState('ingest');
                    }}
                    onSaveToCloud={() => saveSessionToCloud()}
                    isSaving={isSavingSession}
                  />
                )}
              </>
            )}

            {/* Socratic Voice Session - Preserved in DOM across all tabs while session is active to prevent repeating speech and maintain live dialogue */}
            {hasActiveVoiceSession && roadmap && (
              <div className={activeTab === 'tutor' && viewState === 'session' ? 'block w-full' : 'hidden'}>
                <SocraticVoiceSession
                  key={sessionKey}
                  roadmap={roadmap}
                  userId={user?.uid}
                  isActive={activeTab === 'tutor' && viewState === 'session'}
                  onCheckpointIndexChange={setActiveCheckpointIndex}
                  onFinishSession={handleFinishVoiceSession}
                  onFlashcardGenerated={handleFlashcardGenerated}
                  onBackToRoadmap={() => setViewState('roadmap')}
                />
              </div>
            )}

            {/* TAB 2: Flashcards Deck */}
            {activeTab === 'flashcards' && (
              <div className="max-w-4xl mx-auto w-full">
                <FlashcardsDeck
                  flashcards={flashcards}
                  currentUserEmail={user?.email}
                  onToggleMastery={handleToggleCardMastery}
                />
              </div>
            )}

            {/* TAB 3: History Drawer */}
            {activeTab === 'history' && (
              <div className="w-full">
                <HistoryDrawer
                  sessions={pastSessions}
                  currentUserEmail={user?.email}
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

      {/* Floating Active Voice Session Quick-Return Dock */}
      {hasActiveVoiceSession && (viewState !== 'session' || activeTab !== 'tutor') && roadmap && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/95 dark:bg-[#080e1e]/95 backdrop-blur-xl border border-cyan-400/60 dark:border-cyan-500/50 shadow-2xl shadow-cyan-500/25 text-slate-900 dark:text-slate-100">
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Voice Session in Progress</span>
              </p>
              <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono truncate max-w-[220px]">
                Checkpoint {activeCheckpointIndex + 1}: {roadmap.checkpoints[activeCheckpointIndex]?.title || roadmap.topicTitle}
              </p>
            </div>
            <button
              onClick={handleResumeVoiceSession}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 active:scale-95 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 cursor-pointer transition-all whitespace-nowrap"
            >
              <Mic className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span>Back to Cockpit</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
            </button>
          </div>
        </div>
      )}

      {/* Footer with Privacy Policy and Terms of Service links */}
      <Footer onNavigate={handleNavigateLegal} />

      {/* Google Drive Browser Modal */}
      <DriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onSelectDocument={handleDriveDocumentImported}
        initialTab={driveModalTab}
      />

      {/* System Test Functions & Diagnostics Modal */}
      <TestRunnerModal
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
      />
    </div>
  );
}
