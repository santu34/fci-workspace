'use strict';
const { callAI } = require('./ai-router');

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

// ─── Build Gemini prompt ──────────────────────────────────
function buildPrompt(d) {
  return `
You are a senior business analyst for Funai Consulting India (FCI), a Zoho Premium Partner
serving Japanese and Indian enterprise clients.

Analyse the requirement below and return ONLY valid JSON — no markdown, no explanation.

PROJECT CONTEXT:
- Project Code : ${d.project_code || 'Unknown'}
- Project Name : ${d.project_name || 'Unknown'}
- Client       : ${d.client || 'Unknown'}
- Platform     : ${d.platform || 'Unknown'}
- Type         : ${d.project_type || 'Unknown'}
- Priority     : ${d.priority || 'Unknown'}
- Deadline     : ${d.deadline || 'Not specified'}
- Language     : ${d.language || 'English'}
- Assigned To  : ${d.assigned_to || 'Not assigned'}
- Japan Contact: ${d.japan_contact || 'Not provided'}
- India Manager: ${d.india_manager || 'Santhosh'}

REQUIREMENT TEXT:
${d.requirement_text || 'No requirement text provided'}

INSTRUCTIONS:
1. Write a 2-3 sentence summary of what is being requested.

2. Check the requirement against each gap item below.
   Only mark true if EXPLICITLY confirmed in the text — never assume:
   - clear_problem      : Is the problem or feature clearly described?
   - acceptance_criteria: Are success criteria or expected outcomes defined?
   - platform_specified : Is the Zoho module or platform clearly stated?
   - target_users       : Are the affected users or roles identified?
   - deadline_given     : Is a delivery deadline provided?
   - priority_given     : Is priority stated?
   - sandbox_available  : Is a sandbox or test environment mentioned?
   - related_screens    : Are related screens, flows, or modules referenced?
   - data_migration     : Are data migration or existing data needs addressed?
   - integration_needs  : Are integration points with other systems identified?
   - japan_rules        : If Japan requirement — are business rules documented?

3. For each item marked false, write a specific question addressed to
   the correct person (use japan_contact for business/scope questions,
   india_manager for technical questions, "Not assigned" if unclear).

4. Identify 2-5 risks. Categories: requirement, technical, communication, delivery, budget.

5. Determine status:
   - RECEIVED              : 0 gaps
   - GAP_DETECTED          : 1-3 gaps
   - CLARIFICATION_PENDING : 4 or more gaps

Return ONLY this JSON structure — no other text:
{
  "summary": "string",
  "status": "RECEIVED|GAP_DETECTED|CLARIFICATION_PENDING",
  "gap_count": number,
  "gaps": [
    {
      "question": "string",
      "send_to": "string",
      "category": "string"
    }
  ],
  "risk_count": number,
  "risks": [
    {
      "description": "string",
      "category": "string",
      "likelihood": "High|Medium|Low",
      "impact": "High|Medium|Low",
      "mitigation": "string"
    }
  ]
}
`.trim();
}

// ─── Parse Gemini JSON response ───────────────────────────
function parseResponse(text) {
  const clean = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();
  try {
    return { success: true, ...JSON.parse(clean) };
  } catch (e) {
    return { success: false, error: 'Failed to parse AI response', raw: text };
  }
}

// ─── Intake handler ───────────────────────────────────────
module.exports = (req, res) => {
  parseBody(req)
    .then(body => {
      if (!body.requirement_text) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'requirement_text is required'
        }));
        return Promise.resolve(null);
      }
      const prompt = buildPrompt(body);
      return callAI('gap-detection', prompt);
    })
    .then(result => {
      if (result === null) return;
      if (!result.success) throw new Error(result.error);
      const parsed = parseResponse(result.text);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(parsed));
    })
    .catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    });
};