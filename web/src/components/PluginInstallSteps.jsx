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
