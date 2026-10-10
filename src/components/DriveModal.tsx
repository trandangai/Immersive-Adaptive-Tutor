import React, { useState, useEffect } from 'react';
import { DriveFile } from '../types/index.ts';
import { fetchDriveFiles, fetchDriveFileContent, SAMPLE_DRIVE_DOCUMENTS } from '../lib/drive.ts';
import { getAccessToken, signInWithGoogle } from '../lib/firebase.ts';
import {
  X,
  FileText,
  Search,
  RefreshCw,
  FolderOpen,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface DriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (content: string, filename: string) => void;
}

export const DriveModal: React.FC<DriveModalProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkAuthAndLoad();
    }
  }, [isOpen]);

  const checkAuthAndLoad = async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        setHasToken(true);
        loadFiles(token);
      } else {
        setHasToken(false);
      }
    } catch {
      setHasToken(false);
    }
  };

  const loadFiles = async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const driveFiles = await fetchDriveFiles(token);
      setFiles(driveFiles);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch Drive files';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await signInWithGoogle();
      if (res.accessToken) {
        setHasToken(true);
        await loadFiles(res.accessToken);
      } else {
        setError('Connected, but could not acquire Drive access token.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Drive authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportRealFile = async (file: DriveFile) => {
    setImportingFileId(file.id);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Missing Google Drive authorization');
      const text = await fetchDriveFileContent(token, file);
      onSelectDocument(text, file.name);
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
      onSelectDocument(sample.content, sample.name);
      setImportingFileId(null);
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#02040a]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#080d1a] rounded-3xl shadow-2xl border border-slate-200 dark:border-cyan-500/20 overflow-hidden flex flex-col max-h-[88vh] transition-colors">
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
                Import from Google Drive
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select lecture notes, Google Docs, or syllabus to extract adaptive roadmaps
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

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Connect or Drive State */}
          {!hasToken ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#050914] border border-slate-200 dark:border-cyan-950 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/25 mb-3">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Connect your Google Drive Account
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                Access your Google Docs, lecture summaries, and uploaded study notes with permission to generate dynamic Socratic sessions.
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
                    Sign in with Google Drive
                  </>
                )}
              </button>
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
                            {file.mimeType.includes('document') ? 'Google Doc' : 'Text / PDF'}
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

          {/* Curated Sample Documents (Immediate Test Guarantee) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Featured Pre-Configured Study Docs (1-Click Test)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SAMPLE_DRIVE_DOCUMENTS.map(sample => (
                <div
                  key={sample.id}
                  onClick={() => handleImportSampleDoc(sample)}
                  className="p-3 rounded-xl border border-slate-200 dark:border-cyan-950 bg-slate-50 dark:bg-[#060b17] hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-[#0c1426] cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50">
                      Sample Doc
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 line-clamp-2 leading-snug">
                    {sample.name.replace('.gdoc', '').replace('.txt', '')}
                  </h4>
                  <div className="mt-2 text-[11px] font-mono font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                    {importingFileId === sample.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <span>Load Document</span> &rarr;
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-cyan-950/60 bg-slate-50 dark:bg-[#050914] flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Files are converted to plain text for AI curriculum analysis
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
