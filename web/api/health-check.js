import { validateArtifact } from '../src/lib/artifactValidation.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const artifact = req.body?.artifact;
  if (!artifact || typeof artifact.content !== 'string' || artifact.content.length > 750_000) {
    return res.status(400).json({ error: 'Invalid artifact' });
  }
  return res.status(200).json(validateArtifact(artifact));
}
