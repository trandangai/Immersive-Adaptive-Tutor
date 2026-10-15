import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  FolderOpen,
  ArrowRight,
  Dna,
  Cpu,
  Network,
  Atom,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  FileUp,
  Maximize2,
  Minimize2,
  ClipboardPaste,
  Trash2,
} from 'lucide-react';

interface MaterialIngestionProps {
  onGenerateRoadmap: (content: string, topicTitle: string) => void;
  onOpenDriveModal: (tab?: 'upload' | 'samples' | 'drive') => void;
  isLoading: boolean;
  initialTopic?: string;
  initialContent?: string;
}

export const SAMPLE_TOPICS = [
  {
    title: 'Cellular Respiration & ATP Synthase',
    subject: 'Biochemistry / Cellular Biology',
    icon: Dna,
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
    description: 'Glycolysis, the citric acid cycle, and chemiosmosis driven by mitochondrial rotary motors.',
    starterContent: `Cellular respiration synthesizes ATP via Glycolysis (cytoplasm), Pyruvate Oxidation (mitochondrial matrix), Krebs Cycle, and Oxidative Phosphorylation.
The Electron Transport Chain establishes a proton-motive force across the inner mitochondrial membrane. Chemiosmosis harnesses this gradient through ATP Synthase rotary catalysis to yield ~30-32 ATP per glucose under aerobic conditions.`,
  },
  {
    title: 'Distributed Consensus & Raft Protocol',
    subject: 'Computer Science / Distributed Systems',
    icon: Network,
    color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
    description: 'Leader elections, randomized timeouts, majority quorums, and replicated state machine safety.',
    starterContent: `Distributed consensus ensures a cluster of nodes agree on state transitions despite node crashes and network delays.
The Raft protocol decomposes consensus into Leader Election (randomized election timeouts), Log Replication (AppendEntries RPCs committed by majority quorum), and Safety invariants (Leader Completeness).`,
  },
  {
    title: 'Neural Network Backpropagation',
    subject: 'Deep Learning / Applied Mathematics',
    icon: Cpu,
    color: 'text-violet-400 bg-violet-950/40 border-violet-500/30',
    description: 'Multivariable calculus chain rule, reverse-mode automatic differentiation, and gradient descent.',
    starterContent: `Backpropagation calculates the analytical gradient of an objective loss function with respect to weight tensors in neural networks.
It utilizes the multivariable chain rule from the output layer backwards through hidden activation layers, enabling gradient descent and adaptive moment optimization (Adam).`,
  },
  {
    title: 'Quantum Superposition & Qubits',
    subject: 'Quantum Computing & Modern Physics',
    icon: Atom,
    color: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
    description: 'Bloch spheres, state vectors, projective wave function collapse, and non-local entanglement.',
    starterContent: `Unlike classical bits, a quantum bit (qubit) exists in a continuous linear superposition |ψ⟩ = α|0⟩ + β|1⟩ normalized such that |α|² + |β|² = 1.
Upon projective measurement, the wave function collapses probabilistically. Multi-qubit Bell states demonstrate non-local quantum entanglement violating Bell inequalities.`,
  },
];

export const MaterialIngestion: React.FC<MaterialIngestionProps> = ({
  onGenerateRoadmap,
  onOpenDriveModal,
  isLoading,
  initialTopic,
  initialContent,
}) => {
  const [inputText, setInputText] = useState(initialContent || '');
  const [topicName, setTopicName] = useState(initialTopic || '');
  const [isExpandedNotes, setIsExpandedNotes] = useState(false);
  const [sourceBadge, setSourceBadge] = useState<string | null>(null);
  const [isExtractingLocal, setIsExtractingLocal] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Sync when initial props change
  useEffect(() => {
    if (initialTopic !== undefined) setTopicName(initialTopic);
    if (initialContent !== undefined) {
      setInputText(initialContent);
      if (initialTopic) setSourceBadge(initialTopic);
    }
  }, [initialTopic, initialContent]);

  const handleSelectSample = (sample: typeof SAMPLE_TOPICS[0]) => {
    setTopicName(sample.title);
    setInputText(sample.starterContent);
    setSourceBadge(sample.title);
    setExtractError(null);
  };

  const handleClear = () => {
    setTopicName('');
    setInputText('');
    setSourceBadge(null);
    setExtractError(null);
  };

  const processDirectFile = async (file: File) => {
    setIsExtractingLocal(true);
    setExtractError(null);

    try {
      const lowerName = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
      const isDocx = lowerName.endsWith('.docx') || file.type.includes('wordprocessingml');

      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      if (isPdf || isDocx) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || '');
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64Data = await base64Promise;

        const res = await fetch('/api/extract-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            filename: file.name,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to extract curriculum text from ${file.name}`);
        }

        const data = await res.json();
        const text = (data.text || '').trim();

        if (!text) {
          throw new Error('No readable text could be extracted from this document.');
        }

        setTopicName(cleanTitle);
        setInputText(text);
        setSourceBadge(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      } else {
        const text = (await file.text()).trim();
        if (!text) {
          throw new Error('The selected text file is empty.');
        }
        setTopicName(cleanTitle);
        setInputText(text);
        setSourceBadge(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Error extracting document');
    } finally {
      setIsExtractingLocal(false);
    }
  };

  const handleDirectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processDirectFile(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processDirectFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = inputText.trim();
    const finalTitle = topicName.trim() || 'Curriculum Study Session';
    if (!finalContent && !finalTitle) return;
    onGenerateRoadmap(finalContent, finalTitle);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Editorial Hero Intro */}
      <div className="text-center space-y-3 pt-4">
        <div className="text-xs font-mono font-bold tracking-widest text-slate-500 dark:text-slate-400">
          <span>AI BUILDER CUP 2026</span>
          <span className="mx-2 text-cyan-600 dark:text-cyan-500" aria-hidden="true">·</span>
          <span className="text-cyan-600 dark:text-cyan-400 uppercase">TWO-WAY VOICE ADAPTIVE COCKPIT</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Transform Dense Knowledge Into{' '}
          <span className="bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-500 dark:from-cyan-400 dark:via-teal-300 dark:to-cyan-200 bg-clip-text text-transparent">
            Socratic Voice Dialogue
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload any lecture syllabus, PDF, Word doc, or paste textbook notes. The AI maps a progressive learning roadmap strictly grounded in your material.
        </p>
      </div>

      {/* Main Material Input Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white/95 dark:bg-[#080d1a]/95 backdrop-blur-2xl border rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl relative overflow-hidden transition-all ${
          isDragging
            ? 'border-cyan-500 ring-2 ring-cyan-500/40 bg-cyan-50/50 dark:bg-cyan-950/30'
            : 'border-slate-200 dark:border-cyan-500/20'
        }`}
      >
        {/* Subtle top cyan light border */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

        {/* Hidden file input for direct upload */}
        <input
          type="file"
          ref={directFileInputRef}
          onChange={handleDirectFileChange}
          accept=".pdf,.docx,.txt,.md,.json,.csv"
          className="hidden"
        />

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <label className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Source Material or Curriculum Topic
              </label>
            </div>

            {/* Import Document Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => directFileInputRef.current?.click()}
                disabled={isExtractingLocal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors shadow-xs cursor-pointer"
                title="Select a PDF, DOCX, or text file directly from your computer"
              >
                {isExtractingLocal ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Upload File (PDF / DOCX)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onOpenDriveModal('drive')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-700/50 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors shadow-xs cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Google Drive
              </button>

              <button
                type="button"
                onClick={() => onOpenDriveModal('samples')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Sample Curricula
              </button>
            </div>
          </div>

          {extractError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{extractError}</span>
              </div>
              <button
                type="button"
                onClick={() => setExtractError(null)}
                className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {sourceBadge && (
            <div className="p-2.5 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-600/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-semibold truncate">Loaded: {sourceBadge}</span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-emerald-700 dark:text-emerald-400 hover:underline text-[11px] font-mono shrink-0 cursor-pointer ml-2"
              >
                Clear
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Topic Title
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Used to title the learning checkpoints
              </span>
            </div>
            <input
              type="text"
              value={topicName}
              onChange={e => setTopicName(e.target.value)}
              placeholder="e.g. Cellular Respiration & ATP Synthase (Topic Title)"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-cyan-500/25 bg-slate-50 dark:bg-[#040813] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-400 mb-3 transition-colors font-medium"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Detailed Study Material & Notes
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  ({inputText.trim() ? inputText.trim().split(/\s+/).length : 0} words • {inputText.length} chars)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setInputText(prev => (prev ? `${prev}\n\n${text}` : text));
                      }
                    } catch {}
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Paste text from clipboard"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>

                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Clear study notes"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsExpandedNotes(!isExpandedNotes)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isExpandedNotes
                      ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300'
                  }`}
                  title={isExpandedNotes ? 'Collapse notes view' : 'Expand notes view for large documents'}
                >
                  {isExpandedNotes ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isExpandedNotes ? 'Compact' : 'Expand View'}</span>
                </button>
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              rows={isExpandedNotes ? 14 : 7}
              placeholder="Paste raw lecture notes, syllabus concepts, textbook paragraphs, or drop a PDF/DOCX here..."
              className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-cyan-500/25 bg-slate-50 dark:bg-[#040813] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-400 transition-all font-mono leading-relaxed resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Gemini creates 4–5 progressive checkpoints strictly grounded in this material.
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(topicName || inputText) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  Clear Form
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || (!inputText.trim() && !topicName.trim())}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 active:scale-95 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    Synthesizing Roadmap...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    Generate Adaptive Roadmap
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Realistic Curated High-Yield Topics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Or Jump Into Curated High-Yield Topics
          </span>
          <span className="text-[11px] text-cyan-600 dark:text-cyan-400/80 font-mono">Click to autofill</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {SAMPLE_TOPICS.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = topicName === item.title;
            return (
              <div
                key={idx}
                onClick={() => handleSelectSample(item)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group bg-white/90 dark:bg-[#080d1a]/80 backdrop-blur-md ${
                  isSelected
                    ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'border-slate-200 dark:border-cyan-950/80 hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:bg-slate-50 dark:hover:bg-[#0c1426]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl border ${item.color} group-hover:scale-105 transition-transform shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {item.subject}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors mt-0.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
