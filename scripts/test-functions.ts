/**
 * CLI Test Function Runner for Immersive Adaptive Tutor
 * Run via: npm test or npx tsx scripts/test-functions.ts
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  category: 'Backend' | 'Gemini Services' | 'Export';
  durationMs: number;
  status: 'PASS' | 'FAIL';
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  category: 'Backend' | 'Gemini Services' | 'Export',
  testFn: () => Promise<{ details?: string }>
) {
  const start = Date.now();
  try {
    process.stdout.write(`⏳ Running: [${category}] ${name}... `);
    const res = await testFn();
    const durationMs = Date.now() - start;
    results.push({
      name,
      category,
      durationMs,
      status: 'PASS',
      details: res.details,
    });
    console.log(`\x1b[32m✔ PASS\x1b[0m (${durationMs}ms)`);
    if (res.details) {
      console.log(`   └─ \x1b[90m${res.details}\x1b[0m`);
    }
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({
      name,
      category,
      durationMs,
      status: 'FAIL',
      error: errorMsg,
    });
    console.log(`\x1b[31m✖ FAIL\x1b[0m (${durationMs}ms)`);
    console.log(`   └─ \x1b[31mError: ${errorMsg}\x1b[0m`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 Immersive Adaptive Tutor — Automated Test Runner');
  console.log(`Target Host: ${BASE_URL}`);
  console.log('======================================================\n');

  // Test 1: Server Health Check
  await runTest('Server Diagnostics Health Check', 'Backend', async () => {
    const resp = await fetch(`${BASE_URL}/api/health`);
    if (!resp.ok) throw new Error(`HTTP status ${resp.status}`);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(`Unexpected status: ${data.status}`);
    return {
      details: `Status: ${data.status}, Gemini Configured: ${data.geminiConfigured}`,
    };
  });

  // Test 2: Gemini Roadmap Generation
  await runTest('Gemini Roadmap Generation (gemini-3.1-flash-lite)', 'Gemini Services', async () => {
    const resp = await fetch(`${BASE_URL}/api/gemini/generate-roadmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicTitle: 'Photosynthesis Light-Dependent Reactions',
        content: 'How chlorophyll captures photons and splits water to generate ATP and NADPH via electron transport chain.',
      }),
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (!data.checkpoints || !Array.isArray(data.checkpoints) || data.checkpoints.length === 0) {
      throw new Error('Checkpoints array is missing or empty');
    }
    return {
      details: `Generated ${data.checkpoints.length} checkpoints for "${data.topicTitle}" (${data.baselineDifficulty})`,
    };
  });

  // Test 3: Socratic Dialogue Engine with Persona Modulation
  await runTest('Socratic Turn Engine with Persona Modulation', 'Gemini Services', async () => {
    const resp = await fetch(`${BASE_URL}/api/gemini/socratic-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicTitle: 'Photosynthesis',
        checkpoint: {
          id: 'cp-1',
          title: 'Photosystem II & Photolysis',
          description: 'Splitting of water molecules to release electrons and oxygen.',
          keyQuestion: 'What molecule provides the electrons replacing those energized by sunlight?',
          estimatedMinutes: 4,
        },
        conversationHistory: [
          { role: 'model', text: 'Where do the replacement electrons originate in photosystem II?' }
        ],
        userMessage: 'Water molecules are split into hydrogen ions, electrons, and oxygen gas.',
        currentMastery: 'developing',
        currentComprehension: 65,
        checkpointIndex: 0,
        totalCheckpoints: 4,
        personaTone: 'encouraging',
      }),
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    const speech = data.tutorSpeech || data.socraticResponse;
    if (!speech) throw new Error('Missing tutorSpeech/socraticResponse in response');
    if (typeof data.comprehensionScore !== 'number') throw new Error('Missing numeric comprehensionScore');
    return {
      details: `Comprehension: ${data.comprehensionScore}%, Mastery: ${data.masteryLevel || data.newMasteryLevel}, Flashcards: ${data.flashcards?.length || (data.flashcard ? 1 : 0)}`,
    };
  });

  let generatedAudioForTranscribe = '';

  // Test 4: Neural TTS Voice Synthesis
  await runTest('Neural Audio Synthesis (gemini-3.8-flash-lite-tts)', 'Gemini Services', async () => {
    const resp = await fetch(`${BASE_URL}/api/gemini/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Welcome to your adaptive learning session. Let us begin.',
      }),
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    const audioPayload = data.audioData || data.audioBase64;
    if (!audioPayload) throw new Error('Missing audioData/audioBase64 in response');
    generatedAudioForTranscribe = audioPayload;
    return {
      details: `Received audio buffer (${data.mimeType || 'audio/wav'}, length: ${audioPayload.length} chars)`,
    };
  });

  // Test 5: Audio Speech Transcription (gemini-3.5-transcribe)
  await runTest('Audio Speech Transcription (gemini-3.5-transcribe)', 'Gemini Services', async () => {
    if (!generatedAudioForTranscribe) {
      throw new Error('No audio buffer available from TTS step to transcribe');
    }
    const resp = await fetch(`${BASE_URL}/api/gemini/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Audio: generatedAudioForTranscribe,
        mimeType: 'audio/wav',
      }),
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (typeof data.text !== 'string') throw new Error('Invalid transcription response payload');
    return {
      details: `Transcribed audio text: "${data.text.slice(0, 60)}..."`,
    };
  });

  // Test 6: Document Analysis
  await runTest('Document Analysis & Knowledge Extraction', 'Gemini Services', async () => {
    const sampleDoc = `
      CAP Theorem in Distributed Systems:
      In theoretical computer science, the CAP theorem states that any distributed data store
      can provide at most two of the following three guarantees: Consistency, Availability,
      and Partition tolerance. When network partitions occur, one must trade off between
      consistency and availability.
    `;
    const resp = await fetch(`${BASE_URL}/api/gemini/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentText: sampleDoc,
        filename: 'Distributed_Systems_Notes.txt',
      }),
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (!data.cleanTitle || !data.keyConcepts) throw new Error('Invalid analysis payload');
    return {
      details: `Extracted: "${data.cleanTitle}" with ${data.keyConcepts.length} concepts`,
    };
  });

  // Print Summary Table
  console.log('\n======================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('======================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  results.forEach((r, idx) => {
    const icon = r.status === 'PASS' ? '\x1b[32m✔ PASS\x1b[0m' : '\x1b[31m✖ FAIL\x1b[0m';
    console.log(`${idx + 1}. [${r.category}] ${r.name.padEnd(45)} ${icon} (${r.durationMs}ms)`);
  });

  console.log('------------------------------------------------------');
  console.log(`Total: ${results.length} | Passed: \x1b[32m${passed}\x1b[0m | Failed: \x1b[31m${failed}\x1b[0m | Time: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
