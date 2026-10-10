import React, { useState } from 'react';
import { Flashcard } from '../types/index.ts';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  RotateCw,
  HelpCircle,
  Brain,
} from 'lucide-react';

interface FlashcardsDeckProps {
  flashcards: Flashcard[];
  onToggleMastery?: (cardId: string, currentStatus: boolean) => void;
}

export const FlashcardsDeck: React.FC<FlashcardsDeckProps> = ({
  flashcards,
  onToggleMastery,
}) => {
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unmastered' | 'mastered'>('all');

  const filteredCards = flashcards.filter(c => {
    if (filter === 'unmastered') return !c.mastered;
    if (filter === 'mastered') return c.mastered;
    return true;
  });

  const toggleFlip = (id: string) => {
    setFlippedCardId(prev => (prev === id ? null : id));
  };

  if (flashcards.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-cyan-950 bg-white/50 dark:bg-[#080d1a]/50">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-100 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3">
          <Brain className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
          No Flashcards Generated Yet
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
          As you master checkpoints during your conversational voice session, the Socratic tutor will automatically synthesize high-yield flashcards here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Controls & Counts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-cyan-950/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Socratic Flashcard Deck
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-500/30 text-violet-800 dark:text-violet-300 font-bold font-mono">
                {flashcards.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive 3D study cards distilled from verbal reasoning breakthroughs
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#050914] rounded-xl text-xs font-semibold border border-slate-200 dark:border-cyan-950">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-cyan-800 shadow-xs border border-cyan-200 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-200'
            }`}
          >
            All ({flashcards.length})
          </button>
          <button
            onClick={() => setFilter('unmastered')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'unmastered'
                ? 'bg-white text-amber-800 shadow-xs border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-200'
            }`}
          >
            To Review ({flashcards.filter(c => !c.mastered).length})
          </button>
          <button
            onClick={() => setFilter('mastered')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'mastered'
                ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-200'
            }`}
          >
            Mastered ({flashcards.filter(c => c.mastered).length})
          </button>
        </div>
      </div>

      {/* Grid of 3D Perspective Flashcards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCards.map(card => {
          const isFlipped = flippedCardId === card.id;
          return (
            <div
              key={card.id}
              onClick={() => toggleFlip(card.id)}
              className={`min-h-[220px] rounded-3xl border p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between relative group ${
                isFlipped
                  ? 'bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 text-slate-900 border-violet-300 shadow-lg dark:bg-gradient-to-br dark:from-[#0c1428] dark:via-[#101b38] dark:to-[#181136] dark:text-white dark:border-violet-500/50 dark:shadow-xl dark:shadow-violet-500/10'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-cyan-300 hover:bg-slate-50/80 dark:bg-[#080d1a]/95 dark:text-slate-100 dark:border-cyan-950 dark:hover:border-cyan-500/40 dark:hover:bg-[#0c1426] shadow-sm'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-mono font-bold tracking-wider uppercase ${
                    isFlipped ? 'text-violet-700 dark:text-violet-300' : 'text-cyan-700 dark:text-cyan-400'
                  }`}
                >
                  {card.concept}
                </span>

                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleMastery?.(card.id, card.mastered)}
                    className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                      card.mastered
                        ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40'
                        : isFlipped
                        ? 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        : 'text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400'
                    }`}
                    title={card.mastered ? 'Mastered checkpoint' : 'Mark as mastered'}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${card.mastered ? 'fill-emerald-500 text-white dark:fill-emerald-400 dark:text-slate-950' : ''}`} />
                  </button>
                  <span
                    onClick={() => toggleFlip(card.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                    title="Click to flip"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="my-3 flex-1 flex flex-col justify-center">
                {!isFlipped ? (
                  <div>
                    <div className="text-[10px] font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      QUESTION
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {card.front}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-[10px] font-mono font-bold tracking-wider text-emerald-700 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      SOCRATIC EXPLANATION & ANALOGY
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-normal">
                      {card.back}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-2.5 border-t border-slate-200 dark:border-cyan-950/60 flex items-center justify-between text-[11px]">
                <span className={isFlipped ? 'text-violet-700 dark:text-violet-300 font-mono text-[10px]' : 'text-slate-500 dark:text-slate-400 font-mono text-[10px]'}>
                  {isFlipped ? 'Click to show question' : 'Click to flip for answer'}
                </span>
                <span className="capitalize font-mono text-[10px] font-bold text-cyan-700 dark:text-cyan-400/80">
                  {card.difficulty}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
