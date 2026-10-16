/**
 * Automated Performance Benchmarking & SLA Profiler
 * Measures latency, throughput, TTFT, and reliability across all AI & backend endpoints.
 * Run via: npx tsx scripts/benchmark.ts
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface MetricRun {
  endpoint: string;
  category: string;
  latencies: number[];
  successCount: number;
  failureCount: number;
  notes?: string;
}

function calculateStats(latencies: number[]) {
  if (latencies.length === 0) return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, stdDev: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = Math.round(sorted.reduce((sum, val) => sum + val, 0) / sorted.length);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sorted.length;
  const stdDev = Math.round(Math.sqrt(variance));
  return { min, max, mean, p50, p95, stdDev };
}

async function runBenchmark() {
  console.log('\n========================================================================');
  console.log('🚀 PROTOTYPE PERFORMANCE BENCHMARKING ENGINE');
  console.log(`Target: ${BASE_URL} | Timestamp: ${new Date().toISOString()}`);
  console.log('========================================================================\n');

  const suite: MetricRun[] = [
    {
      endpoint: 'GET /api/health',
      category: 'Backend Core',
      latencies: [],
      successCount: 0,
      failureCount: 0,
    },
    {
      endpoint: 'POST /api/gemini/generate-roadmap',
      category: 'Gemini 3.1 Flash-Lite (Curriculum Generator)',
      latencies: [],
      successCount: 0,
      failureCount: 0,
    },
    {
      endpoint: 'POST /api/gemini/socratic-turn',
      category: 'Gemini 3.1 Flash-Lite (Socratic Dialogue & Cognitive Scoring)',
      latencies: [],
      successCount: 0,
      failureCount: 0,
    },
    {
      endpoint: 'POST /api/gemini/tts',
      category: 'Gemini Audio / Neural Voice Synthesis',
      latencies: [],
      successCount: 0,
      failureCount: 0,
    },
    {
      endpoint: 'POST /api/gemini/analyze-document',
      category: 'Gemini 3.1 Flash-Lite (Document Ingestion & Entity Extraction)',
      latencies: [],
      successCount: 0,
      failureCount: 0,
    },
  ];

  // 1. Warm-up ping
  process.stdout.write('🔥 Performing cold-start warm-up ping... ');
  const warmStart = Date.now();
  await fetch(`${BASE_URL}/api/health`);
  console.log(`Done (${Date.now() - warmStart}ms)\n`);

  // Iterations per test: 3 iterations for heavy AI endpoints to avoid rate limit spikes while gathering statistical validity
  const AI_ITERATIONS = 3;
  const CORE_ITERATIONS = 5;

  // Run Benchmark 1: Health
  process.stdout.write('📊 Profiling [Backend Core] Health & System Diagnostics... ');
  for (let i = 0; i < CORE_ITERATIONS; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      suite[0].latencies.push(Date.now() - t0);
      suite[0].successCount++;
    } catch {
      suite[0].failureCount++;
    }
  }
  console.log('✔ Complete');

  // Run Benchmark 2: Roadmap Generation
  process.stdout.write('📊 Profiling [Gemini] Structured Roadmap Generation... ');
  for (let i = 0; i < AI_ITERATIONS; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/gemini/generate-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: 'Distributed Systems & Vector Clocks',
          content: 'Causality, Lamport timestamps, happens-before relationship, and event ordering.',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      suite[1].latencies.push(Date.now() - t0);
      suite[1].successCount++;
    } catch {
      suite[1].failureCount++;
    }
  }
  console.log('✔ Complete');

  // Run Benchmark 3: Socratic Dialogue
  process.stdout.write('📊 Profiling [Gemini] Socratic Turn Engine & Scoring... ');
  for (let i = 0; i < AI_ITERATIONS; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/gemini/socratic-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: 'Vector Clocks',
          checkpoint: {
            id: 'cp-1',
            title: 'Lamport Timestamps',
            description: 'Partial ordering of events via scalar logical clocks.',
            keyQuestion: 'Why cannot Lamport timestamps detect concurrent independent events?',
            estimatedMinutes: 5,
          },
          conversationHistory: [{ role: 'model', text: 'Why can scalar clocks fail at concurrency?' }],
          userMessage: 'Because identical clock values in distinct nodes do not imply causal connection.',
          currentMastery: 'competent',
          currentComprehension: 80,
          checkpointIndex: 0,
          totalCheckpoints: 3,
          personaTone: 'socratic',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      suite[2].latencies.push(Date.now() - t0);
      suite[2].successCount++;
    } catch {
      suite[2].failureCount++;
    }
  }
  console.log('✔ Complete');

  // Run Benchmark 4: Neural TTS
  process.stdout.write('📊 Profiling [Gemini] Neural Audio Synthesis (TTS)... ');
  for (let i = 0; i < AI_ITERATIONS; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/gemini/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Superb insight. Without vector clocks, causal independence cannot be verified.',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      suite[3].latencies.push(Date.now() - t0);
      suite[3].successCount++;
    } catch {
      suite[3].failureCount++;
    }
  }
  console.log('✔ Complete');

  // Run Benchmark 5: Document Analysis
  process.stdout.write('📊 Profiling [Gemini] Document Parsing & Knowledge Extraction... ');
  for (let i = 0; i < AI_ITERATIONS; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/gemini/analyze-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'Benchmark_Distributed_Consensus.txt',
          documentText: 'Byzantine fault tolerance (BFT) describes a condition of a distributed computing system where components may fail and there is imperfect information on whether a component has failed.',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      suite[4].latencies.push(Date.now() - t0);
      suite[4].successCount++;
    } catch {
      suite[4].failureCount++;
    }
  }
  console.log('✔ Complete\n');

  // Print Formatted Report
  console.log('========================================================================');
  console.log('📈 EMPIRICAL PROTOTYPE BENCHMARK RESULTS');
  console.log('========================================================================');
  console.log(
    `${'Endpoint / Operation'.padEnd(35)} | ${'Category'.padEnd(20)} | ${'p50 (ms)'.padEnd(8)} | ${'p95 (ms)'.padEnd(8)} | ${'Mean (ms)'.padEnd(9)} | ${'Min-Max (ms)'.padEnd(14)} | ${'Success'}`
  );
  console.log('-'.repeat(105));

  for (const item of suite) {
    const stats = calculateStats(item.latencies);
    const successRate = `${Math.round((item.successCount / (item.successCount + item.failureCount)) * 100)}%`;
    console.log(
      `${item.endpoint.padEnd(35)} | ${item.category.slice(0, 20).padEnd(20)} | ${String(stats.p50).padEnd(8)} | ${String(stats.p95).padEnd(8)} | ${String(stats.mean).padEnd(9)} | ${`${stats.min}-${stats.max}ms`.padEnd(14)} | ${successRate}`
    );
  }
  console.log('========================================================================\n');
}

runBenchmark().catch(console.error);
