import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Replies saved before Markdown rendering was added had their line breaks
// collapsed by the API word limiter. Restore the most common numbered-step
// pattern so those existing conversations become scannable too.
export function restoreLegacyListBreaks(value) {
  return String(value || '')
    .replace(/\s+\*\*(\d+)\.\s+([^*\n]+)\*\*/g, '\n\n$1. **$2**')
    .trim();
}

const components = {
  h1: ({ children }) => <h2 className="mb-2 mt-4 font-display text-[17px] font-bold leading-6 text-ac-dark first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 font-display text-[16px] font-bold leading-6 text-ac-dark first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-3 font-display text-[14px] font-bold leading-5 text-ac-dark first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mb-2.5 text-[13.5px] leading-6 text-ac-dark-secondary last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 text-[13.5px] leading-6 text-ac-dark-secondary last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-2 text-[13.5px] leading-6 text-ac-dark-secondary last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1 marker:font-medium marker:text-ac-coral-dark">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ac-dark">{children}</strong>,
  em: ({ children }) => <em className="italic text-ac-dark-secondary">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-ac-coral-dark underline decoration-ac-coral/40 underline-offset-2 hover:decoration-ac-coral">
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-ac-coral bg-ac-cream py-2 pl-3 pr-2 text-ac-dark-secondary">{children}</blockquote>,
  pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-lg bg-ac-cream p-3 font-mono text-[11.5px] leading-5 text-ac-dark">{children}</pre>,
  code: ({ children, className }) => className ? (
    <code className={`${className} font-mono`}>{children}</code>
  ) : (
    <code className="break-words rounded bg-ac-cream px-1.5 py-0.5 font-mono text-[0.88em] text-ac-coral-dark">{children}</code>
  ),
  table: ({ children }) => <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-ac-light-gray"><table className="w-full min-w-[420px] border-collapse text-left text-[12px]">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-ac-cream text-ac-dark">{children}</thead>,
  th: ({ children }) => <th className="border-b border-ac-light-gray px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-ac-light-gray px-3 py-2 align-top text-ac-dark-secondary last:border-b-0">{children}</td>,
  input: (props) => <input {...props} disabled className="mr-2 accent-ac-coral" />,
  del: ({ children }) => <del className="text-ac-med-gray">{children}</del>,
  hr: () => <hr className="my-4 border-ac-light-gray" />,
};

export function AssistantMessage({ content }) {
  return (
    <div className="min-w-0 max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{restoreLegacyListBreaks(content)}</ReactMarkdown>
    </div>
  );
}
