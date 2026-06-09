import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const bodyParamValue = (node, name) =>
  node.parameters?.bodyParameters?.parameters?.find((param) => param.name === name)?.value;

function convertRawSlackHttpNode(node) {
  if (node.type !== 'n8n-nodes-base.httpRequest') return false;
  if (!String(node.parameters?.url || '').includes('https://slack.com/api/chat.postMessage')) return false;

  let channelExpr = '';
  let textExpr = '';

  if (String(node.parameters?.jsonBody || '').includes('slackPayload')) {
    channelExpr = '={{ JSON.parse($json.slackPayload).channel }}';
    textExpr = '={{ JSON.parse($json.slackPayload).text || JSON.parse($json.slackPayload).blocks?.[0]?.text?.text || "" }}';
  } else if (bodyParamValue(node, 'channel') && bodyParamValue(node, 'text')) {
    channelExpr = bodyParamValue(node, 'channel');
    textExpr = bodyParamValue(node, 'text');
  } else if (node.name === 'Send Run Summary') {
    channelExpr = "={{ $('Configuration').first().json.adminChannelId }}";
    textExpr = '={{ $json.summaryMessage }}';
  } else {
    return false;
  }

  node.type = 'n8n-nodes-base.slack';
  node.typeVersion = 2.3;
  node.parameters = {
    authentication: 'oAuth2',
    select: 'channel',
    channelId: {
      __rl: true,
      mode: 'id',
      value: channelExpr,
    },
    text: textExpr,
    otherOptions: {
      unfurl_links: false,
    },
  };
  node.notes = 'Converted from raw Slack HTTP delivery to the native Slack node.';
  node.notesInFlow = true;
  return true;
}

function workflowJsonPaths() {
  const workflowDirs = fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  const paths = workflowDirs.flatMap((workflowId) =>
    ['full.json', 'starter.json']
      .map((fileName) => path.join(repoRoot, workflowId, fileName))
      .filter((filePath) => fs.existsSync(filePath)),
  );

  const sharedDir = path.join(repoRoot, 'shared-n8n');
  if (fs.existsSync(sharedDir)) {
    for (const entry of fs.readdirSync(sharedDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        paths.push(path.join(sharedDir, entry.name));
      }
    }
  }

  return paths;
}

export function applyNativeNodeParity() {
  let updatedFiles = 0;
  let convertedSlackNodes = 0;
  let strippedCredentialBlocks = 0;

  for (const filePath of workflowJsonPaths()) {
    const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changed = false;

    for (const node of workflow.nodes || []) {
      if (convertRawSlackHttpNode(node)) {
        convertedSlackNodes += 1;
        changed = true;
      }

      if (node.credentials) {
        delete node.credentials;
        strippedCredentialBlocks += 1;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, `${JSON.stringify(workflow, null, 2)}\n`);
      updatedFiles += 1;
    }
  }

  return {
    updatedFiles,
    convertedSlackNodes,
    strippedCredentialBlocks,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(applyNativeNodeParity(), null, 2));
}
