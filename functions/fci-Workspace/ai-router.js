'use strict';
const axios = require('axios');

const MODEL_ROUTING = {
  'gap-detection':    'gemini-flash',
  'risk-scoring':     'gemini-flash',
  'gap-evaluation':   'gemini-flash',
  'performance-eval': 'gemini-flash',
  'spec-builder':     'gemini-pro',
  'proposal-draft':   'gemini-pro',
  'japan-report':     'gemini-pro',
};

const GEMINI_MODELS = {
  'gemini-flash': 'gemini-2.5-flash',
  'gemini-pro':   'gemini-2.5-pro',
};

async function callGemini(prompt, modelKey, options) {
  const apiKey  = process.env.GEMINI_API_KEY;
  const modelId = GEMINI_MODELS[modelKey] || GEMINI_MODELS['gemini-flash'];
  const url     = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature:     (options && options.temperature)     || 0.3,
      maxOutputTokens: (options && options.maxOutputTokens) || 4096,
    }
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000
  });

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { success: true, text, model: modelId };
}

async function callAI(taskType, prompt, options) {
  const modelKey = MODEL_ROUTING[taskType] || 'gemini-flash';
  // Future: if (modelKey === 'claude') return await callClaude(prompt, options);
  return await callGemini(prompt, modelKey, options);
}

module.exports = { callAI };