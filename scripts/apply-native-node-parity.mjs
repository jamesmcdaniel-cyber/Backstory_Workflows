import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const credentialRefs = {
  anthropicApi: {
    id: 'RH89X48uFH0LBJfi',
    name: 'Anthropic account',
  },
  backstoryHeaders: {
    id: 'Q1kXqY8UNNjUmYLH',
    name: 'Multiple Headers Auth account',
  },
  mcpOAuth: {
    id: 'vJKb9od1Vcx7KoUQ',
    name: 'MCP account',
  },
  slackOAuth: {
    id: 'aA0zZkZuOO7odmEe',
    name: 'Slack account',
  },
  googleTasksOAuth: {
    id: '0yMHmaV2lN6RSUqt',
    name: 'Google Tasks account',
  },
  googleCalendarOAuth: {
    name: 'Google Calendar account',
  },
  smtp: {
    name: 'SMTP account',
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

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

function credentialsForNode(node) {
  switch (node.type) {
    case '@n8n/n8n-nodes-langchain.lmChatAnthropic':
      return { anthropicApi: clone(credentialRefs.anthropicApi) };
    case '@n8n/n8n-nodes-langchain.mcpClientTool':
      return { httpMultipleHeadersAuth: clone(credentialRefs.backstoryHeaders) };
    case '@n8n/n8n-nodes-langchain.mcpClient':
      if (/granola/i.test(`${node.name} ${JSON.stringify(node.parameters || {})}`)) {
        return { mcpOAuth2Api: clone(credentialRefs.mcpOAuth) };
      }
      return { httpMultipleHeadersAuth: clone(credentialRefs.backstoryHeaders) };
    case 'n8n-nodes-base.slack':
      return { slackOAuth2Api: clone(credentialRefs.slackOAuth) };
    case 'n8n-nodes-base.googleTasks':
      return { googleTasksOAuth2Api: clone(credentialRefs.googleTasksOAuth) };
    case 'n8n-nodes-base.googleCalendar':
      return { googleCalendarOAuth2Api: clone(credentialRefs.googleCalendarOAuth) };
    case 'n8n-nodes-base.emailSend':
      return { smtp: clone(credentialRefs.smtp) };
    default:
      return null;
  }
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
  let credentialBindings = 0;

  for (const filePath of workflowJsonPaths()) {
    const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changed = false;

    for (const node of workflow.nodes || []) {
      if (convertRawSlackHttpNode(node)) {
        convertedSlackNodes += 1;
        changed = true;
      }

      const credentials = credentialsForNode(node);
      if (credentials) {
        const nextCredentials = { ...(node.credentials || {}), ...credentials };
        if (JSON.stringify(node.credentials || {}) !== JSON.stringify(nextCredentials)) {
          node.credentials = nextCredentials;
          credentialBindings += 1;
          changed = true;
        }
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
    credentialBindings,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(applyNativeNodeParity(), null, 2));
}
