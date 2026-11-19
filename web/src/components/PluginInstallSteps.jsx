import { Link } from 'react-router-dom';
import { Tabs } from './ui/Tabs';

// How to add a packaged Claude plugin: upload in the Claude app (Customize >
// Plugins), which also syncs it to Claude Code, or load it for one session.
export function PluginInstallSteps({ name, version, needsCode, tryIt }) {
  const stepsClass = 'list-decimal space-y-1.5 pl-5 text-[13.5px] leading-6 text-ac-dark-secondary';
  return (
    <Tabs
      tabs={[
        {
          value: 'app',
          label: 'Claude app',
          content: (
            <ol className={stepsClass}>
              <li>Download the ZIP.</li>
              <li>In Claude, go to <strong>Customize &gt; Plugins</strong>, choose <strong>Add &gt; Upload plugin</strong>, and pick the ZIP.</li>
              <li>Connect Backstory under <strong>Customize &gt; Connectors</strong>. The plugin doesn't bundle it. <Link to="/mcp" className="font-medium text-ac-coral-dark">How to connect</Link></li>
              {needsCode && <li>Turn on code execution in Claude's settings, so it can build the page.</li>}
              <li>{tryIt}</li>
            </ol>
          ),
        },
        {
          value: 'code',
          label: 'Claude Code',
          content: (
            <div className="space-y-2 text-[13.5px] leading-6 text-ac-dark-secondary">
              <p>A plugin uploaded in the Claude app syncs to Claude Code as <code className="font-mono text-[12.5px]">{name}@synced</code> the next time you sign in.</p>
              <p>To try it for one session from the ZIP instead:</p>
              <pre className="overflow-x-auto rounded-lg bg-wf-bg p-3 font-mono text-[12px] text-wf-text"><code>{`unzip ${name}-${version}.zip\nclaude --plugin-dir ./${name}`}</code></pre>
            </div>
          ),
        },
      ]}
    />
  );
}

// How to add a ChatGPT skill from the Skills Builder: connect Backstory in
// ChatGPT, then upload the skill's ZIP under Skills.
export function ChatGptInstallSteps({ name }) {
  const stepsClass = 'list-decimal space-y-1.5 pl-5 text-[13.5px] leading-6 text-ac-dark-secondary';
  const code = 'font-mono text-[12.5px]';
  return (
    <ol className={stepsClass}>
      <li>Download the skill ZIP.</li>
      <li>Connect Backstory in ChatGPT as a custom MCP connector, <code className={code}>https://mcp.backstory.ai/mcp</code>, and sign in with your Backstory account. In a Business or Enterprise workspace, an admin may need to add it first. <Link to="/mcp" className="font-medium text-ac-coral-dark">How Backstory connects</Link></li>
      <li>In ChatGPT, open <strong>Skills</strong>, choose <strong>Create &gt; Upload from your computer</strong>, and pick the ZIP.</li>
      <li>Make sure code execution is on, so the skill can run its scripts.</li>
      <li>Start a new chat, type <code className={code}>${name}</code>, or try a prompt below.</li>
    </ol>
  );
}
