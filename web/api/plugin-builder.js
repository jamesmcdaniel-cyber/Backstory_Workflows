import { CADENCES, isGeneratedPath } from '../src/lib/pluginFormat.js';
import { AUDIENCES, runBlueprint, runFile, runScope } from './_pluginBuilder.js';

const LIMITS = { useCase: 2000, tried: 4000, setup: 3000, answer: 500, change: 1000, blueprint: 40000, file: 40000 };
const STAGES = ['scope', 'blueprint', 'file'];

function text(value, max) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > max) return null;
  return value.trim();
}

// A blueprint comes back from the page on the file stage and on a change. It
// was written by the server, but it crossed the network, so check its shape.
function cleanBlueprint(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (JSON.stringify(value).length > LIMITS.blueprint) return null;
  if (typeof value.name !== 'string' || !Array.isArray(value.plan) || !value.plan.every((item) => item && typeof item.path === 'string')) return null;
  return value;
}

// Returns the cleaned request, or null if anything is the wrong shape or too
// long. Oversized input is rejected, not cut, so nothing is silently dropped.
export function parseRequest(body) {
  const { stage, useCase, audience, cadence, tried, setup, answers, previous, change, blueprint, path, previousContent } = body || {};
  if (!STAGES.includes(stage)) return null;
  const clean = {
    useCase: text(useCase, LIMITS.useCase),
    tried: text(tried, LIMITS.tried),
    setup: text(setup, LIMITS.setup),
    change: text(change, LIMITS.change),
  };
  if (!clean.useCase || Object.values(clean).some((value) => value === null)) return null;
  if (audience && !AUDIENCES.includes(audience)) return null;
  if (cadence && !CADENCES.includes(cadence)) return null;
  if (answers !== undefined && (!Array.isArray(answers) || answers.length > 3)) return null;
  const cleanAnswers = (answers || []).map((item) => ({ question: text(item?.question, LIMITS.answer), answer: text(item?.answer, LIMITS.answer) }));
  if (cleanAnswers.some((item) => item.question === null || item.answer === null)) return null;
  const request = { stage, ...clean, audience: audience || '', cadence: cadence || '', answers: cleanAnswers };

  if (previous !== undefined) {
    if (stage !== 'blueprint' || !clean.change) return null;
    request.previous = cleanBlueprint(previous);
    if (!request.previous) return null;
  }
  if (stage === 'file') {
    request.blueprint = cleanBlueprint(blueprint);
    if (!request.blueprint || typeof path !== 'string' || !isGeneratedPath(path)) return null;
    if (!request.blueprint.plan.some((item) => item.path === path)) return null;
    request.path = path;
    const cleanPrevious = text(previousContent, LIMITS.file);
    if (cleanPrevious === null || (cleanPrevious && !clean.change)) return null;
    request.previousContent = cleanPrevious;
  }
  return request;
}

const RUN = { scope: runScope, blueprint: runBlueprint, file: runFile };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const request = parseRequest(req.body);
  if (!request) return res.status(400).json({ error: 'Invalid request' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ reply: 'The Plugin Builder is offline right now (no API key configured).' });
  }
  try {
    return res.status(200).json(await RUN[request.stage](request));
  } catch {
    return res.status(502).json({ reply: 'The Plugin Builder hit an error. Give it another try in a moment.' });
  }
}
