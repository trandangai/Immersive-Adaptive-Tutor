import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Roadmap,
  Checkpoint,
  SocraticMessage,
  MasteryLevel,
  PacingStatus,
  Flashcard,
  TutorPersonaTone,
} from '../types/index.ts';
import { AudioVisualizer } from './AudioVisualizer.tsx';
import { TelemetryWidget } from './TelemetryWidget.tsx';
import { FlashcardsDeck } from './FlashcardsDeck.tsx';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Layers,
  ArrowRight,
  RotateCcw,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Award,
  Zap,
  Compass,
  MessageSquare,
  BookOpen,
  Info,
  ChevronRight,
  AlertCircle,
  Radio,
  Square,
  RefreshCw,
  Maximize2,
  Minimize2,
  Trash2,
  CornerDownLeft,
  FileEdit,
  Type,
} from 'lucide-react';

interface SocraticVoiceSessionProps {
  roadmap: Roadmap;
  userId?: string;
  onFinishSession: (data: {
    messages: SocraticMessage[];
    flashcards: Flashcard[];
    masteryLevel: MasteryLevel;
    comprehensionScore: number;
    topicsMastered: string[];
    topicsNeedingReview: string[];
    notes: string[];
  }) => void;
  onBackToRoadmap: () => void;
  isActive?: boolean;
  onCheckpointIndexChange?: (index: number) => void;
  onFlashcardGenerated?: (flashcard: Flashcard) => void;
}

export const SocraticVoiceSession: React.FC<SocraticVoiceSessionProps> = ({
  roadmap,
  userId,
  onFinishSession,
  onBackToRoadmap,
  isActive = true,
  onCheckpointIndexChange,
  onFlashcardGenerated,
}) => {
  const userScope = userId ? userId.replace(/[^a-zA-Z0-9]/g, '_') : 'guest';
  const sessionCacheKey = `socratic_active_session_${userScope}_${roadmap.topicTitle.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const cachedSession = (() => {
    try {
      const saved = sessionStorage.getItem(sessionCacheKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  // Telemetry state
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState<number>(() => cachedSession?.currentCheckpointIndex || 0);
  const [masteryLevel, setMasteryLevel] = useState<MasteryLevel>(() => cachedSession?.masteryLevel || roadmap.baselineDifficulty);
  const [comprehensionScore, setComprehensionScore] = useState<number>(() => cachedSession?.comprehensionScore ?? 50);
  const [pacingStatus, setPacingStatus] = useState<PacingStatus>(() => cachedSession?.pacingStatus || 'optimal');
  const [topicsMastered, setTopicsMastered] = useState<string[]>(() => cachedSession?.topicsMastered || []);
  const [topicsNeedingReview, setTopicsNeedingReview] = useState<string[]>(() => cachedSession?.topicsNeedingReview || []);
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => cachedSession?.flashcards || []);
  const [liveNotes, setLiveNotes] = useState<string[]>(() => cachedSession?.liveNotes || []);

  // Tutor Persona setting ('socratic' | 'encouraging' | 'challenging')
  const [personaTone, setPersonaTone] = useState<TutorPersonaTone>(() => cachedSession?.personaTone || 'socratic');

  // Right pane tab ('dialogue' | 'flashcards' | 'notes')
  const [rightPaneTab, setRightPaneTab] = useState<'dialogue' | 'flashcards' | 'notes'>('dialogue');

  // Messages and Voice state
  const [messages, setMessages] = useState<SocraticMessage[]>(() => {
    if (Array.isArray(cachedSession?.messages) && cachedSession.messages.length > 0) {
      return cachedSession.messages;
    }
    return [];
  });
  const [inputText, setInputText] = useState('');
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [reviewVoiceBeforeSend, setReviewVoiceBeforeSend] = useState<boolean>(() => {
    try {
      return localStorage.getItem('review_voice_before_send') === 'true';
    } catch {
      return false;
    }
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reviewVoiceBeforeSendRef = useRef(reviewVoiceBeforeSend);

  useEffect(() => {
    reviewVoiceBeforeSendRef.current = reviewVoiceBeforeSend;
    try {
      localStorage.setItem('review_voice_before_send', String(reviewVoiceBeforeSend));
    } catch {}
  }, [reviewVoiceBeforeSend]);

  // Sync active session state to sessionStorage so page refresh or tab switches retain 100% of live dialogue
  useEffect(() => {
    try {
      if (messages.length > 0) {
        sessionStorage.setItem(
          sessionCacheKey,
          JSON.stringify({
            messages,
            hasSpokenIntro: true,
            currentCheckpointIndex,
            masteryLevel,
            comprehensionScore,
            pacingStatus,
            topicsMastered,
            topicsNeedingReview,
            flashcards,
            liveNotes,
            personaTone,
          })
        );
      }
    } catch (e) {
      console.warn('Session cache sync warning:', e);
    }
  }, [
    messages,
    currentCheckpointIndex,
    masteryLevel,
    comprehensionScore,
    pacingStatus,
    topicsMastered,
    topicsNeedingReview,
    flashcards,
    liveNotes,
    personaTone,
    sessionCacheKey,
  ]);

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [voicePersona, setVoicePersona] = useState<string>('Kore');
  const [speechLanguage, setSpeechLanguage] = useState<'auto' | 'en-US' | 'vi-VN'>('auto');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [accumulatedSpeech, setAccumulatedSpeech] = useState('');
  const [activeAudioElement, setActiveAudioElement] = useState<HTMLAudioElement | null>(null);
  const [voiceEngine, setVoiceEngine] = useState<'gemini' | 'browser'>('gemini');

  // Audio Analysis & Hardware Mic State
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [audioInputVolume, setAudioInputVolume] = useState<number>(0);
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  // References
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const volumeAnimRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentCheckpoint = roadmap.checkpoints[currentCheckpointIndex];

  // Speech Text Refs (synchronous tracking to prevent stale React closure bugs)
  const spokenTextRef = useRef('');
  const accumulatedSpeechRef = useRef('');
  const interimTranscriptRef = useRef('');
  const handleFinishSpeakingRef = useRef<() => void>(() => {});

  // Track if initial voice greeting has already been spoken to prevent repeating on tab/view switch
  const hasSpokenIntroRef = useRef<boolean>(
    Boolean(cachedSession?.hasSpokenIntro || (Array.isArray(cachedSession?.messages) && cachedSession.messages.length > 0))
  );

  // Notify parent of checkpoint changes
  useEffect(() => {
    onCheckpointIndexChange?.(currentCheckpointIndex);
  }, [currentCheckpointIndex, onCheckpointIndexChange]);

  // When navigating away from session (e.g. to Roadmap, Flashcards, History), stop speech & mic immediately
  useEffect(() => {
    if (!isActive) {
      stopAudio();
      stopListening();
    }
  }, [isActive]);

  // Auto-scroll chat
  useEffect(() => {
    if (rightPaneTab === 'dialogue') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, interimTranscript, rightPaneTab]);

  // Spacebar push-to-talk / toggle listener (when not typing in an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isSpeakingRef.current) {
          stopAudio();
        } else if (isListeningRef.current) {
          handleFinishSpeaking();
        } else {
          startListening();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Launch initial Socratic probe on boot once only
  useEffect(() => {
    initiateSession();
    return () => {
      stopAudio();
      stopListening();
    };
  }, []);

  const initiateSession = async () => {
    // If the voice cockpit has already spoken or messages exist, do not repeat!
    if (hasSpokenIntroRef.current || messages.length > 0) {
      return;
    }
    hasSpokenIntroRef.current = true;

    const firstCp = roadmap.checkpoints[0];
    let initialGreeting = `Welcome! Today we are exploring "${roadmap.topicTitle}".`;
    if (personaTone === 'encouraging') {
      initialGreeting = `Welcome! I'm thrilled to explore "${roadmap.topicTitle}" with you today. Take your time, you've got this!`;
    } else if (personaTone === 'challenging') {
      initialGreeting = `Welcome. Today we are going to rigorously challenge and test your mental model of "${roadmap.topicTitle}".`;
    }
    const initialText = `${initialGreeting} Let's start with our first checkpoint: "${firstCp?.title}". ${firstCp?.keyQuestion}`;

    const initMsg: SocraticMessage = {
      id: 'init-1',
      role: 'assistant',
      text: initialText,
      timestamp: Date.now(),
      keyTakeaway: `Starting ${firstCp?.title}`,
    };
    setMessages([initMsg]);
    playAIVoice(initialText);
  };

  // Setup Web Speech Recognition once on mount (isolated from isListening state to prevent abort loops)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let currentFinals = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              currentFinals += item[0].transcript + ' ';
            } else {
              currentInterim += item[0].transcript;
            }
          }

          if (currentFinals.trim()) {
            accumulatedSpeechRef.current = (accumulatedSpeechRef.current ? accumulatedSpeechRef.current + ' ' : '') + currentFinals.trim();
            setAccumulatedSpeech(accumulatedSpeechRef.current);
          }
          interimTranscriptRef.current = currentInterim.trim();
          setInterimTranscript(currentInterim);

          const combined = (accumulatedSpeechRef.current + ' ' + interimTranscriptRef.current).trim();
          spokenTextRef.current = combined;

          // Clear any previous error message since speech is actively being heard!
          setMicErrorMessage(null);

          // Reset silence auto-submit timer (2.5s of silence after speech will auto-submit)
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              handleFinishSpeakingRef.current();
            }
          }, 2500);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition warning/error:', event.error);
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
          }
          if (event.error === 'not-allowed') {
            setMicPermissionState('denied');
            setMicErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
            stopListening();
            return;
          }
        };

        recognition.onend = () => {
          // If the user is still in listening mode, automatically restart
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch {
              // ignore
            }
          }
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Failed to construct SpeechRecognition:', e);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const startListening = async () => {
    if (isThinking) return;
    stopAudio();
    setMicErrorMessage(null);
    spokenTextRef.current = '';
    accumulatedSpeechRef.current = '';
    interimTranscriptRef.current = '';
    setInterimTranscript('');
    setAccumulatedSpeech('');
    audioChunksRef.current = [];

    // 1. Explicitly acquire MediaStream for Analyser and MediaRecorder fallback
    let stream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;
        setMicPermissionState('granted');

        // Connect stream to Web Audio Analyser
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            if (ctx.state === 'suspended') {
              await ctx.resume();
            }
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.5;
            source.connect(analyser);
            audioContextRef.current = ctx;
            setAnalyserNode(analyser);

            // Animate live mic volume decibel level
            const dataArr = new Uint8Array(analyser.frequencyBinCount);
            const measureVolume = () => {
              if (!isListeningRef.current) return;
              analyser.getByteFrequencyData(dataArr);
              const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length;
              setAudioInputVolume(Math.min(100, Math.round((avg / 128) * 100)));
              volumeAnimRef.current = requestAnimationFrame(measureVolume);
            };
            measureVolume();
          }
        } catch (audioErr) {
          console.warn('Web Audio Analyser warning:', audioErr);
        }

        // Setup MediaRecorder as universal audio capture buffer
        try {
          if (typeof MediaRecorder !== 'undefined') {
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
              mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
              mimeType = 'audio/ogg';
            }
            const recorder = new MediaRecorder(stream, { mimeType });
            recorder.ondataavailable = e => {
              if (e.data && e.data.size > 0) {
                audioChunksRef.current.push(e.data);
              }
            };
            recorder.start(250);
            mediaRecorderRef.current = recorder;
          }
        } catch (recErr) {
          console.warn('MediaRecorder warning:', recErr);
        }
      }
    } catch (err: any) {
      console.warn('Microphone getUserMedia error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionState('denied');
        setMicErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser URL bar, or type below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicErrorMessage('No microphone device was detected. Please connect a microphone or use keyboard input.');
      } else {
        setMicErrorMessage(`Could not access microphone: ${err.message || 'Check browser permissions'}`);
      }
      return;
    }

    // 2. Mark state as listening
    isListeningRef.current = true;
    setIsListening(true);

    // 3. Start Web Speech Recognition if available
    if (recognitionRef.current) {
      try {
        const targetLang = speechLanguage === 'vi-VN' ? 'vi-VN' : speechLanguage === 'en-US' ? 'en-US' : (navigator.language || 'en-US');
        recognitionRef.current.lang = targetLang;
        recognitionRef.current.start();
      } catch (e) {
        console.warn('SpeechRecognition start caught:', e);
      }
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    setAudioInputVolume(0);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (volumeAnimRef.current) {
      cancelAnimationFrame(volumeAnimRef.current);
      volumeAnimRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
      setAnalyserNode(null);
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Asynchronously flush and retrieve recorded audio from MediaRecorder
  const stopMediaRecorderAndGetBlob = (): Promise<{ blob: Blob; mimeType: string } | null> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        if (audioChunksRef.current.length > 0) {
          resolve({ blob: new Blob(audioChunksRef.current, { type: 'audio/webm' }), mimeType: 'audio/webm' });
        } else {
          resolve(null);
        }
        return;
      }

      const mimeType = recorder.mimeType || 'audio/webm';

      if (recorder.state === 'inactive') {
        if (audioChunksRef.current.length > 0) {
          resolve({ blob: new Blob(audioChunksRef.current, { type: mimeType }), mimeType });
        } else {
          resolve(null);
        }
        return;
      }

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          resolve({ blob: new Blob(audioChunksRef.current, { type: mimeType }), mimeType });
        } else {
          resolve(null);
        }
      };

      try {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
        recorder.stop();
      } catch (err) {
        if (audioChunksRef.current.length > 0) {
          resolve({ blob: new Blob(audioChunksRef.current, { type: mimeType }), mimeType });
        } else {
          resolve(null);
        }
      }
    });
  };

  const adjustTextareaHeight = (expanded = isInputExpanded) => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const minH = expanded ? 120 : 52;
    const maxH = expanded ? 320 : 180;
    const scrollH = el.scrollHeight;
    const newH = Math.min(Math.max(scrollH, minH), maxH);
    el.style.height = `${newH}px`;
  };

  const handleTransferVoiceToInput = (explicitText?: string) => {
    const textToTransfer = (
      explicitText ||
      spokenTextRef.current ||
      accumulatedSpeechRef.current ||
      (accumulatedSpeech + ' ' + interimTranscript)
    ).trim();

    stopListening();
    setInterimTranscript('');
    setAccumulatedSpeech('');
    spokenTextRef.current = '';
    accumulatedSpeechRef.current = '';
    interimTranscriptRef.current = '';
    setMicErrorMessage(null);

    if (!textToTransfer) return;

    setRightPaneTab('dialogue');

    setInputText(prev => {
      const prevTrimmed = prev.trim();
      return prevTrimmed ? `${prevTrimmed} ${textToTransfer}` : textToTransfer;
    });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
        adjustTextareaHeight();
      }
    }, 60);
  };

  const handleFinishSpeaking = async () => {
    const textSoFar = (
      spokenTextRef.current ||
      accumulatedSpeechRef.current ||
      (accumulatedSpeech + ' ' + interimTranscript)
    ).trim();

    // 1. If Web Speech API captured text cleanly, check if user wants to review & edit first
    if (textSoFar && textSoFar.length > 0) {
      if (reviewVoiceBeforeSendRef.current) {
        handleTransferVoiceToInput(textSoFar);
        return;
      }
      stopListening();
      setInterimTranscript('');
      setAccumulatedSpeech('');
      spokenTextRef.current = '';
      accumulatedSpeechRef.current = '';
      interimTranscriptRef.current = '';
      setMicErrorMessage(null);
      handleUserSubmit(textSoFar);
      return;
    }

    // 2. Fallback: Transcribe audio buffer through Gemini 3.8 Flash
    setIsTranscribing(true);
    setMicErrorMessage(null);

    try {
      const audioData = await stopMediaRecorderAndGetBlob();
      stopListening();

      if (audioData && audioData.blob && audioData.blob.size > 150) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(audioData.blob);
        const dataUrl = await base64Promise;

        const res = await fetch('/api/gemini/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Audio: dataUrl,
            mimeType: audioData.mimeType,
            language: speechLanguage,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const cleanText = (data.text || '').trim();
          if (cleanText && cleanText.toUpperCase() !== 'EMPTY') {
            if (reviewVoiceBeforeSendRef.current) {
              handleTransferVoiceToInput(cleanText);
              return;
            }
            setInterimTranscript('');
            setAccumulatedSpeech('');
            spokenTextRef.current = '';
            accumulatedSpeechRef.current = '';
            interimTranscriptRef.current = '';
            setMicErrorMessage(null);
            setIsTranscribing(false);
            handleUserSubmit(cleanText);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Fallback audio transcription error:', err);
    } finally {
      setIsTranscribing(false);
      setInterimTranscript('');
      setAccumulatedSpeech('');
      spokenTextRef.current = '';
      accumulatedSpeechRef.current = '';
      interimTranscriptRef.current = '';
    }

    // If no speech could be recognized, give active feedback so user is not stuck
    setMicErrorMessage('No speech was detected. Please click the mic and speak closer, or type your answer in the box below.');
  };

  // Keep handleFinishSpeakingRef current on every render to eliminate stale closure bugs
  handleFinishSpeakingRef.current = handleFinishSpeaking;

  const toggleListening = () => {
    if (isListening) {
      handleFinishSpeaking();
    } else {
      startListening();
    }
  };

  // Stop active voice playback
  const stopAudio = () => {
    isSpeakingRef.current = false;
    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      setActiveAudioElement(null);
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleToneChange = (newTone: TutorPersonaTone) => {
    setPersonaTone(newTone);
    const toneLabels: Record<TutorPersonaTone, { name: string; desc: string }> = {
      socratic: { name: 'Socratic', desc: 'Guided inquiry & first-principles analogies' },
      encouraging: { name: 'Encouraging', desc: 'Warm, supportive & confidence-boosting' },
      challenging: { name: 'Challenging', desc: "Devil's advocate & rigorous edge cases" },
    };
    const info = toneLabels[newTone];
    const systemNotice: SocraticMessage = {
      id: `sys-${Date.now()}`,
      role: 'system',
      text: `Tutor Persona switched to ${info.name}: ${info.desc}`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, systemNotice]);
  };

  // Play AI Spoken Voice using Gemini TTS or Web Speech fallback
  const playAIVoice = async (text: string) => {
    if (isMuted || !isActive) return;
    stopAudio();
    setIsSpeaking(true);

    try {
      // 1. Attempt Gemini 3.8 Flash Lite TTS
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voicePersona, personaTone }),
      });

      if (res.ok) {
        const data = await res.json();

        // Only play via Gemini Audio if Gemini TTS actually generated the audio
        if (data.usedGeminiTTS && data.audioBase64) {
          setVoiceEngine('gemini');
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          audio.playbackRate = speechRate;
          setActiveAudioElement(audio);

          audio.onended = () => {
            setIsSpeaking(false);
            setActiveAudioElement(null);
          };
          audio.onerror = () => {
            fallbackWebSpeech(text);
          };

          await audio.play();
          return;
        } else if (data.quotaExceeded || !data.usedGeminiTTS) {
          setVoiceEngine('browser');
        }
      }
    } catch (e) {
      console.log('[TTS] Gemini TTS unavailable, seamlessly using browser Web Speech API', e);
      setVoiceEngine('browser');
    }

    // Fallback: Web Speech API (reliable, unlimited quota, zero latency)
    fallbackWebSpeech(text);
  };

  const fallbackWebSpeech = (text: string) => {
    if (!window.speechSynthesis || !isActive) {
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();

    // Strip markdown formatting, symbols, and bold asterisks for crystal-clear natural speech
    const cleanText = text
      .replace(/[*_#`~[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = Math.max(0.75, Math.min(1.4, speechRate));
    utterance.pitch = 1.0;

    // Pick best matching natural voice from browser
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const isFemalePersona = voicePersona === 'Kore' || voicePersona === 'Zephyr';
        const bestVoice =
          voices.find(v => {
            const name = v.name.toLowerCase();
            if (isFemalePersona) {
              return (
                (name.includes('female') || name.includes('samantha') || name.includes('zira') || name.includes('natural') || name.includes('google us english')) &&
                v.lang.startsWith('en')
              );
            } else {
              return (
                (name.includes('male') || name.includes('david') || name.includes('alex') || name.includes('george') || name.includes('guy')) &&
                v.lang.startsWith('en')
              );
            }
          }) ||
          voices.find(v => v.lang.startsWith('en')) ||
          voices[0];

        if (bestVoice) {
          utterance.voice = bestVoice;
        }
      }
    } catch (voiceErr) {
      console.log('[TTS] Voice selection fallback notice:', voiceErr);
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Handle User Message Submission
  const handleUserSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isThinking) return;

    stopAudio();
    stopListening();

    const userMsg: SocraticMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsThinking(true);

    try {
      const response = await fetch('/api/gemini/socratic-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: roadmap.topicTitle,
          checkpoint: currentCheckpoint,
          conversationHistory: newMessages,
          userMessage: textToSend.trim(),
          currentMastery: masteryLevel,
          currentComprehension: comprehensionScore,
          checkpointIndex: currentCheckpointIndex,
          totalCheckpoints: roadmap.checkpoints.length,
          personaTone,
        }),
      });

      if (!response.ok) {
        throw new Error('Socratic evaluation error');
      }

      const turn = await response.json();

      // Update Telemetry
      if (turn.newMasteryLevel) setMasteryLevel(turn.newMasteryLevel);
      if (typeof turn.comprehensionScore === 'number') {
        setComprehensionScore(turn.comprehensionScore);
      }
      if (turn.pacingStatus) setPacingStatus(turn.pacingStatus);

      // Log Key Takeaway
      if (turn.keyTakeaway) {
        setLiveNotes(prev => [...prev, turn.keyTakeaway]);
      }

      // Checkpoint Mastery handling
      if (turn.isCheckpointMastered) {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.65 },
        });

        const masteredTitle = currentCheckpoint.title;
        setTopicsMastered(prev => Array.from(new Set([...prev, masteredTitle])));

        // Generate Flashcard
        if (turn.flashcard) {
          const newCard: Flashcard = {
            id: `fc-${Date.now()}`,
            userId: userId || undefined,
            concept: turn.flashcard.concept || currentCheckpoint.title,
            front: turn.flashcard.front,
            back: turn.flashcard.back,
            difficulty: turn.flashcard.difficulty || masteryLevel,
            mastered: false,
            createdAt: new Date().toISOString(),
          };
          setFlashcards(prev => [newCard, ...prev]);
          if (onFlashcardGenerated) {
            onFlashcardGenerated(newCard);
          }
        }

        // Advance to next checkpoint if available
        if (currentCheckpointIndex < roadmap.checkpoints.length - 1) {
          setTimeout(() => {
            setCurrentCheckpointIndex(idx => idx + 1);
          }, 1500);
        }
      } else if (turn.pacingStatus === 'needs_reinforcement') {
        setTopicsNeedingReview(prev =>
          Array.from(new Set([...prev, currentCheckpoint.title]))
        );
      }

      // Append Socratic response
      const aiMsg: SocraticMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: turn.socraticResponse,
        timestamp: Date.now(),
        keyTakeaway: turn.keyTakeaway,
      };

      setMessages(prev => [...prev, aiMsg]);
      playAIVoice(turn.socraticResponse);
    } catch (err) {
      console.error('Failed Socratic turn:', err);
      const fallbackAiMsg: SocraticMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        text: 'That is an intriguing angle. Could you break down what you mean in terms of the underlying mechanism?',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, fallbackAiMsg]);
      playAIVoice(fallbackAiMsg.text);
    } finally {
      setIsThinking(false);
    }
  };

  const handleFinish = () => {
    stopAudio();
    stopListening();
    try {
      sessionStorage.removeItem(sessionCacheKey);
    } catch {}
    onFinishSession({
      messages,
      flashcards,
      masteryLevel,
      comprehensionScore,
      topicsMastered,
      topicsNeedingReview,
      notes: liveNotes,
    });
  };

  const quickPrompts = [
    'Can you give me an analogy?',
    'I think it works like this...',
    'Could you repeat the question?',
    'What is the edge case here?',
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 animate-in fade-in duration-300">
      {/* 1. Live Adaptive Telemetry Bar */}
      <TelemetryWidget
        masteryLevel={masteryLevel}
        comprehensionScore={comprehensionScore}
        pacingStatus={pacingStatus}
        currentCheckpointTitle={currentCheckpoint?.title}
        checkpointIndex={currentCheckpointIndex}
        totalCheckpoints={roadmap.checkpoints.length}
      />

      {/* 2. Split-Screen Studio Cockpit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (Acoustic Cockpit & Active Concept - 5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Audio Visualizer & Mic Command Deck */}
          <div className="bg-white/95 dark:bg-[#080d1a]/95 backdrop-blur-2xl border border-slate-200 dark:border-cyan-500/20 rounded-3xl p-5 shadow-xl dark:shadow-2xl relative overflow-hidden flex flex-col justify-between transition-colors">
            {/* Visualizer Header Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-cyan-950/60 mb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                <span className="tracking-wider uppercase">VOICE COCKPIT</span>
                {voiceEngine === 'browser' && (
                  <span
                    className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 font-sans font-medium"
                    title="Using fast, unlimited browser voice engine because Gemini TTS free tier daily quota is resting"
                  >
                    Browser Voice
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!isMuted) stopAudio();
                    setIsMuted(!isMuted);
                  }}
                  className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-cyan-300 dark:bg-[#0e172a] dark:text-slate-300 dark:border-cyan-500/20 dark:hover:border-cyan-400/50 hover:text-cyan-600 dark:hover:text-cyan-200'
                  }`}
                  title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleFinish}
                  className="px-3.5 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Wrap Up
                </button>
              </div>
            </div>

            {/* Canvas Visualizer with live AnalyserNode */}
            <div className="mb-4">
              <AudioVisualizer
                state={
                  isSpeaking
                    ? 'speaking'
                    : isListening
                    ? 'listening'
                    : isThinking || isTranscribing
                    ? 'thinking'
                    : 'idle'
                }
                analyserNode={analyserNode}
                speechRate={speechRate}
              />
            </div>

            {/* Mic Error & Permission Notice */}
            {micErrorMessage && (
              <div className="mb-3 px-3 py-2.5 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium leading-tight">{micErrorMessage}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startListening}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold cursor-pointer"
                    >
                      Retry Mic Access
                    </button>
                    <button
                      type="button"
                      onClick={() => setMicErrorMessage(null)}
                      className="text-[11px] text-amber-300/70 hover:text-amber-200 underline cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Central Big Mic Tactile Button */}
            <div className="flex flex-col items-center justify-center py-2 relative">
              {/* Live audio volume activity indicator */}
              {isListening && (
                <div className="flex items-center gap-1.5 mb-2.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 shadow-sm animate-in fade-in">
                  <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>Mic Input:</span>
                  <div className="flex items-center gap-0.5 h-3">
                    {[15, 30, 45, 60, 80].map(threshold => (
                      <div
                        key={threshold}
                        className={`w-1 rounded-full transition-all duration-75 ${
                          audioInputVolume >= threshold
                            ? 'h-3 bg-emerald-400 shadow-[0_0_6px_#34d399]'
                            : 'h-1 bg-cyan-900/50'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400">{audioInputVolume}%</span>
                </div>
              )}

              {isListening && (
                <div className="absolute w-28 h-28 rounded-full bg-cyan-500/25 animate-voice-radar pointer-events-none" />
              )}

              <button
                type="button"
                onClick={toggleListening}
                disabled={isThinking || isTranscribing}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer disabled:opacity-50 ${
                  isListening
                    ? 'bg-gradient-to-tr from-emerald-400 via-cyan-400 to-teal-300 text-slate-950 scale-105 ring-4 ring-cyan-400/50 shadow-[0_0_35px_rgba(6,182,212,0.7)]'
                    : 'bg-gradient-to-tr from-cyan-600 via-cyan-500 to-teal-400 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95'
                }`}
                title={
                  isListening
                    ? 'Click to finish speaking & submit response (or press Space)'
                    : 'Click mic to talk (or press Space)'
                }
              >
                {isTranscribing ? (
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-950" />
                ) : isListening ? (
                  <Square className="w-7 h-7 fill-slate-950" />
                ) : (
                  <Mic className="w-8 h-8 font-extrabold" />
                )}
              </button>

              <span className="text-xs font-medium text-slate-300 mt-3 text-center">
                {isTranscribing ? (
                  <span className="text-amber-400 font-semibold animate-pulse">
                    Transcribing your voice with Gemini 3.5...
                  </span>
                ) : isListening ? (
                  <span className="text-cyan-300 font-bold animate-pulse">
                    Listening to you... Click button or press Space when done
                  </span>
                ) : isThinking ? (
                  <span className="text-amber-400 font-semibold animate-pulse">
                    Evaluating with Gemini Socratic model...
                  </span>
                ) : isSpeaking ? (
                  <span className="text-cyan-400 font-semibold">
                    Tutor speaking (press Space or mic to interrupt)
                  </span>
                ) : (
                  'Click mic or press Space to speak'
                )}
              </span>

              {/* Action buttons while listening */}
              {isListening && (
                <div className="mt-3 flex items-center gap-2 animate-in fade-in flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={handleFinishSpeaking}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/30 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Done Speaking</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransferVoiceToInput()}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-100 hover:bg-cyan-200 text-cyan-950 dark:bg-cyan-950/80 dark:hover:bg-cyan-900/80 dark:text-cyan-200 border border-cyan-400/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                    title="Put voice transcript into the text editor below to easily see, add more text, and edit it"
                  >
                    <FileEdit className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300" />
                    <span>Edit in Text Box</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopListening}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-700/60 text-xs font-medium cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Real-time speech preview */}
              {(accumulatedSpeech || interimTranscript) && (
                <div className="mt-3 p-3 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-100 text-xs shadow-[0_0_20px_rgba(6,182,212,0.25)] animate-in fade-in space-y-2 max-w-sm mx-auto">
                  <p className="italic text-center leading-relaxed">
                    "{(accumulatedSpeech ? accumulatedSpeech + ' ' : '') + interimTranscript}..."
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1 border-t border-cyan-800/50">
                    <button
                      type="button"
                      onClick={() => handleTransferVoiceToInput()}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <FileEdit className="w-3 h-3 text-cyan-300" />
                      <span>Edit & Add More in Text Box</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Persona and Voice Settings in Cockpit */}
            <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-cyan-950/60 space-y-3">
              {/* Tutor Persona Setting */}
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5">
                  Tutor Persona Setting
                </span>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-[#050914] p-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-cyan-950/80">
                  <button
                    type="button"
                    onClick={() => handleToneChange('socratic')}
                    className={`py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                      personaTone === 'socratic'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300'
                    }`}
                  >
                    <span>🎓</span> Socratic
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToneChange('encouraging')}
                    className={`py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                      personaTone === 'encouraging'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                    }`}
                  >
                    <span>🌟</span> Encouraging
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToneChange('challenging')}
                    className={`py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                      personaTone === 'challenging'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300'
                    }`}
                  >
                    <span>⚡</span> Challenging
                  </button>
                </div>
              </div>

              {/* Voice & Rate selectors */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-1 bg-slate-100 dark:bg-[#050914] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-cyan-950/80">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">Voice:</span>
                  <select
                    value={voicePersona}
                    onChange={e => setVoicePersona(e.target.value)}
                    className="bg-transparent font-semibold text-cyan-800 dark:text-cyan-300 focus:outline-none cursor-pointer text-xs w-full"
                  >
                    <option value="Kore" className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">Kore (Warm)</option>
                    <option value="Puck" className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">Puck (Energetic)</option>
                    <option value="Fenrir" className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">Fenrir (Deep)</option>
                    <option value="Zephyr" className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">Zephyr (Lively)</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#050914] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-cyan-950/80">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">Rate:</span>
                  <select
                    value={speechRate}
                    onChange={e => setSpeechRate(parseFloat(e.target.value))}
                    className="bg-transparent font-semibold text-cyan-800 dark:text-cyan-300 focus:outline-none cursor-pointer text-xs"
                  >
                    <option value={0.8} className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">0.8x</option>
                    <option value={1.0} className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">1.0x</option>
                    <option value={1.2} className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">1.2x</option>
                    <option value={1.5} className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">1.5x</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#050914] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-cyan-950/80">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">Lang:</span>
                  <select
                    value={speechLanguage}
                    onChange={e => setSpeechLanguage(e.target.value as any)}
                    className="bg-transparent font-semibold text-cyan-800 dark:text-cyan-300 focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="auto" className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">Auto</option>
                    <option value="en-US" className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">English</option>
                    <option value="vi-VN" className="bg-white dark:bg-[#050914] text-slate-900 dark:text-slate-200">Tiếng Việt</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Active Concept Focus Card */}
          <div className="bg-white/95 dark:bg-[#080d1a]/95 backdrop-blur-2xl border border-slate-200 dark:border-cyan-500/20 rounded-3xl p-5 shadow-xl space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Active Learning Checkpoint
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Step {currentCheckpointIndex + 1} of {roadmap.checkpoints.length}
              </span>
            </div>

            <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
              {currentCheckpoint?.title}
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {currentCheckpoint?.description}
            </p>

            <div className="p-3.5 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/25 border border-cyan-200 dark:border-cyan-500/25">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-400 block mb-1">
                Target Question Probe
              </span>
              <p className="text-xs font-semibold text-cyan-950 dark:text-cyan-200 leading-relaxed">
                "{currentCheckpoint?.keyQuestion}"
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Live Dialogue & Artifact Stream - 7 Columns) */}
        <div className="lg:col-span-7 bg-white/95 dark:bg-[#080d1a]/95 backdrop-blur-2xl border border-slate-200 dark:border-cyan-500/20 rounded-3xl p-6 shadow-xl dark:shadow-2xl flex flex-col h-[700px] transition-colors">
          {/* Header Segmented Tabs */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-cyan-950/60">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#050914] p-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-cyan-950/80">
              <button
                type="button"
                onClick={() => setRightPaneTab('dialogue')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  rightPaneTab === 'dialogue'
                    ? 'bg-white text-cyan-800 shadow-xs border border-cyan-200 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Live Dialogue
              </button>
              <button
                type="button"
                onClick={() => setRightPaneTab('flashcards')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  rightPaneTab === 'flashcards'
                    ? 'bg-white text-violet-800 shadow-xs border border-violet-200 dark:bg-violet-950/80 dark:text-violet-300 dark:border-violet-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                Flashcards ({flashcards.length})
              </button>
              <button
                type="button"
                onClick={() => setRightPaneTab('notes')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  rightPaneTab === 'notes'
                    ? 'bg-white text-amber-800 shadow-xs border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-200'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Takeaways ({liveNotes.length})
              </button>
            </div>

            <button
              onClick={onBackToRoadmap}
              className="text-xs text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 transition-all flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 font-semibold cursor-pointer shadow-xs hover:border-cyan-400"
              title="View full Socratic Roadmap (session remains active in background)"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>View Roadmap</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* TAB 1: Live Dialogue Thread */}
          {rightPaneTab === 'dialogue' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden pt-3">
              {/* Message scroll container */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
                {messages.map(msg => {
                  if (msg.role === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center my-1">
                        <div className="px-3.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/60 text-[11px] font-semibold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5 shadow-xs">
                          <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                          <span>{msg.text}</span>
                        </div>
                      </div>
                    );
                  }
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 font-medium rounded-br-xs shadow-cyan-500/20'
                            : 'bg-slate-100 text-slate-900 dark:bg-[#0d162a] dark:text-slate-100 rounded-bl-xs border border-slate-200 dark:border-cyan-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-wider mb-1 opacity-80">
                          {isUser ? (
                            <span>Learner</span>
                          ) : (
                            <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                              <Sparkles className="w-3 h-3" /> Socratic AI
                            </span>
                          )}
                        </div>
                        <p>{msg.text}</p>
                      </div>

                      {/* Key takeaway indicator */}
                      {msg.keyTakeaway && !isUser && (
                        <span className="mt-1.5 text-[11px] font-medium text-cyan-800 dark:text-cyan-300 flex items-center gap-1 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/25 rounded-xl py-1 px-2.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                          Takeaway: {msg.keyTakeaway}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Live Speech Transfer Banner & Prompts */}
              <div className="pt-2 border-t border-slate-200 dark:border-cyan-950/60 space-y-2">
                {/* Speech detected banner */}
                {(accumulatedSpeech || interimTranscript) && (
                  <div className="p-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-300 dark:border-cyan-500/40 flex items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs text-cyan-900 dark:text-cyan-200 truncate">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping shrink-0" />
                      <span className="font-semibold shrink-0">Captured Speech:</span>
                      <span className="italic truncate font-mono">"{(accumulatedSpeech ? accumulatedSpeech + ' ' : '') + interimTranscript}"</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTransferVoiceToInput()}
                        className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                        title="Transfer spoken words to this text box to easily see, add more text, and edit"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Edit in Box</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFinishSpeaking}
                        className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-200 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Send Now
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Prompts & Editor Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500">
                      Prompts:
                    </span>
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setInputText(prev => (prev ? `${prev.trim()} ${prompt}` : prompt));
                          setTimeout(() => {
                            if (textareaRef.current) {
                              textareaRef.current.focus();
                              adjustTextareaHeight();
                            }
                          }, 50);
                        }}
                        disabled={isThinking}
                        className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-[#0c1426] hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-200 border border-slate-200 dark:border-cyan-500/20 hover:border-cyan-400/50 transition-all cursor-pointer font-medium"
                        title="Click to insert into text box to edit or add more text"
                      >
                        + {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Toolbar Actions: Review Toggle, Word Count, Clear, Expand */}
                  <div className="flex items-center gap-2.5 ml-auto">
                    <label
                      className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 cursor-pointer select-none"
                      title="When checked, voice speech is loaded into this text box so you can easily review, add more text, and edit before submitting"
                    >
                      <input
                        type="checkbox"
                        checked={reviewVoiceBeforeSend}
                        onChange={e => setReviewVoiceBeforeSend(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                      <span>Edit speech first</span>
                    </label>

                    {inputText.trim() && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 border-l border-slate-200 dark:border-slate-800 pl-2">
                        {inputText.trim().split(/\s+/).length} words • {inputText.length} chars
                      </span>
                    )}

                    {inputText && (
                      <button
                        type="button"
                        onClick={() => {
                          setInputText('');
                          if (textareaRef.current) {
                            textareaRef.current.style.height = isInputExpanded ? '120px' : '52px';
                          }
                        }}
                        className="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer"
                        title="Clear text"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsInputExpanded(!isInputExpanded)}
                      className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${
                        isInputExpanded
                          ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
                          : 'text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-300'
                      }`}
                      title={isInputExpanded ? 'Collapse editor height' : 'Expand editor to see more lines'}
                    >
                      {isInputExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Multi-Line Expanding Editor Card */}
                <div
                  className={`rounded-2xl border transition-all ${
                    isThinking
                      ? 'opacity-60 bg-slate-100 dark:bg-[#070c18] border-slate-300 dark:border-slate-800'
                      : 'bg-white dark:bg-[#040813] border-slate-200 dark:border-cyan-500/30 focus-within:border-cyan-500 dark:focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-sm'
                  }`}
                >
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={e => {
                      setInputText(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputText.trim() && !isThinking) {
                          handleUserSubmit(inputText);
                        }
                      }
                    }}
                    disabled={isThinking}
                    rows={isInputExpanded ? 5 : 2}
                    placeholder="Type your explanation or thoughts here... Press Enter ↵ to send, Shift + Enter for a new line"
                    className="w-full px-4 pt-3 pb-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent resize-y focus:outline-none leading-relaxed"
                    style={{
                      minHeight: isInputExpanded ? '120px' : '52px',
                      maxHeight: isInputExpanded ? '320px' : '180px',
                    }}
                  />

                  {/* Bottom Action Footer inside Textarea Card */}
                  <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-slate-100 dark:border-cyan-950/40">
                    <div className="flex items-center gap-2">
                      {/* Push to talk / Dictate button directly in the editor */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isListening) {
                            handleTransferVoiceToInput();
                          } else {
                            setReviewVoiceBeforeSend(true);
                            startListening();
                          }
                        }}
                        disabled={isThinking}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isListening
                            ? 'bg-rose-500 text-white animate-pulse shadow-sm'
                            : 'bg-slate-100 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-slate-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-800/40'
                        }`}
                        title={isListening ? 'Click to stop and insert voice into text box' : 'Dictate voice straight into this text box'}
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{isListening ? 'Stop & Put in Box' : 'Dictate to Box'}</span>
                      </button>

                      <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        ↵ Enter to send • Shift+Enter newline
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (inputText.trim() && !isThinking) {
                            handleUserSubmit(inputText);
                          }
                        }}
                        disabled={isThinking || !inputText.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 active:scale-95 text-slate-950 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                        title="Send explanation to Socratic Tutor (or press Enter)"
                      >
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5 font-bold" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Live Flashcards Stream */}
          {rightPaneTab === 'flashcards' && (
            <div className="flex-1 overflow-y-auto pt-3">
              <FlashcardsDeck flashcards={flashcards} />
            </div>
          )}

          {/* TAB 3: Real-Time Notes & Takeaways */}
          {rightPaneTab === 'notes' && (
            <div className="flex-1 overflow-y-auto pt-3 space-y-3">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
                <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  Live Takeaways Captured During Voice Session
                </h4>
                {liveNotes.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Takeaways will automatically appear here as concepts are mastered.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {liveNotes.map((note, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-200 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0 shadow-[0_0_6px_#22d3ee]" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
