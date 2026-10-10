import React from 'react';
import { MasteryLevel, PacingStatus } from '../types/index.ts';
import { Award, Zap, Activity, CheckCircle2 } from 'lucide-react';

interface TelemetryWidgetProps {
  masteryLevel: MasteryLevel;
  comprehensionScore: number;
  pacingStatus: PacingStatus;
  currentCheckpointTitle?: string;
  checkpointIndex: number;
  totalCheckpoints: number;
}

export const TelemetryWidget: React.FC<TelemetryWidgetProps> = ({
  masteryLevel,
  comprehensionScore,
  pacingStatus,
  currentCheckpointTitle,
  checkpointIndex,
  totalCheckpoints,
}) => {
  const isOptimal = pacingStatus === 'optimal';

  const masteryLabels: Record<MasteryLevel, { name: string; color: string; dot: string; glow: string }> = {
    beginner: {
      name: 'Beginner',
      color: 'text-cyan-400',
      dot: 'bg-cyan-400',
      glow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]',
    },
    intermediate: {
      name: 'Intermediate',
      color: 'text-violet-400',
      dot: 'bg-violet-400',
      glow: 'shadow-[0_0_10px_rgba(139,92,246,0.5)]',
    },
    advanced: {
      name: 'Advanced',
      color: 'text-fuchsia-400',
      dot: 'bg-fuchsia-400',
      glow: 'shadow-[0_0_10px_rgba(217,70,239,0.5)]',
    },
  };

  const currentMastery = masteryLabels[masteryLevel] || masteryLabels.beginner;
  const progressPercent = Math.round(((checkpointIndex + 1) / Math.max(1, totalCheckpoints)) * 100);

  return (
    <div className="w-full bg-white/95 dark:bg-[#0a0f1d]/90 backdrop-blur-xl border border-slate-200 dark:border-cyan-500/20 rounded-2xl p-4 shadow-md dark:shadow-xl transition-all relative overflow-hidden">
      {/* Subtle top cyan light border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Checkpoint Title & Progress */}
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-bold text-cyan-600 dark:text-cyan-400 tracking-wide uppercase text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Checkpoint {checkpointIndex + 1} of {totalCheckpoints}
            </span>
            <span className="text-slate-300 dark:text-cyan-900" aria-hidden="true">·</span>
            <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">{progressPercent}% roadmap complete</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">
            {currentCheckpointTitle || 'Foundational Principles'}
          </h3>
        </div>

        {/* Subtle Vertical Divider */}
        <div className="hidden lg:block w-px h-8 bg-slate-200 dark:bg-cyan-950/80" />

        {/* Live Mastery Tier */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#0e172a] border border-slate-200 dark:border-cyan-500/15 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Cognitive Mastery
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${currentMastery.dot} ${currentMastery.glow}`} />
              <span className={`text-xs font-extrabold tracking-wide ${currentMastery.color}`}>
                {currentMastery.name}
              </span>
            </div>
          </div>
        </div>

        {/* Subtle Vertical Divider */}
        <div className="hidden lg:block w-px h-8 bg-slate-200 dark:bg-cyan-950/80" />

        {/* Comprehension Progress */}
        <div className="flex-1 min-w-[190px]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
              <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Comprehension
            </span>
            <span className="font-extrabold text-cyan-700 dark:text-cyan-300 font-mono tracking-wider">
              {Math.min(100, Math.max(0, Math.round(comprehensionScore)))}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-[#060b17] rounded-full overflow-hidden border border-slate-200 dark:border-cyan-950">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                comprehensionScore >= 75
                  ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_10px_rgba(20,184,166,0.6)]'
                  : comprehensionScore >= 45
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                  : 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              }`}
              style={{ width: `${Math.min(100, Math.max(8, comprehensionScore))}%` }}
            />
          </div>
        </div>

        {/* Subtle Vertical Divider */}
        <div className="hidden lg:block w-px h-8 bg-slate-200 dark:bg-cyan-950/80" />

        {/* Pacing Diagnostic */}
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              isOptimal
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
            }`}
          >
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Pacing Rate
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOptimal
                    ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                }`}
              />
              <span
                className={`text-xs font-extrabold ${
                  isOptimal ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {isOptimal ? 'Optimal Pace' : 'Needs Review'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
