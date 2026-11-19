import { Check, Download } from 'lucide-react';
import { cn } from '../lib/cn';
import { recordAssistantEvent } from '../lib/assistant';
import { SKILL_LIBRARY, TEST_LEVELS } from '../data/skillLibrary';
import { ChatGptInstallSteps, PluginInstallSteps } from './PluginInstallSteps';

const PLATFORM_NAME = { claude: 'Claude', chatgpt: 'ChatGPT' };
const eyebrowClass = 'font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ac-med-gray';

const formatDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Studio's six test levels as a row of marks: the ones this build passed are filled.
function LevelMarks({ levels }) {
  const passed = new Set(levels);
  return (
    <ol className="flex flex-wrap gap-1" aria-label={`Passed levels ${levels.join(', ')} of 6`}>
      {TEST_LEVELS.map((item) => (
        <li
          key={item.level}
          title={`Level ${item.level}: ${item.title}${passed.has(item.level) ? ' (passed)' : ' (not run yet)'}`}
          className={cn(
            'grid h-6 min-w-6 place-items-center rounded-md px-1.5 font-mono text-[11px] font-bold',
            passed.has(item.level) ? 'bg-ac-success/15 text-ac-success' : 'bg-ac-cream text-ac-med-gray',
          )}
        >
          {passed.has(item.level) ? <Check size={12} aria-hidden="true" /> : item.level}
        </li>
      ))}
    </ol>
  );
}

function Build({ skill, build }) {
  const href = `${import.meta.env.BASE_URL}${build.file}`;
  const highest = Math.max(...build.levels);
  return (
    <div className="rounded-lg border border-ac-light-gray bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ac-dark">For {PLATFORM_NAME[build.platform]}</p>
          <p className="font-mono text-[12px] text-ac-med-gray">{build.name} · v{build.version} · verified {formatDate(build.verified)}</p>
        </div>
        <a
          href={href}
          download={build.downloadAs}
          onClick={() => recordAssistantEvent('plugin_builder_download', { library: skill.id, platform: build.platform, version: build.version })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ac-coral px-3.5 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-ac-coral-dark"
        >
          <Download size={15} /> Download {build.platform === 'chatgpt' ? 'skill.zip' : 'ZIP'}
        </a>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <LevelMarks levels={build.levels} />
        <span className="text-[12.5px] text-ac-dark-secondary">
          Passed level{build.levels.length === 1 ? '' : 's'} {build.levels.join(' and ')}: {TEST_LEVELS.filter((item) => build.levels.includes(item.level)).map((item) => item.title.toLowerCase()).join(', ')}.
          {highest < 3 && ' Levels 3 to 6 need your tenant.'}
        </span>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-[13px] font-medium text-ac-coral-dark">What was checked</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-5 text-ac-dark-secondary">
          {build.checks.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </details>
      <details className="mt-2">
        <summary className="cursor-pointer text-[13px] font-medium text-ac-coral-dark">How to install it</summary>
        <div className="mt-2">
          {build.platform === 'chatgpt'
            ? <ChatGptInstallSteps name={build.name} />
            : <PluginInstallSteps name={build.name} version={build.version} needsCode={skill.output === 'Publishes a page'} tryIt={`Start a new chat and ask: "${skill.question}"`} />}
        </div>
      </details>
    </div>
  );
}

/** Skills Backstory Studio built, checked and verified, with the test levels each has passed. */
export function SkillLibrary() {
  return (
    <div className="space-y-5">
      <div className="surface-card p-6">
        <h2 className="font-display text-[18px] font-bold text-ac-dark">Verified skill library</h2>
        <p className="mt-1 max-w-3xl text-[14px] leading-6 text-ac-dark-secondary">
          Skills Backstory Studio built with the Skill Builder, then checked and verified. Each shows which of Studio's six test levels it has passed and when.
          Levels 1 and 2 prove the skill and its scripts against what Backstory returns; levels 3 to 6 need your own tenant, so run those before you rely on one
          (each skill's README lists them, built from its own fields and tools).
        </p>
        <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ac-med-gray">
          {TEST_LEVELS.map((item) => <li key={item.level}>{item.level} {item.title}</li>)}
        </ol>
      </div>

      {SKILL_LIBRARY.map((skill) => (
        <article key={skill.id} className="surface-card p-6">
          <div className="flex flex-wrap gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ac-dark-secondary">
            {[skill.audience, skill.cadence, skill.output].filter(Boolean).map((tag) => <span key={tag} className="rounded-md bg-ac-cream px-2 py-0.5">{tag}</span>)}
          </div>
          <h3 className="mt-3 font-display text-[19px] font-bold text-ac-dark">{skill.title}</h3>
          <blockquote className="mt-2 border-l-2 border-ac-coral pl-3 text-[14px] italic leading-6 text-ac-dark">{skill.question}</blockquote>
          <p className="mt-2 text-[14px] leading-6 text-ac-dark-secondary">{skill.summary}</p>
          <p className={cn(eyebrowClass, 'mt-4 mb-1.5')}>Backstory tools</p>
          <div className="flex flex-wrap gap-1.5">
            {skill.tools.map((tool) => <code key={tool} className="rounded-md bg-ac-cream px-2 py-0.5 font-mono text-[11.5px] text-ac-dark-secondary">{tool}</code>)}
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {skill.builds.map((build) => <Build key={build.platform} skill={skill} build={build} />)}
          </div>
        </article>
      ))}
    </div>
  );
}
