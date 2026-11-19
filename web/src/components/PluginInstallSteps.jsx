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

// How to add a ChatGPT plugin built by the Plugin Builder. The Backstory MCP
// is its own plugin in the workspace (a custom MCP server an admin adds once);
// this plugin carries the skill that calls it.
export function ChatGptInstallSteps({ name }) {
  const stepsClass = 'list-decimal space-y-1.5 pl-5 text-[13.5px] leading-6 text-ac-dark-secondary';
  return (
    <Tabs
      tabs={[
        {
          value: 'admin',
          label: 'Workspace admin',
          content: (
            <ol className={stepsClass}>
              <li>Once per workspace, add Backstory: go to <strong>chatgpt.com/plugins</strong>, choose <strong>+ &gt; Add custom MCP server</strong>, enter <code className="font-mono text-[12.5px]">https://mcp.backstory.ai/mcp</code> with OAuth, then <strong>Create as a plugin</strong> and publish it.</li>
              <li>In the admin console, open <strong>Plugins &gt; Upload plugin</strong>, choose the plugin ZIP, and publish it to the people or roles who need it.</li>
            </ol>
          ),
        },
        {
          value: 'member',
          label: 'Each person',
          content: (
            <ol className={stepsClass}>
              <li>Install the Backstory plugin and sign in with your own Backstory account. <Link to="/mcp" className="font-medium text-ac-coral-dark">How Backstory connects</Link></li>
              <li>Install this plugin from the workspace's plugins, or, if your workspace lets you add skills, upload the skill ZIP under <strong>Skills &gt; Create &gt; Upload from your computer</strong>.</li>
              <li>Start a new chat, type <code className="font-mono text-[12.5px]">@{name}</code>, or try a prompt below.</li>
            </ol>
          ),
        },
      ]}
    />
  );
}
