'use strict';
const axios = require('axios');

// ─── Model routing ───────────────────────────────────────
// To add Claude later: change value to 'claude' and add callClaude()
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

// ─── Parse request body ──────────────────────────────────
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

// ─── Gemini API caller ───────────────────────────────────
async function callGemini(prompt, modelKey, options) {
  const apiKey  = process.env.GEMINI_API_KEY;
  const modelId = GEMINI_MODELS[modelKey] || GEMINI_MODELS['gemini-flash'];
  const url     = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature:     (options && options.temperature)     || 0.3,
      maxOutputTokens: (options && options.maxOutputTokens) || 2048,
    }
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000
  });

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { success: true, text, model: modelId };
}

// ─── AI Router ───────────────────────────────────────────
// All functions call this — never Gemini directly.
// Future: add Claude routing here when API is purchased.
async function callAI(taskType, prompt, options) {
  const modelKey = MODEL_ROUTING[taskType] || 'gemini-flash';

  // Future Claude routing:
  // if (modelKey === 'claude') return await callClaude(prompt, options);

  return await callGemini(prompt, modelKey, options);
}

// ─── Catalyst entry point ────────────────────────────────
module.exports = (req, res) => {
  parseBody(req)
    .then(body => {
      const { taskType, prompt, options } = body;

      if (!taskType || !prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'taskType and prompt are required'
        }));
        return Promise.resolve(null);
      }

      return callAI(taskType, prompt, options);
    })
    .then(result => {
      if (result === null) return;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    })
    .catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: err.message
      }));
    });
};

module.exports.callAI = callAI;