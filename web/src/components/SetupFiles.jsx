import { useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { SETUP_ACCEPT, SETUP_LIMITS, filesFromDrop, readSetupFiles } from '../lib/setupFiles';

function Busy({ children }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-[13px] text-ac-dark-secondary">
      <Loader2 size={15} className="animate-spin text-ac-coral" /> {children}
    </span>
  );
}

const formatSize = (chars) => (chars >= 1000 ? `${Math.round(chars / 1000)}k chars` : `${chars} chars`);

// Files and folders for "Your setup": read here as text, sent with the fit
// check and the design, never stored by the site.
export function SetupFiles({ platform, files, onChange }) {
  const [skipped, setSkipped] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const fileInput = useRef(null);
  const folderInput = useRef(null);
  async function add(list) {
    setReading(true);
    try {
      const result = await readSetupFiles(list, files);
      onChange([...files, ...result.files]);
      setSkipped(result.skipped);
    } finally {
      setReading(false);
    }
  }
  const total = files.reduce((sum, file) => sum + file.content.length, 0);
  const linkClass = 'font-medium text-ac-coral-dark underline-offset-2 hover:underline';
  return (
    <div
      className={cn('mt-2 rounded-lg border border-dashed p-3 transition-colors', dragging ? 'border-ac-coral bg-ac-coral/5' : 'border-ac-light-gray')}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setDragging(false);
        add(await filesFromDrop(event.dataTransfer));
      }}
    >
      <p className="text-[12.5px] leading-5 text-ac-dark-secondary">
        <Paperclip size={13} className="mr-1 inline text-ac-med-gray" aria-hidden="true" />
        Drop files or a folder here, or{' '}
        <button type="button" className={linkClass} onClick={() => fileInput.current?.click()}>add files</button>
        {' '}or{' '}
        <button type="button" className={linkClass} onClick={() => folderInput.current?.click()}>a folder</button>:
        {' '}your field inventory CSV, an existing skill, a report or notes (text files and ZIPs).
      </p>
      <input ref={fileInput} id={`setup-files-${platform}`} type="file" multiple accept={SETUP_ACCEPT} className="hidden" onChange={(event) => { add(event.target.files); event.target.value = ''; }} />
      <input ref={folderInput} id={`setup-folder-${platform}`} type="file" multiple webkitdirectory="" directory="" className="hidden" onChange={(event) => { add(event.target.files); event.target.value = ''; }} />
      {reading && <p className="mt-2"><Busy>Reading files…</Busy></p>}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((file) => (
            <li key={file.name} className="flex items-center gap-2 rounded-md bg-ac-cream px-2 py-1 text-[12.5px]">
              <FileText size={13} className="shrink-0 text-ac-med-gray" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-mono text-ac-dark" title={file.name}>{file.name}</span>
              <span className="shrink-0 text-ac-med-gray">{formatSize(file.size)}{file.truncated ? ', first part only' : ''}</span>
              <button type="button" aria-label={`Remove ${file.name}`} className="shrink-0 text-ac-med-gray hover:text-ac-coral-dark" onClick={() => onChange(files.filter((item) => item.name !== file.name))}>
                <X size={13} />
              </button>
            </li>
          ))}
          <li className="text-[11.5px] text-ac-med-gray">{files.length} of {SETUP_LIMITS.files} files · {formatSize(total)} of {formatSize(SETUP_LIMITS.total)}</li>
        </ul>
      )}
      {skipped.length > 0 && (
        <p className="mt-2 text-[12px] leading-5 text-ac-med-gray">
          Skipped {skipped.length}: {skipped.slice(0, 4).map((item) => `${item.name} (${item.reason})`).join('; ')}{skipped.length > 4 ? '…' : ''}
        </p>
      )}
    </div>
  );
}

