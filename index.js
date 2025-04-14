require('dotenv').config();
const axios = require('axios');

const endpoint =
  'https://internal.devtest.truefoundry.tech/api/llm/api/inference/openai/chat/completions';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.API_KEY}`,
  'X-TFY-METADATA': `{"tfy_log_request":"${
    process.env.TFY_LOG_REQUEST || 'true'
  }"}`,
};

const payloadSize = parseInt(process.env.PAYLOAD_SIZE || '200', 10);

function createPayload(providerName, streamMode) {
  return {
    model: `${providerName}/gpt-3-5`,
    messages: [
      { role: 'system', content: 'You are an AI bot.' },
      {
        role: 'user',
        content: 'Enter your prompt here. '.repeat(payloadSize),
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

async function callEndpoint(endpoint, providerName, useStream) {
  try {
    const payload = createPayload(providerName, useStream);
    const response = await axios.post(endpoint, payload, { headers });
  } catch (error) {
    console.error(
      `Error calling ${endpoint} with provider ${providerName} (stream=${useStream}):`,
      error.message
    );
  }
}

async function main() {
  const totalRPS = parseInt(process.env.TOTAL_RPS || '10', 10);
  const delayBetweenRequests = 1000 / totalRPS;

  const providers = ['fake-azure-openai', 'openai-fake-provider'];

  let requestCounter = 0;

  setInterval(() => {
    const providerIndex = requestCounter % providers.length;
    const providerName = providers[providerIndex];

    const useStream = requestCounter % 4 < 2 ? true : false;

    callEndpoint(endpoint, providerName, useStream);

    requestCounter++;
  }, delayBetweenRequests);
}

main();
