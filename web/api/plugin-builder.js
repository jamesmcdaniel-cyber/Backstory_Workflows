import { CADENCES, PLATFORMS, isGeneratedPath } from '../src/lib/pluginFormat.js';
import { SETUP_LIMITS } from '../src/lib/setupFiles.js';
import { AUDIENCES, runBlueprint, runEditFile, runEditPlan, runFile, runFix, runScope } from './_pluginBuilder.js';
import { EDIT_LIMITS } from '../src/lib/editPackage.js';

const LIMITS = { useCase: 2000, tried: 4000, setup: 3000, answer: 500, change: 1000, blueprint: 60000, file: 40000, testOutput: 8000 };
const STAGES = ['scope', 'blueprint', 'file', 'fix', 'edit-plan', 'edit-file'];
const EDIT_STAGES = new Set(['edit-plan', 'edit-file']);
const packagePathOk = (path) => typeof path === 'string' && path.length > 0 && path.length <= 300 && !path.includes('..') && !path.startsWith('/') && /^[\w./ -]+$/.test(path);

// An uploaded skill, for the edit stages: its text files, within the limits
// the page enforces too. Too many, too large or a bad path is rejected.
function cleanPackage(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.files)) return null;
  if (value.files.length === 0 || value.files.length > EDIT_LIMITS.files) return null;
  let total = 0;
  const files = [];
  for (const file of value.files) {
    if (!packagePathOk(file?.path) || typeof file.content !== 'string' || file.content.length > EDIT_LIMITS.perFile) return null;
    total += file.content.length;
    files.push({ path: file.path, content: file.content });
  }
  if (total > EDIT_LIMITS.total) return null;
  const name = typeof value.name === 'string' ? value.name.slice(0, 100) : '';
  const version = typeof value.version === 'string' ? value.version.slice(0, 30) : '';
  return { name, version, files };
}

function parseEditRequest(body) {
  const { stage, platform, change, pkg, plan, path, testOutput, attachments } = body || {};
  const cleanChange = text(change, EDIT_LIMITS.change);
  if (!cleanChange || !PLATFORMS.includes(platform)) return null;
  const request = { stage, platform, change: cleanChange, pkg: cleanPackage(pkg) };
  if (!request.pkg) return null;
  if (attachments !== undefined) {
    if (stage !== 'edit-plan' || !Array.isArray(attachments) || attachments.length > SETUP_LIMITS.files) return null;
    const files = attachments.map((item) => ({ name: text(item?.name, SETUP_LIMITS.name), content: text(item?.content, SETUP_LIMITS.perFile) }));
    if (files.some((item) => !item.name || item.content === null) || files.reduce((sum, item) => sum + item.content.length, 0) > SETUP_LIMITS.total) return null;
    request.attachments = files;
  }
  if (stage === 'edit-file') {
    if (!plan || !Array.isArray(plan.changes) || plan.changes.length > 20) return null;
    const changes = plan.changes.map((item) => ({ path: item?.path, what: text(item?.what, 2000) }));
    if (changes.some((item) => !packagePathOk(item.path) || !item.what)) return null;
    if (!changes.some((item) => item.path === path)) return null;
    request.plan = { summary: text(plan.summary, 2000) || '', changes };
    request.path = path;
    const output = text(testOutput, LIMITS.testOutput);
    if (output === null) return null;
    if (output) request.testOutput = output;
  }
  return request;
}

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
  if (value.platform !== undefined && !PLATFORMS.includes(value.platform)) return null;
  return value;
}

// Returns the cleaned request, or null if anything is the wrong shape or too
// long. Oversized input is rejected, not cut, so nothing is silently dropped.
export function parseRequest(body) {
  if (EDIT_STAGES.has(body?.stage)) return parseEditRequest(body);
  const { stage, platform, useCase, audience, cadence, tried, setup, attachments, answers, previous, change, blueprint, path, previousContent, script, test, output } = body || {};
  if (!STAGES.includes(stage)) return null;
  if (platform !== undefined && !PLATFORMS.includes(platform)) return null;
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
  const request = { stage, platform: platform || 'claude', ...clean, audience: audience || '', cadence: cadence || '', answers: cleanAnswers };

  // Files the person added under "Your setup", for the fit check and the
  // design only. Too many, too large or the wrong shape is rejected, not cut.
  if (attachments !== undefined) {
    if (stage !== 'scope' && stage !== 'blueprint') return null;
    if (!Array.isArray(attachments) || attachments.length > SETUP_LIMITS.files) return null;
    const files = attachments.map((item) => ({ name: text(item?.name, SETUP_LIMITS.name), content: text(item?.content, SETUP_LIMITS.perFile) }));
    if (files.some((item) => !item.name || item.content === null)) return null;
    if (files.reduce((sum, item) => sum + item.content.length, 0) > SETUP_LIMITS.total) return null;
    request.attachments = files;
  }

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
  if (stage === 'fix') {
    request.blueprint = cleanBlueprint(blueprint);
    const planned = request.blueprint?.plan.find((item) => item.path === path);
    if (!planned || planned.kind !== 'script' || !planned.script?.name) return null;
    request.path = path;
    request.script = text(script, LIMITS.file);
    request.test = text(test, LIMITS.file);
    request.output = text(output, LIMITS.testOutput);
    if (!request.script || !request.test || !request.output) return null;
  }
  return request;
}

const RUN = { scope: runScope, blueprint: runBlueprint, file: runFile, fix: runFix, 'edit-plan': runEditPlan, 'edit-file': runEditFile };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const request = parseRequest(req.body);
  if (!request) return res.status(400).json({ error: 'Invalid request' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ reply: 'The Skill Builder is offline right now (no API key configured).' });
  }
  try {
    return res.status(200).json(await RUN[request.stage](request));
  } catch (error) {
    // The message only: never the request body, which holds the person's use case.
    console.error(JSON.stringify({ source: 'skill-builder', stage: request.stage, path: request.path || '', error: String(error?.message || error).slice(0, 300), status: error?.status }));
    return res.status(502).json({ reply: 'The Skill Builder hit an error. Give it another try in a moment.' });
  }
}
