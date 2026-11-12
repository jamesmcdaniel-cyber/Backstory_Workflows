import { AUDIENCES, runGenerate, runScope } from './_skillBuilder.js';

const LIMITS = { useCase: 2000, tried: 4000, answer: 500, change: 1000, skillBody: 40000 };

function text(value, max) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > max) return null;
  return value.trim();
}

// Returns the cleaned request, or null if anything is the wrong shape or too
// long. Oversized input is rejected, not cut, so nothing is silently dropped.
export function parseRequest(body) {
  const { stage, useCase, audience, tried, answers, previous, change } = body || {};
  if (!['scope', 'generate'].includes(stage)) return null;
  const cleanUseCase = text(useCase, LIMITS.useCase);
  const cleanTried = text(tried, LIMITS.tried);
  const cleanChange = text(change, LIMITS.change);
  if (!cleanUseCase || cleanTried === null || cleanChange === null) return null;
  if (audience && !AUDIENCES.includes(audience)) return null;
  if (answers !== undefined && (!Array.isArray(answers) || answers.length > 3)) return null;
  const cleanAnswers = (answers || []).map((item) => ({ question: text(item?.question, LIMITS.answer), answer: text(item?.answer, LIMITS.answer) }));
  if (cleanAnswers.some((item) => item.question === null || item.answer === null)) return null;
  let cleanPrevious;
  if (previous) {
    cleanPrevious = { name: text(previous.name, 64), description: text(previous.description, LIMITS.answer), body: text(previous.body, LIMITS.skillBody) };
    if (Object.values(cleanPrevious).some((value) => value === null) || !cleanChange) return null;
  }
  return { stage, useCase: cleanUseCase, audience: audience || '', tried: cleanTried, answers: cleanAnswers, previous: cleanPrevious, change: cleanChange };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const request = parseRequest(req.body);
  if (!request) return res.status(400).json({ error: 'Invalid request' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ reply: 'The Skill Builder is offline right now (no API key configured).' });
  }
  try {
    const result = request.stage === 'scope' ? await runScope(request) : await runGenerate(request);
    return res.status(200).json(result);
  } catch {
    return res.status(502).json({ reply: 'The Skill Builder hit an error. Give it another try in a moment.' });
  }
}
