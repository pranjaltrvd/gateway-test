require('dotenv').config();
const axios = require('axios');

class LatencyTracker {
  constructor(windowSizeMs = 5000) {
    this.windowSizeMs = windowSizeMs;
    this.latencies = [];
    this.lastReportTime = performance.now();
  }

  addLatency(latencyMs) {
    const now = performance.now();
    this.latencies.push({
      timestamp: now,
      value: latencyMs
    });

    // Clean up old entries
    this.latencies = this.latencies.filter(entry => now - entry.timestamp < this.windowSizeMs);

    // Report stats every window size
    if (now - this.lastReportTime >= this.windowSizeMs) {
      this.reportStats();
      this.lastReportTime = now;
    }
  }

  calculatePercentile(percentile) {
    if (this.latencies.length === 0) return 0;

    const values = this.latencies.map(entry => entry.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  reportStats() {
    if (this.latencies.length === 0) {
      console.log("No latency data available yet");
      return;
    }

    const values = this.latencies.map(entry => entry.value);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const p90 = this.calculatePercentile(90);
    const p99 = this.calculatePercentile(99);

    console.log(`\n--- Latency Stats (${this.latencies.length} requests in last ${this.windowSizeMs / 1000}s) ---`);
    console.log(`Average: ${avg.toFixed(2)}ms`);
    console.log(`P90: ${p90.toFixed(2)}ms`);
    console.log(`P99: ${p99.toFixed(2)}ms`);
    console.log("------------------------------");
  }
}

const latencyTracker = new LatencyTracker(5000);

const endpoint = process.env.ENDPOINT ||
  'https://internal.devtest.truefoundry.tech/api/llm/api/inference/openai/chat/completions';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.API_KEY}`,
  'X-TFY-METADATA': `{"tfy_log_request":"${process.env.TFY_LOG_REQUEST || 'true'
    }"}`,
};


function generateRandomPrompt() {
  const minWords = 750;
  const maxWords = 1500;
  const wordCount = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;

  const words = [];
  const possibleWords = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for', 'not', 'on', 'with',
    'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
    'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up',
    'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time',
    'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
    'data', 'model', 'system', 'user', 'input', 'process', 'random', 'token', 'artificial',
    'intelligence', 'machine', 'learning', 'algorithm', 'neural', 'network', 'deep', 'training',
    'function', 'parameter', 'variable', 'compute', 'performance', 'analysis', 'testing', 'development'
  ];

  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * possibleWords.length);
    words.push(possibleWords[randomIndex]);
  }

  const punctuated = words.map(word => {
    if (Math.random() < 0.1) {
      const puncts = ['.', ',', '?', '!', ';', ':'];
      const randomPunct = puncts[Math.floor(Math.random() * puncts.length)];
      return word + randomPunct;
    }
    return word;
  });

  let result = '';
  for (let i = 0; i < punctuated.length; i++) {
    result += punctuated[i];
    if (Math.random() < 0.05) {
      result += '\n';
    } else {
      result += ' ';
    }
  }

  return result;
}

function createPayload(modelName, streamMode) {
  return {
    model: modelName,
    messages: [
      { role: 'system', content: 'You are an AI bot.' },
      {
        role: 'user',
        content: generateRandomPrompt(),
      },
    ],
    temperature: 0.7,
    max_tokens: 256,
    top_p: 0.8,
    top_k: 50,
    frequency_penalty: 0,
    presence_penalty: 0,
    repetition_penalty: 1,
    stop: ['</s>'],
    stream: streamMode,
  };
}

async function callEndpoint(endpoint, modelName, useStream) {
  const startTime = performance.now();
  try {
    const payload = createPayload(modelName, useStream);
    await axios.post(endpoint, payload, { headers });
    const latency = performance.now() - startTime;
    latencyTracker.addLatency(latency);
  } catch (error) {
    const latency = performance.now() - startTime;
    latencyTracker.addLatency(latency);
    console.error(
      `Error calling ${endpoint} with model ${modelName} (stream=${useStream}):`,
      error.message
    );
  }
}

async function main() {
  const totalRPS = parseInt(process.env.TOTAL_RPS || '500', 10);

  const batchSize = 10;
  const batchesPerSecond = totalRPS / batchSize;
  const delayBetweenBatches = 1000 / batchesPerSecond;

  const noLatencyMode = process.env.NO_LATENCY_MODE === 'true';

  const models = noLatencyMode
    ? ['openai-fake-provider/no-latency-model']
    : ['openai-fake-provider/gpt-3-5-turbo', 'openai-fake-provider/gpt-4', 'gpt-3-5'];


  let requestCounter = 0;

  setInterval(() => {
    const promises = [];

    for (let i = 0; i < batchSize; i++) {
      const modelIndex = requestCounter % models.length;
      const modelName = models[modelIndex];

      const useStream = noLatencyMode ? false : requestCounter % 4 < 2;

      promises.push(callEndpoint(endpoint, modelName, useStream));

      requestCounter++;
    }

    Promise.all(promises).catch(err => {
      console.error('Error in batch processing:', err);
    });
  }, delayBetweenBatches);
}

main();
