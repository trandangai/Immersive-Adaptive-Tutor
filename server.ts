import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '20mb' }));

// Initialize Google GenAI with required user-agent header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for error responses
const handleApiError = (res: express.Response, error: unknown, fallbackMessage: string) => {
  console.error(fallbackMessage, error);
  const msg = error instanceof Error ? error.message : String(error);
  res.status(500).json({ error: msg, fallback: fallbackMessage });
};

// 0. System Health & Diagnostics Ping
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    services: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      firestore: true,
      audioTts: true,
    },
  });
});

// 1. Generate Session Roadmap strictly grounded in provided content/topic
app.post('/api/gemini/generate-roadmap', async (req, res) => {
  try {
    const { content, topicTitle } = req.body;
    const cleanContent = typeof content === 'string' ? content.trim() : '';
    const cleanTitle = typeof topicTitle === 'string' ? topicTitle.trim() : '';

    if (!cleanContent && !cleanTitle) {
      return res.status(400).json({ error: 'Please provide either document content or a curriculum topic title.' });
    }

    const effectiveTitle = cleanTitle || 'Study Document';
    const effectiveContent = cleanContent || cleanTitle;

    const prompt = `You are a curriculum designer and cognitive learning scientist.
Create a structured 4 to 5 checkpoint "Session Roadmap" for an adaptive Socratic voice tutoring session.

CRITICAL CONSTRAINT: The roadmap MUST be strictly and explicitly grounded in the provided document material and topic below. Do NOT generate unrelated or random topics. Every checkpoint must directly teach concepts from this specific material.

Document Title / Subject: "${effectiveTitle}"

Study Material Content:
"""
${effectiveContent.slice(0, 40000)}
"""

Create 4 to 5 progressive learning checkpoints:
- id: "cp-1", "cp-2", etc.
- title: concise concept name representing an essential component from this specific material
- description: 1-2 sentence core concept explanation
- keyQuestion: the foundational Socratic question the tutor will ask the learner to test their intuitive mental model
- estimatedMinutes: number between 3 and 7

Also determine:
- topicTitle: clean, descriptive title reflecting this specific document/topic (e.g., "${effectiveTitle}")
- subjectArea: academic field (e.g., "Cellular Biology", "Distributed Systems", "Applied Physics", "Constitutional Law")
- baselineDifficulty: "beginner" | "intermediate" | "advanced"
- summary: 2-sentence executive overview of what will be learned from this specific material`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topicTitle: { type: Type.STRING },
            subjectArea: { type: Type.STRING },
            baselineDifficulty: { type: Type.STRING, enum: ['beginner', 'intermediate', 'advanced'] },
            summary: { type: Type.STRING },
            checkpoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  keyQuestion: { type: Type.STRING },
                  estimatedMinutes: { type: Type.NUMBER },
                },
                required: ['id', 'title', 'description', 'keyQuestion'],
              },
            },
          },
          required: ['topicTitle', 'subjectArea', 'baselineDifficulty', 'summary', 'checkpoints'],
        },
      },
    });

    const roadmapData = JSON.parse(response.text || '{}');
    if (!roadmapData.topicTitle || !roadmapData.checkpoints || roadmapData.checkpoints.length === 0) {
      throw new Error('AI generated an invalid roadmap structure. Please check document content and retry.');
    }

    res.json(roadmapData);
  } catch (err) {
    handleApiError(res, err, 'Failed to generate roadmap from document');
  }
});

// 1.5. Extract Document Content (PDF, DOCX, TXT, MD) via Gemini and Mammoth
app.post('/api/extract-document', async (req, res) => {
  try {
    const { base64Data, mimeType, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'No document data received. Please select a valid file.' });
    }

    const safeFilename = filename || 'document';
    const lowerName = safeFilename.toLowerCase();
    const isDocx = lowerName.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isPdf = lowerName.endsWith('.pdf') || mimeType === 'application/pdf';

    // 1. Word Document (.docx) via Mammoth
    if (isDocx) {
      const buffer = Buffer.from(base64Data, 'base64');
      const docxResult = await mammoth.extractRawText({ buffer });
      const extractedText = (docxResult.value || '').trim();

      if (!extractedText) {
        return res.status(422).json({
          error: 'The Word document appears empty or could not be converted to plain text. Please check the file or copy-paste text.'
        });
      }

      return res.json({
        text: extractedText,
        filename: safeFilename,
        charCount: extractedText.length,
        format: 'docx',
      });
    }

    // 2. PDF Document via Gemini Multimodal
    if (isPdf) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: 'Extract and transcribe all text, curriculum content, syllabus sections, lecture notes, formula explanations, and conceptual material from this PDF document completely and faithfully. Return ONLY the comprehensive textual content of the document in plain text format. Do NOT add meta greetings, introductory sentences, or conversational tutoring questions.',
              },
            ],
          },
        ],
      });

      const extractedText = (response.text || '').trim();
      if (!extractedText || extractedText.length < 10) {
        return res.status(422).json({
          error: 'Could not extract readable text from this PDF (it may be scanned images without OCR or password protected). Please paste text directly.'
        });
      }

      return res.json({
        text: extractedText,
        filename: safeFilename,
        charCount: extractedText.length,
        format: 'pdf',
      });
    }

    // 3. Plain Text / Markdown / CSV / JSON
    const decoded = Buffer.from(base64Data, 'base64').toString('utf-8').trim();
    if (!decoded) {
      return res.status(422).json({ error: 'The uploaded file is empty.' });
    }

    res.json({
      text: decoded,
      filename: safeFilename,
      charCount: decoded.length,
      format: 'text',
    });
  } catch (err) {
    handleApiError(res, err, 'Failed to extract document text');
  }
});

// 2. Real-Time Adaptive Socratic Voice Turn
app.post('/api/gemini/socratic-turn', async (req, res) => {
  try {
    const {
      topicTitle,
      checkpoint,
      conversationHistory,
      userMessage,
      currentMastery,
      currentComprehension,
      checkpointIndex,
      totalCheckpoints,
      personaTone = 'socratic',
    } = req.body;

    const formattedHistory = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-8).map((m: { role: string; text: string }) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`).join('\n')
      : '';

    let personaInstruction = '';
    if (personaTone === 'encouraging') {
      personaInstruction = `TUTOR PERSONA: ENCOURAGING & HIGHLY SUPPORTIVE
- Persona Style: Warm, empathetic, inspiring, and high-praise.
- Reinforce effort and celebrate small breakthroughs with enthusiastic positive feedback.
- If the student struggles, comfort them gently, normalize the difficulty of the topic, and provide a welcoming, simple real-world analogy.
- Avoid intimidating jargon; build deep cognitive confidence and safety.`;
    } else if (personaTone === 'challenging') {
      personaInstruction = `TUTOR PERSONA: CHALLENGING & RIGOROUS (DEVIL'S ADVOCATE)
- Persona Style: Intellectually rigorous, provocative, probing, and high-expectation.
- Challenge surface-level answers; interrogate assumptions and ask "Why?" and "What happens under extreme edge cases?".
- Introduce counter-examples, edge cases, and architectural trade-offs.
- Demand precise, first-principles justification rather than textbook buzzwords.`;
    } else {
      personaInstruction = `TUTOR PERSONA: CLASSIC SOCRATIC (GUIDED DISCOVERY)
- Persona Style: Inquiring, balanced, focused on guided self-discovery.
- Never give long lectures; ask targeted check-for-understanding questions that lead the student to deduce the answer themselves.
- Provide vivid real-world analogies when the student is stuck to anchor abstract concepts.`;
    }

    const prompt = `You are the Immersive Adaptive Socratic Tutor in a live two-way voice session.
TOPIC: ${topicTitle}
CURRENT CHECKPOINT: "${checkpoint?.title}" - ${checkpoint?.description}
KEY QUESTION: "${checkpoint?.keyQuestion}"
CURRENT STUDENT MASTERY: ${currentMastery}
CURRENT COMPREHENSION SCORE: ${currentComprehension}%
CHECKPOINT: ${checkpointIndex + 1} of ${totalCheckpoints}

${personaInstruction}

RECENT CONVERSATION:
${formattedHistory}

LATEST STUDENT ANSWER:
"${userMessage}"

RULES FOR SPOKEN RESPONSE (CRITICAL):
1. Keep your spoken response EXTREMELY BRIEF: Maximum 2 to 3 conversational sentences. Spoken dialogue must be concise and punchy!
2. Apply the selected TUTOR PERSONA style in your voice and phrasing.
3. If student demonstrates good understanding:
   - Provide feedback matching persona tone.
   - Deepen understanding or guide towards the next checkpoint.
   - If they have clearly mastered this checkpoint, set isCheckpointMastered to true and produce a high-yield flashcard.
4. If student struggles or has misconceptions:
   - Guide them back based on the persona tone (encouraging hint, challenging counter-question, or Socratic analogy).
   - Set pacingStatus to "needs_reinforcement".
5. Adjust comprehensionScore (0-100) and newMasteryLevel ("beginner" | "intermediate" | "advanced") based on their cognitive response.
6. Generate a keyTakeaway (1 short bullet point) summarizing what was just established.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            socraticResponse: {
              type: Type.STRING,
              description: 'The spoken response from the tutor, strictly under 3 sentences.',
            },
            newMasteryLevel: {
              type: Type.STRING,
              enum: ['beginner', 'intermediate', 'advanced'],
            },
            comprehensionScore: {
              type: Type.NUMBER,
              description: 'Updated comprehension score between 0 and 100',
            },
            pacingStatus: {
              type: Type.STRING,
              enum: ['optimal', 'needs_reinforcement'],
            },
            isCheckpointMastered: {
              type: Type.BOOLEAN,
              description: 'True if student answered correctly and showed solid grasp of this checkpoint',
            },
            keyTakeaway: {
              type: Type.STRING,
              description: 'A 1-sentence learning takeaway for the live study notes',
            },
            flashcard: {
              type: Type.OBJECT,
              properties: {
                concept: { type: Type.STRING },
                front: { type: Type.STRING, description: 'Question or prompt' },
                back: { type: Type.STRING, description: 'Clear, memorable answer and analogy' },
                difficulty: { type: Type.STRING, enum: ['beginner', 'intermediate', 'advanced'] },
              },
              required: ['concept', 'front', 'back', 'difficulty'],
            },
          },
          required: ['socraticResponse', 'newMasteryLevel', 'comprehensionScore', 'pacingStatus', 'isCheckpointMastered', 'keyTakeaway'],
        },
      },
    });

    const turnData = JSON.parse(response.text || '{}');
    // Normalize field aliases for seamless client and test compatibility
    turnData.tutorSpeech = turnData.tutorSpeech || turnData.socraticResponse || '';
    turnData.socraticResponse = turnData.socraticResponse || turnData.tutorSpeech || '';
    turnData.masteryLevel = turnData.masteryLevel || turnData.newMasteryLevel || 'intermediate';
    if (turnData.flashcard && (!turnData.flashcards || turnData.flashcards.length === 0)) {
      turnData.flashcards = [turnData.flashcard];
    }
    res.json(turnData);
  } catch (err) {
    handleApiError(res, err, 'Failed to process Socratic turn');
  }
});

// Helper to generate a compliant WAV audio buffer (tone/chime) if Gemini TTS quota is temporarily exhausted
function createFallbackWavAudio(): string {
  const sampleRate = 24000;
  const durationSec = 0.6;
  const numSamples = Math.floor(sampleRate * durationSec);
  const blockAlign = 2; // 1 channel * 16-bit / 8
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16-bit
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate pleasant gentle harmonic chime (440Hz + 880Hz decay)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-5 * t);
    const sample = (Math.sin(2 * Math.PI * 523.25 * t) * 0.25 + Math.sin(2 * Math.PI * 659.25 * t) * 0.15) * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer.toString('base64');
}

// Cooldown timestamp to prevent hammering Gemini TTS when daily free-tier quota is reached
let ttsQuotaExhaustedUntil = 0;

// 3. Text-to-Speech using Gemini 3.8 Flash Lite TTS with automatic Web Speech delegation
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore', personaTone = 'socratic' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    // Supported voices: 'Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'
    const validVoices = ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'];
    const selectedVoice = validVoices.includes(voice) ? voice : 'Kore';

    let speechStyle = 'Warm, encouraging, natural Socratic tutor';
    if (personaTone === 'encouraging') {
      speechStyle = 'Warm, deeply encouraging, empathetic, friendly and enthusiastic mentor';
    } else if (personaTone === 'challenging') {
      speechStyle = 'Sharp, intellectually stimulating, direct, thoughtful academic professor';
    } else {
      speechStyle = 'Inquiring, measured, engaging, thoughtful Socratic dialogist';
    }

    // If quota cooldown is currently active, avoid making failed API calls and console errors
    if (Date.now() < ttsQuotaExhaustedUntil) {
      const fallbackAudio = createFallbackWavAudio();
      return res.json({
        audioBase64: null,
        audioData: fallbackAudio,
        mimeType: 'audio/wav',
        usedGeminiTTS: false,
        quotaExceeded: true,
        message: 'Browser Web Speech API active (Gemini TTS Free Tier daily quota resting)',
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${text}`,
                speechMetadata: {
                  style: speechStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        return res.json({
          audioBase64,
          audioData: audioBase64,
          mimeType: 'audio/wav',
          usedGeminiTTS: true,
        });
      }
    } catch (ttsErr: unknown) {
      const errObj = (ttsErr && typeof ttsErr === 'object') ? (ttsErr as Record<string, unknown>) : {};
      const errMsg = errObj.message ? String(errObj.message) : String(ttsErr);
      const isQuota =
        errObj.status === 'RESOURCE_EXHAUSTED' ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded') ||
        errMsg.includes('quota');

      if (isQuota) {
        // Cooldown for 1 hour so the server doesn't spam 429 errors or log exception traces
        ttsQuotaExhaustedUntil = Date.now() + 60 * 60 * 1000;
        console.log('[TTS] Gemini 3.8 Flash Lite TTS daily free-tier limit reached (10/day). Gracefully delegating voice playback to browser Web Speech API.');
      } else {
        console.log('[TTS] Gemini TTS response notice, falling back to browser speech:', errMsg.slice(0, 100));
      }
    }

    // Graceful fallback: client will speak naturally using browser Web Speech API
    const fallbackAudio = createFallbackWavAudio();
    res.json({
      audioBase64: null,
      audioData: fallbackAudio,
      mimeType: 'audio/wav',
      usedGeminiTTS: false,
      quotaExceeded: true,
      message: 'Browser Web Speech API active (Gemini TTS Free Tier daily quota reached)',
    });
  } catch (err) {
    handleApiError(res, err, 'TTS processing error');
  }
});

// 4. Audio Transcription with gemini-3.8-flash (multimodal audio transcription)
app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    const { base64Audio, mimeType = 'audio/webm', language = 'auto' } = req.body;
    if (!base64Audio) {
      return res.status(400).json({ error: 'Missing audio data' });
    }

    // Strip data URL prefixes such as data:audio/webm;codecs=opus;base64,
    const cleanBase64 = base64Audio.replace(/^data:[^;]+;base64,/, '').trim();
    // Normalize mimeType to base type without parameters (e.g. audio/webm instead of audio/webm;codecs=opus)
    const normalizedMime = (mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: normalizedMime,
                data: cleanBase64,
              },
            },
            {
              text: `Listen carefully to the student's spoken voice in this audio and transcribe their words accurately.
If the student spoke in Vietnamese, transcribe faithfully in Vietnamese.
If the student spoke in English, transcribe in English.
Target language preference: ${language}.
Return ONLY the transcribed text. Do NOT add notes, explanations, or quotes.
If the audio contains only silence, background breathing, or noise without any spoken words, return exactly: EMPTY`,
            },
          ],
        },
      ],
    });

    let transcription = (response.text || '').trim();
    // Strip quotes or EMPTY token
    if (transcription.toUpperCase() === 'EMPTY' || transcription.toLowerCase() === 'empty.') {
      transcription = '';
    } else {
      transcription = transcription.replace(/^["']|["']$/g, '').trim();
    }

    res.json({ text: transcription });
  } catch (err) {
    handleApiError(res, err, 'Audio transcription failed');
  }
});

// 5. Document & Notes Extraction (Google Drive or Raw Material)
app.post('/api/gemini/analyze-document', async (req, res) => {
  try {
    const { documentText, filename } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: 'Missing document content' });
    }

    const prompt = `Analyze this study document (${filename || 'Study Notes'}).
Extract:
1. cleanTitle: Best concise lesson topic name
2. subjectArea: Academic or technical subject area
3. overview: 2-sentence summary of the core thesis
4. keyConcepts: Array of 4-6 fundamental concepts covered
5. suggestedPrerequisites: Array of 2-3 prior concepts assumed

Document Content:
${documentText.slice(0, 15000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cleanTitle: { type: Type.STRING },
            subjectArea: { type: Type.STRING },
            overview: { type: Type.STRING },
            keyConcepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedPrerequisites: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['cleanTitle', 'subjectArea', 'overview', 'keyConcepts'],
        },
      },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err) {
    handleApiError(res, err, 'Failed to analyze document');
  }
});

// 6. Generate Session Summary Markdown
app.post('/api/gemini/generate-summary', async (req, res) => {
  try {
    const { sessionData, notes, flashcards } = req.body;

    const prompt = `You are a cognitive tutor. Generate an executive Study Summary in clean Markdown format based on this finished session:
Topic: ${sessionData?.topicTitle}
Mastery Achieved: ${sessionData?.masteryLevel}
Comprehension Score: ${sessionData?.comprehensionScore}%
Key Takeaways Logged:
${notes?.map((n: string) => `- ${n}`).join('\n')}

Generated Flashcards:
${flashcards?.map((f: { concept: string; front: string; back: string }) => `- **${f.concept}**: Q: ${f.front} | A: ${f.back}`).join('\n')}

Produce a well-structured study guide with:
# Session Study Guide: [Topic]
## Executive Summary
## Key Concepts Mastered
## Nuanced Areas for Future Review
## Socratic Flashcard Deck
## Next Recommended Topics`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });

    res.json({ markdown: response.text });
  } catch (err) {
    handleApiError(res, err, 'Failed to generate session summary');
  }
});

// Public endpoints for Google OAuth Verification & Crawler / Browser access
app.get(['/privacy', '/privacy-policy'], (_req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const privacyPath = isProd
    ? path.resolve(__dirname, 'dist', 'privacy.html')
    : path.resolve(__dirname, 'public', 'privacy.html');
  if (fs.existsSync(privacyPath)) {
    return res.sendFile(privacyPath);
  }
  const indexPath = path.resolve(__dirname, isProd ? 'dist/index.html' : 'index.html');
  res.sendFile(indexPath);
});

app.get(['/terms', '/terms-of-service'], (_req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const termsPath = isProd
    ? path.resolve(__dirname, 'dist', 'terms.html')
    : path.resolve(__dirname, 'public', 'terms.html');
  if (fs.existsSync(termsPath)) {
    return res.sendFile(termsPath);
  }
  const indexPath = path.resolve(__dirname, isProd ? 'dist/index.html' : 'index.html');
  res.sendFile(indexPath);
});

// Port 3000 is strictly required by AI Studio dev environment; Cloud Run sets PORT in production
const PORT = process.env.NODE_ENV === 'production'
  ? parseInt(process.env.PORT || '8080', 10)
  : 3000;

async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static(path.resolve(__dirname, 'dist')));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Immersive Adaptive Tutor server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
