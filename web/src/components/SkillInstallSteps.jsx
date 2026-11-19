import { Link } from 'react-router-dom';
import { Tabs } from './ui/Tabs';

// How to add a packaged Claude Skill, used by the Signal pages.
export function SkillInstallSteps({ name, usesBackstory = true, tryIt }) {
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
              <li>In Claude, go to <strong>Customize &gt; Skills</strong>, add the ZIP, and turn the skill on. Code execution needs to be on as well.</li>
              {usesBackstory && <li>Make sure the Backstory connector is connected. <Link to="/mcp" className="font-medium text-ac-coral-dark">How to connect</Link></li>}
              <li>{tryIt}</li>
            </ol>
          ),
        },
        {
          value: 'code',
          label: 'Claude Code',
          content: (
            <div>
              <p className="text-[13.5px] leading-6 text-ac-dark-secondary">Unzip it into your skills folder from the folder you downloaded it to, then start a new session:</p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-wf-bg p-3 font-mono text-[12px] text-wf-text"><code>{`unzip ${name}.zip -d ~/.claude/skills/`}</code></pre>
            </div>
          ),
        },
      ]}
    />
  );
}
