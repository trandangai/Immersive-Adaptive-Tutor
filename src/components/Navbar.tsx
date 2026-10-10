import React from 'react';
import { User } from 'firebase/auth';
import { LearnerProfile } from '../types/index.ts';
import {
  Sparkles,
  BookOpen,
  Layers,
  History,
  FolderOpen,
  LogOut,
  Moon,
  Sun,
  FlaskConical,
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  profile: LearnerProfile | null;
  hasDriveToken: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  activeTab: 'tutor' | 'flashcards' | 'history';
  setActiveTab: (tab: 'tutor' | 'flashcards' | 'history') => void;
  flashcardCount: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenDriveModal: () => void;
  onOpenTestRunner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  profile,
  hasDriveToken,
  onSignIn,
  onSignOut,
  activeTab,
  setActiveTab,
  flashcardCount,
  darkMode,
  setDarkMode,
  onOpenDriveModal,
  onOpenTestRunner,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#070b16]/90 backdrop-blur-xl border-b border-slate-200 dark:border-cyan-950/40 shadow-xs dark:shadow-none transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
            <Sparkles className="w-4.5 h-4.5 text-cyan-100" />
          </div>
          <div>
            <div className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="bg-gradient-to-r from-cyan-600 via-teal-600 to-violet-600 dark:from-slate-100 dark:via-cyan-100 dark:to-cyan-400 bg-clip-text text-transparent">
                Immersive Adaptive Tutor
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Two-Way Socratic Voice <span className="text-cyan-600 dark:text-cyan-500/60 font-mono">·</span> Live Cognitive Telemetry
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-[#0b1220]/90 rounded-xl text-xs font-semibold border border-slate-200 dark:border-cyan-950/60 shadow-inner transition-colors">
          <button
            onClick={() => setActiveTab('tutor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'tutor'
                ? 'bg-white text-cyan-800 border border-cyan-300 shadow-xs dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Tutor
          </button>
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'flashcards'
                ? 'bg-white text-violet-800 border border-violet-300 shadow-xs dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            Flashcards
            {flashcardCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300 font-mono font-bold">
                {flashcardCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-emerald-800 border border-emerald-300 shadow-xs dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            History
          </button>
        </nav>

        {/* Right Section: Diagnostics/Tests, Drive Badge, Theme Toggle, Google Sign-in */}
        <div className="flex items-center gap-2">
          {/* Test Functions / Diagnostics Button */}
          <button
            onClick={onOpenTestRunner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 shadow-xs transition-all cursor-pointer"
            title="Open Interactive System Test Functions & Diagnostics"
          >
            <FlaskConical className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Tests</span>
          </button>

          {/* Drive Status Badge */}
          <button
            onClick={onOpenDriveModal}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              hasDriveToken
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50 shadow-xs'
                : 'bg-slate-100 dark:bg-cyan-950/30 text-slate-700 dark:text-cyan-300 border-slate-200 dark:border-cyan-800/50 hover:bg-slate-200/60 dark:hover:bg-cyan-900/40'
            }`}
            title={hasDriveToken ? 'Google Drive active' : 'Connect Google Drive'}
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{hasDriveToken ? 'Drive Connected' : 'Connect Drive'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl text-slate-600 hover:text-cyan-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Authentication Button (Material Google Sign-in) */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden ring-2 ring-cyan-500/30">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  (user.displayName?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[110px]">
                  {user.displayName || 'Learner'}
                </p>
                <p className="text-[10px] text-cyan-600 dark:text-cyan-400/80 leading-tight font-mono">
                  {profile?.topicsMasteredCount || 0} mastered
                </p>
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-cyan-800/60 bg-white dark:bg-[#0d1527] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-cyan-950/40 hover:border-slate-400 dark:hover:border-cyan-500/50 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
