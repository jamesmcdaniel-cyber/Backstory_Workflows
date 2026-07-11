const PLACEHOLDER = /(?:TODO|YOUR_[A-Z_]+|<[^>]+>|\.\.\.)/;

export function validateArtifact(artifact) {
  const errors = [];
  const warnings = [];
  if (!artifact?.content) return { valid: false, errors: ['The artifact is empty.'], warnings };
  if (!artifact.filename) errors.push('A filename is required.');
  if (PLACEHOLDER.test(artifact.content)) warnings.push('Configuration placeholders still need to be replaced.');

  if ((artifact.platform || '').toLowerCase() === 'n8n' || artifact.language === 'json') {
    let parsed;
    try {
      parsed = JSON.parse(artifact.content);
    } catch {
      errors.push('The generated JSON is not valid.');
      return { valid: false, errors, warnings };
    }
    if ((artifact.platform || '').toLowerCase() !== 'n8n') {
      warnings.push('JSON syntax is valid; verify platform-specific import compatibility before deployment.');
      return { valid: true, errors, warnings: [...new Set(warnings)] };
    }
    if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) errors.push('The workflow has no nodes.');
    if (!parsed.connections || typeof parsed.connections !== 'object') errors.push('The workflow has no connection map.');
    const names = new Set();
    for (const node of parsed.nodes || []) {
      if (!node.name || !node.type || !Array.isArray(node.position)) errors.push('Every node needs a name, type, and position.');
      if (names.has(node.name)) errors.push(`Duplicate node name: ${node.name}`);
      names.add(node.name);
    }
    for (const [source, groups] of Object.entries(parsed.connections || {})) {
      if (!names.has(source)) errors.push(`Connection source does not exist: ${source}`);
      const targets = JSON.stringify(groups).match(/"node":"([^"]+)"/g) || [];
      for (const target of targets) {
        const name = target.slice(8, -1);
        if (!names.has(name)) errors.push(`Connection target does not exist: ${name}`);
      }
    }
    if (parsed.active === true) warnings.push('The workflow is active; review credentials and destinations before import.');
  } else if (artifact.language === 'markdown' && artifact.content.length < 300) {
    warnings.push('The instructions are unusually short; review them before deployment.');
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
