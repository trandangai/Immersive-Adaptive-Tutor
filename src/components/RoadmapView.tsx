import React from 'react';
import { Roadmap } from '../types/index.ts';
import {
  Mic,
  Layers,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Play,
  CheckCircle2,
} from 'lucide-react';

interface RoadmapViewProps {
  roadmap: Roadmap;
  onStartSession: () => void;
  onReset: () => void;
  hasActiveSession?: boolean;
  onResumeSession?: () => void;
  activeCheckpointIndex?: number;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  roadmap,
  onStartSession,
  onReset,
  hasActiveSession = false,
  onResumeSession,
  activeCheckpointIndex = 0,
}) => {
  const totalTime = roadmap.checkpoints.reduce(
    (acc, cp) => acc + (cp.estimatedMinutes || 5),
    0
  );

  const handlePrimaryAction = () => {
    if (hasActiveSession && onResumeSession) {
      onResumeSession();
    } else {
      onStartSession();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Active Session Notice Banner if session is currently active */}
      {hasActiveSession && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 rounded-3xl bg-cyan-50/90 dark:bg-cyan-950/40 border-2 border-cyan-400/60 dark:border-cyan-500/50 text-cyan-950 dark:text-cyan-100 shadow-xl shadow-cyan-500/10 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700/60">
                  Live Session Active
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Checkpoint {activeCheckpointIndex + 1} of {roadmap.checkpoints.length}
                </span>
              </div>
              <p className="text-xs text-cyan-800 dark:text-cyan-300/90 mt-0.5 font-medium">
                Current topic: &ldquo;{roadmap.checkpoints[activeCheckpointIndex]?.title || roadmap.topicTitle}&rdquo;
              </p>
            </div>
          </div>

          <button
            onClick={handlePrimaryAction}
            className="self-end sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <Mic className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>Return to Voice Cockpit</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white/95 dark:bg-[#080d1a]/95 backdrop-blur-2xl border border-slate-200 dark:border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors">
        {/* Subtle top cyan light border */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-cyan-950/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-cyan-600 dark:text-cyan-400 uppercase tracking-widest text-[11px] font-bold">
                {roadmap.subjectArea}
              </span>
              <span className="text-slate-300 dark:text-cyan-800" aria-hidden="true">·</span>
              <span className="capitalize">
                Difficulty: <span className="font-bold text-slate-800 dark:text-slate-200">{roadmap.baselineDifficulty}</span>
              </span>
              <span className="text-slate-300 dark:text-cyan-800" aria-hidden="true">·</span>
              <span>{roadmap.checkpoints.length} Checkpoints</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {roadmap.topicTitle}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {roadmap.summary}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-cyan-700 dark:text-cyan-300 bg-slate-100 dark:bg-[#050914] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-cyan-950 font-mono">
              <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Est. ~{totalTime} min session</span>
            </div>
            <button
              onClick={onReset}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 flex items-center gap-1 transition-colors font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Change material
            </button>
          </div>
        </div>

        {/* Checkpoints Stepper */}
        <div className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Socratic Learning Checkpoints ({roadmap.checkpoints.length})
            </h3>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Step-by-step cognitive ladder</span>
          </div>

          <div className="space-y-3">
            {roadmap.checkpoints.map((checkpoint, idx) => {
              const isCurrentActive = hasActiveSession && idx === activeCheckpointIndex;
              const isPastCheckpoint = hasActiveSession && idx < activeCheckpointIndex;

              return (
                <div
                  key={checkpoint.id || idx}
                  className={`group relative flex items-start gap-4 p-4 rounded-2xl border transition-all shadow-xs ${
                    isCurrentActive
                      ? 'border-cyan-400 dark:border-cyan-400/80 bg-cyan-50/50 dark:bg-[#0a1529] ring-2 ring-cyan-400/20 shadow-md shadow-cyan-500/10'
                      : 'border-slate-200 dark:border-cyan-950/80 bg-white/90 dark:bg-[#060b17]/80 hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:bg-slate-50 dark:hover:bg-[#0c1426]'
                  }`}
                >
                  {/* Step indicator number */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-md transition-transform group-hover:scale-105 ${
                        isCurrentActive
                          ? 'bg-gradient-to-tr from-cyan-400 to-emerald-400 text-slate-950 ring-2 ring-cyan-300'
                          : isPastCheckpoint
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-gradient-to-tr from-cyan-600 to-cyan-400 text-slate-950 shadow-cyan-500/20'
                      }`}
                    >
                      {isPastCheckpoint ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    {idx < roadmap.checkpoints.length - 1 && (
                      <div className="w-0.5 h-10 bg-slate-200 dark:bg-cyan-950 my-1" />
                    )}
                  </div>

                  {/* Checkpoint Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                          {checkpoint.title}
                        </h4>
                        {isCurrentActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-400/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                            Current Step
                          </span>
                        )}
                      </div>
                      {checkpoint.estimatedMinutes && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          ~{checkpoint.estimatedMinutes}m
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {checkpoint.description}
                    </p>
                    <div className="mt-2.5 p-3 rounded-xl bg-cyan-50/80 dark:bg-[#03060f] border border-cyan-200 dark:border-cyan-500/20 text-xs text-cyan-900 dark:text-cyan-200 font-medium flex items-start gap-2 shadow-inner">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/60 shrink-0">
                        Check for understanding
                      </span>
                      <span className="leading-snug">&ldquo;{checkpoint.keyQuestion}&rdquo;</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button to launch / resume Voice Session */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-cyan-950/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>
              {hasActiveSession
                ? 'Your session dialogue and cognitive progress are actively maintained in memory.'
                : 'Voice engine primed with real-time Socratic reasoning & low-latency TTS.'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {hasActiveSession && (
              <button
                onClick={onStartSession}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-slate-300 dark:border-cyan-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-cyan-950/40 text-xs font-bold transition-all cursor-pointer"
                title="Start session over from the beginning"
              >
                Restart Session
              </button>
            )}

            <button
              onClick={handlePrimaryAction}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 active:scale-95 text-slate-950 font-extrabold text-sm shadow-xl shadow-cyan-500/25 transition-all cursor-pointer"
            >
              {hasActiveSession ? (
                <>
                  <Play className="w-4 h-4 text-slate-950 fill-current" />
                  <span>Resume Voice Session</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 text-slate-950 animate-pulse" />
                  <span>Launch Socratic Voice Session</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
