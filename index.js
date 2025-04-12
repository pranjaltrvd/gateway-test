require('dotenv').config();
const axios = require('axios');

const endpoint =
  'https://internal.devtest.truefoundry.tech/api/llm/api/inference/openai/chat/completions';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.API_KEY}`,
  'X-TFY-METADATA': '{"tfy_log_request":"true"}',
};

const payload1 = {
  model: 'fake-azure-openai/gpt-3-5',
  messages: [
    { role: 'system', content: 'You are an AI bot.' },
    {
      role: 'user',
      content: 'Enter your prompt here. '.repeat(200),
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
  stream: false,
};

const payload2 = {
  model: 'openai-fake-provider/gpt-3-5',
  messages: [
    { role: 'system', content: 'You are an AI bot.' },
    {
      role: 'user',
      content: 'Enter your prompt here. '.repeat(200),
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
  stream: false,
};

let streamToggle = false;

async function callEndpoint(endpoint, payload) {
  try {
    payload.stream = streamToggle;
    const response = await axios.post(endpoint, payload, { headers });
    console.log(`Response from ${endpoint}:`, response.data);
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
  }
}

async function main() {
  let toggle = true;
  const totalRPS = 100;
  const intervals = 10;
  const requestsPerInterval = totalRPS / intervals;
  const intervalTime = 1000 / requestsPerInterval;

  for (let i = 0; i < intervals; i++) {
    setInterval(() => {
      const payload = toggle ? payload1 : payload2;
      callEndpoint(endpoint, payload);
      toggle = !toggle;
      streamToggle = !streamToggle;
    }, intervalTime);
  }
}

main();
