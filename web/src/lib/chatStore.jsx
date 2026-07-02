// web/src/lib/chatStore.jsx
// One shared Librarian conversation for the whole app. The floating widget
// and the AssistantHome page are two skins over this store, so expanding
// from widget to page (or navigating) never loses the thread. Persisted to
// localStorage via chatStorage (exception-safe).
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  sendChat,
  submitDraft,
  getPersona,
  appendUser,
  appendAssistant,
  toApiMessages,
  readFileToAttachment,
} from './assistant';
import { loadTurns, saveTurns, clearTurns, capTurns } from './chatStorage';

const ChatContext = createContext(null);
const storage = typeof window !== 'undefined' ? window.localStorage : null;
const API_MESSAGE_CAP = 20;

export function ChatProvider({ children }) {
  const [turns, setTurns] = useState(() => loadTurns(storage));
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [mode, setMode] = useState('chat'); // 'chat' | 'builder'
  const persona = useMemo(() => getPersona(), []);
  // Guards a "New chat" (or any reset) issued while a request is in flight:
  // a stale response checks the generation before mutating state.
  const genRef = useRef(0);
  // Monotonic id so a marketplace submission can update its own turn when it
  // resolves, even if later turns have since been appended.
  const captureIdRef = useRef(0);

  useEffect(() => {
    saveTurns(storage, turns);
  }, [turns]);

  // Update the capture status on the specific build turn that owns this id.
  // Keyed by captureId (not position), so it's correct across later appends
  // and a no-op after a reset removed the turn.
  function updateCapture(captureId, capture) {
    setTurns((t) => t.map((x) => (x.captureId === captureId ? { ...x, capture } : x)));
  }

  async function ask(text, { attachments: atts, pageContext } = {}) {
    const q = (text || '').trim();
    const sendAtts = atts !== undefined ? atts : attachments;
    if ((!q && (!sendAtts || !sendAtts.length)) || pending) return;
    const gen = genRef.current;
    const next = appendUser(turns, q || '📎 (see attached)');
    setTurns(capTurns(next));
    setInput('');
    setAttachments([]);
    setAttachError('');
    setPending(true);
    try {
      const result = await sendChat({
        surface: 'platform',
        messages: toApiMessages(next).slice(-API_MESSAGE_CAP),
        persona,
        attachments: sendAtts,
        pageContext,
      });
      if (genRef.current !== gen) return;
      // A build turn (draft or artifact) is auto-filed to the marketplace ONCE,
      // here — never on render/mount — so reloading a persisted thread can't
      // re-submit. The turn carries its own capture status.
      const draft = result.proposingDraft ? result.draft || null : null;
      const artifact = result.buildsArtifact ? result.artifact || null : null;
      const captureId = draft || artifact ? ++captureIdRef.current : null;
      setTurns((t) => {
        if (genRef.current !== gen) return t;
        let appended = capTurns(appendAssistant(t, result));
        if (captureId != null) {
          appended = appended.map((x, i) =>
            i === appended.length - 1 ? { ...x, captureId, capture: { status: 'pending' } } : x,
          );
        }
        return appended;
      });
      if (captureId != null) {
        submitDraft({ surface: 'platform', draft, artifact, persona })
          .then((r) =>
            updateCapture(
              captureId,
              r && r.ok
                ? { status: 'done', url: r.url || null }
                : { status: 'fallback', fallbackUrl: (r && r.fallbackUrl) || null },
            ),
          )
          .catch(() => updateCapture(captureId, { status: 'error' }));
      }
    } catch {
      if (genRef.current !== gen) return;
      setTurns((t) =>
        capTurns(
          appendAssistant(t, {
            reply: 'The assistant is unavailable right now — please try again in a moment.',
            recommendations: [],
            proposingDraft: false,
          }),
        ),
      );
    } finally {
      if (genRef.current === gen) setPending(false);
    }
  }

  async function addFiles(fileList) {
    setAttachError('');
    for (const f of Array.from(fileList || [])) {
      try {
        const att = await readFileToAttachment(f);
        setAttachments((prev) => (prev.length >= 4 ? prev : [...prev, att]));
      } catch (err) {
        setAttachError((err && err.message) || 'Could not attach that file');
      }
    }
  }

  function removeAttachment(i) {
    setAttachments((prev) => prev.filter((_, j) => j !== i));
  }

  function resetChat() {
    genRef.current += 1; // invalidate any in-flight response
    setTurns([]);
    setInput('');
    setAttachments([]);
    setAttachError('');
    setMode('chat');
    setPending(false);
    clearTurns(storage);
  }

  const value = {
    turns, pending, input, setInput, attachments, attachError,
    mode, setMode, ask, addFiles, removeAttachment, resetChat,
  };
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useAssistantChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useAssistantChat must be used inside <ChatProvider>');
  return ctx;
}
