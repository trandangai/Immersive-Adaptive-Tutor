import React, { useState, useEffect, useRef } from 'react';
import { DriveFile } from '../types/index.ts';
import { fetchDriveFiles, fetchDriveFileContent, SAMPLE_DRIVE_DOCUMENTS } from '../lib/drive.ts';
import { getDriveAccessToken, requestGoogleDriveAccess, setDriveAccessToken, auth } from '../lib/firebase.ts';
import {
  X,
  FileText,
  Search,
  RefreshCw,
  FolderOpen,
  Sparkles,
  AlertCircle,
  Upload,
  FileUp,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Trash2,
  FileCode,
  Edit3,
} from 'lucide-react';

interface DriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (content: string, filename: string, autoGenerate?: boolean) => void;
  initialTab?: 'upload' | 'samples' | 'drive';
}

interface UploadedDocumentState {
  name: string;
  title: string;
  size: number;
  text: string;
  format: 'pdf' | 'docx' | 'text';
}

export const DriveModal: React.FC<DriveModalProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
  initialTab = 'upload',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'drive'>(initialTab);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasDriveToken, setHasDriveToken] = useState(false);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<UploadedDocumentState | null>(null);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      checkAuthAndLoad();
    }
  }, [isOpen, initialTab]);

  const checkAuthAndLoad = async () => {
    setError(null);
    try {
      const token = await getDriveAccessToken();
      if (token) {
        setHasDriveToken(true);
        loadFiles(token);
      } else {
        setHasDriveToken(false);
      }
    } catch {
      setHasDriveToken(false);
    }
  };

  const loadFiles = async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const driveFiles = await fetchDriveFiles(token);
      setFiles(driveFiles);
      setHasDriveToken(true);
    } catch (err) {
      if (err instanceof Error && err.message.includes('INSUFFICIENT_DRIVE_PERMISSIONS')) {
        setHasDriveToken(false);
        setDriveAccessToken(null);
        setError('INSUFFICIENT_PERMISSIONS');
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to fetch Drive files';
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await requestGoogleDriveAccess();
      if (token) {
        setHasDriveToken(true);
        await loadFiles(token);
      } else {
        setError('Drive access was not granted. You can upload files directly or use featured study docs.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('popup-closed-by-user')) {
        setError('Sign-in window closed before completing. Please try again or upload a file directly.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportRealFile = async (file: DriveFile) => {
    setImportingFileId(file.id);
    setError(null);
    try {
      const token = await getDriveAccessToken();
      if (!token) throw new Error('Missing Google Drive authorization. Please reconnect Drive.');
      const text = await fetchDriveFileContent(token, file);
      if (!text || text.trim().length < 10) {
        throw new Error('The selected document contains no readable text.');
      }
      onSelectDocument(text, file.name, true);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document content');
    } finally {
      setImportingFileId(null);
    }
  };

  const handleImportSampleDoc = (sample: typeof SAMPLE_DRIVE_DOCUMENTS[0]) => {
    setImportingFileId(sample.id);
    setTimeout(() => {
      onSelectDocument(sample.content, sample.name, true);
      setImportingFileId(null);
      onClose();
    }, 250);
  };

  // Local File Processing (PDF via Gemini multimodal, DOCX via Mammoth, TXT/MD via browser)
  const processLocalFile = async (file: File) => {
    setIsExtractingFile(true);
    setError(null);
    // Clear previous document immediately to prevent stale state
    setUploadedFile(null);

    try {
      const lowerName = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
      const isDocx = lowerName.endsWith('.docx') || file.type.includes('wordprocessingml');

      const cleanDefaultTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      if (isPdf || isDocx) {
        // Convert to base64 and send to /api/extract-document
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || '';
            resolve(base64);
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
        const extracted = (data.text || '').trim();

        if (!extracted) {
          throw new Error('No readable text could be extracted from this document.');
        }

        setUploadedFile({
          name: file.name,
          title: cleanDefaultTitle,
          size: file.size,
          text: extracted,
          format: isPdf ? 'pdf' : 'docx',
        });
      } else {
        // Plain text, Markdown, CSV, JSON
        const text = (await file.text()).trim();
        if (!text) {
          throw new Error('The selected text file is empty.');
        }
        setUploadedFile({
          name: file.name,
          title: cleanDefaultTitle,
          size: file.size,
          text,
          format: 'text',
        });
      }
    } catch (err) {
      setUploadedFile(null);
      setError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLocalFile(file);
    }
    // reset input so the same file can be re-selected if desired
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLocalFile(file);
    }
  };

  // Immediate generation
  const handleConfirmUpload = () => {
    if (!uploadedFile || !uploadedFile.text.trim()) {
      setError('Please upload a document with readable content first.');
      return;
    }
    onSelectDocument(uploadedFile.text.trim(), uploadedFile.title.trim() || uploadedFile.name, true);
    onClose();
  };

  // Load into main editor to inspect/edit notes first
  const handleLoadToMainEditor = () => {
    if (!uploadedFile || !uploadedFile.text.trim()) {
      setError('Please upload a document with readable content first.');
      return;
    }
    onSelectDocument(uploadedFile.text.trim(), uploadedFile.title.trim() || uploadedFile.name, false);
    onClose();
  };

  if (!isOpen) return null;

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentUser = auth.currentUser;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#02040a]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#080d1a] rounded-3xl shadow-2xl border border-slate-200 dark:border-cyan-500/20 overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Subtle top cyan light border */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-cyan-950/60 flex items-center justify-between bg-slate-50 dark:bg-[#050914]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-100 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Import Learning Material
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a device document, pre-loaded curriculum, or Google Drive file
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 dark:border-cyan-950/60 bg-white dark:bg-[#080d1a]">
          <button
            onClick={() => setActiveTab('upload')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50/60 dark:bg-cyan-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File (PDF / DOCX / TXT)
          </button>

          <button
            onClick={() => setActiveTab('samples')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'samples'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50/60 dark:bg-cyan-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Featured Curricula (1-Click)
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'drive'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50/60 dark:bg-cyan-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Google Drive
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && error !== 'INSUFFICIENT_PERMISSIONS' && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: LOCAL FILE UPLOAD (PDF / DOCX / TXT / MD) */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/30'
                    : 'border-slate-300 dark:border-cyan-950/80 hover:border-cyan-400 dark:hover:border-cyan-500/50 bg-slate-50/50 dark:bg-[#050914]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt,.md,.json,.csv"
                  className="hidden"
                />

                <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-100 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3">
                  {isExtractingFile ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <FileUp className="w-6 h-6" />
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isExtractingFile ? 'Extracting Curriculum with AI...' : 'Drop lecture files or click to browse'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Supports <strong className="text-slate-700 dark:text-slate-300">PDF, Word (DOCX), TXT, Markdown</strong>. Processed locally & accurately with zero cloud scope limits.
                </p>
              </div>

              {uploadedFile && (
                <div className="p-4 rounded-2xl border border-cyan-500/40 bg-cyan-50/30 dark:bg-cyan-950/20 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                        {uploadedFile.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 uppercase font-bold">
                        {uploadedFile.format}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB · {uploadedFile.text.length} chars
                      </span>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Document Title Input */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Edit3 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                      Curriculum Topic / Title
                    </label>
                    <input
                      type="text"
                      value={uploadedFile.title}
                      onChange={e => setUploadedFile({ ...uploadedFile, title: e.target.value })}
                      placeholder="e.g. Chapter 4: Cellular Respiration"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-cyan-800/80 bg-white dark:bg-[#040813] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-semibold"
                    />
                  </div>

                  {/* Content Preview & Editor */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span>Extracted Study Material</span>
                      <span className="font-mono text-cyan-600 dark:text-cyan-400 font-normal">
                        Ready to learn
                      </span>
                    </div>
                    <textarea
                      value={uploadedFile.text}
                      onChange={e => setUploadedFile({ ...uploadedFile, text: e.target.value })}
                      rows={5}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#040813] border border-slate-200 dark:border-cyan-950 text-xs text-slate-700 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      onClick={handleConfirmUpload}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>Generate Socratic Roadmap from Document</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </button>
                    <button
                      onClick={handleLoadToMainEditor}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-cyan-800 bg-white dark:bg-[#060b17] hover:bg-slate-100 dark:hover:bg-cyan-950/40 text-slate-800 dark:text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>Review in Main Form</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FEATURED PRE-CONFIGURED STUDY DOCS */}
          {activeTab === 'samples' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Instantly load rich university-level study syllabi to test the Socratic voice dialogue immediately:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_DRIVE_DOCUMENTS.map(sample => (
                  <div
                    key={sample.id}
                    onClick={() => handleImportSampleDoc(sample)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-cyan-950 bg-slate-50 dark:bg-[#060b17] hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-[#0c1426] cursor-pointer transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50">
                          Ready to Study
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 line-clamp-2 leading-snug">
                        {sample.name.replace('.gdoc', '').replace('.txt', '')}
                      </h4>
                    </div>
                    <div className="mt-3 text-[11px] font-mono font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                      {importingFileId === sample.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <span>Load Curriculum</span> &rarr;
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              {error === 'INSUFFICIENT_PERMISSIONS' && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-900 dark:text-amber-200">
                        Google Drive Read Permission Required
                      </p>
                      <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                        In project <code className="font-mono bg-amber-200/60 dark:bg-amber-900/50 px-1 py-0.5 rounded">gen-lang-client-0143328501</code>, Google requires OAuth verification for the <code className="font-mono">drive.readonly</code> scope or adding your email as a Test User.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload File Directly (Instant)
                    </button>
                    <button
                      onClick={() => setActiveTab('samples')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800/60 text-amber-900 dark:text-amber-200 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Use Featured Study Doc
                    </button>
                  </div>
                </div>
              )}

              {!hasDriveToken ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#050914] border border-slate-200 dark:border-cyan-950 text-center">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/25 mb-3">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Connect Google Drive
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                    {currentUser ? (
                      <>
                        Signed in as <strong className="text-slate-800 dark:text-slate-200">{currentUser.email}</strong>. Grant read-only access to browse your Google Docs & syllabus notes.
                      </>
                    ) : (
                      'Grant read-only access to browse and import your lecture notes or syllabus documents.'
                    )}
                  </p>
                  <button
                    onClick={handleConnectDrive}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Authorize Google Drive Access
                      </>
                    )}
                  </button>

                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-cyan-950/60 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Prefer direct upload? Click here
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Search Bar & Refresh */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search your Google Drive documents..."
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-cyan-950 bg-slate-50 dark:bg-[#040813] text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-400"
                      />
                    </div>
                    <button
                      onClick={checkAuthAndLoad}
                      disabled={isLoading}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-cyan-950 bg-slate-100 dark:bg-[#0c1426] text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Refresh files"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Real Files List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {isLoading && (
                      <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-cyan-600 dark:text-cyan-400" />
                        Loading your Google Drive documents...
                      </div>
                    )}

                    {!isLoading && filteredFiles.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400 font-mono">
                        No documents found matching "{searchQuery}".
                      </div>
                    )}

                    {!isLoading &&
                      filteredFiles.map(file => (
                        <div
                          key={file.id}
                          onClick={() => handleImportRealFile(file)}
                          className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-cyan-950 bg-slate-50 dark:bg-[#060b17] hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-[#0c1426] cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
                                {file.name}
                              </p>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {file.mimeType.includes('document') ? 'Google Doc' : file.mimeType.includes('pdf') ? 'PDF Document' : 'Text / Document'}
                              </span>
                            </div>
                          </div>
                          <button
                            disabled={importingFileId === file.id}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 transition-colors cursor-pointer"
                          >
                            {importingFileId === file.id ? 'Importing...' : 'Select'}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-cyan-950/60 bg-slate-50 dark:bg-[#050914] flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Extracted text is analyzed to create 4–5 Socratic checkpoints
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-cyan-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
