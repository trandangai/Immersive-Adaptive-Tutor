import React from 'react';
import { SessionRecord } from '../types/index.ts';
import {
  History,
  Award,
  CheckCircle2,
  Calendar,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';

interface HistoryDrawerProps {
  sessions: SessionRecord[];
  onSelectSession: (session: SessionRecord) => void;
  onStartNew: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  sessions,
  onSelectSession,
  onStartNew,
}) => {
  if (sessions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-cyan-950 bg-white/50 dark:bg-[#080d1a]/50">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-100 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
          <History className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          No Session History Yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
          Start your first conversational session! Once completed, your learning progression, mastery scores, and notes are securely preserved here in Firebase Firestore.
        </p>
        <button
          onClick={onStartNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Start a New Learning Session
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-cyan-950/60">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Learning Session History
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Past adaptive Socratic sessions stored securely in Firebase Firestore
          </p>
        </div>
        <button
          onClick={onStartNew}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
        >
          + New Session
        </button>
      </div>

      <div className="space-y-3">
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session)}
            className="p-5 rounded-2xl border border-slate-200 dark:border-cyan-950 bg-white/90 dark:bg-[#080d1a]/80 backdrop-blur-md hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:bg-slate-50 dark:hover:bg-[#0c1426] cursor-pointer transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="text-cyan-600 dark:text-cyan-400 uppercase tracking-widest text-[10px] font-mono font-bold">
                    {session.subjectArea}
                  </span>
                  <span className="text-slate-300 dark:text-cyan-800" aria-hidden="true">·</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3 h-3 text-cyan-600 dark:text-cyan-500" />
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                  {session.topicTitle}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span className="flex items-center gap-1 font-medium">
                    <Award className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="capitalize font-bold text-slate-800 dark:text-slate-200">
                      {session.masteryLevel}
                    </span>
                  </span>
                  <span className="text-slate-300 dark:text-cyan-800" aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300">{session.comprehensionScore}% score</span>
                  </span>
                  <span className="text-slate-300 dark:text-cyan-800" aria-hidden="true">·</span>
                  <span>{session.topicsMastered.length} mastered</span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-cyan-950">
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                View Report & Deck <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
