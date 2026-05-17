import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const workflowDirs = fs
  .readdirSync(repoRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

let converted = 0;

function bodyParamValue(node, name) {
  return node.parameters?.bodyParameters?.parameters?.find((param) => param.name === name)?.value;
}

for (const workflowId of workflowDirs) {
  const fullPath = path.join(repoRoot, workflowId, 'full.json');
  if (!fs.existsSync(fullPath)) continue;

  const workflow = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  let changed = false;

  for (const node of workflow.nodes || []) {
    if (node.type !== 'n8n-nodes-base.httpRequest') continue;
    if (!String(node.parameters?.url || '').includes('https://slack.com/api/chat.postMessage')) continue;

    let channelExpr = '';
    let textExpr = '';

    if (String(node.parameters?.jsonBody || '').includes('slackPayload')) {
      channelExpr = '={{ JSON.parse($json.slackPayload).channel }}';
      textExpr = '={{ JSON.parse($json.slackPayload).text || JSON.parse($json.slackPayload).blocks?.[0]?.text?.text || "" }}';
    } else if (bodyParamValue(node, 'channel') && bodyParamValue(node, 'text')) {
      channelExpr = bodyParamValue(node, 'channel');
      textExpr = bodyParamValue(node, 'text');
    } else if (node.name === 'Send Run Summary') {
      channelExpr = '={{ $(\'Configuration\').first().json.adminChannelId }}';
      textExpr = '={{ $json.summaryMessage }}';
    } else {
      continue;
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
    changed = true;
    converted += 1;
  }

  if (changed) {
    fs.writeFileSync(fullPath, `${JSON.stringify(workflow, null, 2)}\n`);
  }
}

console.log(JSON.stringify({ converted }, null, 2));
