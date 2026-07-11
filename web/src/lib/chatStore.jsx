// web/src/lib/chatStore.jsx
// One shared Librarian conversation for the whole app. The floating widget
// and the AssistantHome page are two skins over this store, so expanding
// from widget to page (or navigating) never loses the thread. Persisted to
// localStorage via chatStorage (exception-safe).
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  sendChat,
  getPersona,
  appendUser,
  appendAssistant,
  toApiMessages,
  readFileToAttachment,
} from './assistant';
import { loadTurns, saveTurns, clearTurns } from './chatStorage';

const ChatContext = createContext(null);
const storage = typeof window !== 'undefined' ? window.localStorage : null;
const API_MESSAGE_CAP = 20;

export function ChatProvider({ children }) {
  const [turns, setTurns] = useState(() => loadTurns(storage));
  const [pending, setPending] = useState(false);
  const [pendingStage, setPendingStage] = useState('Thinking');
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [mode, setMode] = useState('chat'); // 'chat' | 'builder'
  const persona = useMemo(() => getPersona(), []);
  const controllerRef = useRef(null);
  const lastRequestRef = useRef(null);
  const silentAbortRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    saveTurns(storage, turns);
  }, [turns]);

  async function ask(text, { attachments: atts, pageContext, requestMode = 'chat', remember = true } = {}) {
    const q = (text || '').trim();
    const sendAtts = atts !== undefined ? atts : attachments;
    if ((!q && (!sendAtts || !sendAtts.length)) || pending || controllerRef.current) return;
    const next = appendUser(turns, q || '📎 (see attached)');
    setTurns(next);
    setInput('');
    setAttachments([]);
    setAttachError('');
    setPending(true);
    setPendingStage(requestMode === 'artifact' ? 'Generating' : requestMode === 'plan' ? 'Planning' : 'Thinking');
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    controllerRef.current = controller;
    if (remember) lastRequestRef.current = { text: q, attachments: sendAtts, pageContext, requestMode };
    try {
      const result = await sendChat({
        surface: 'platform',
        messages: toApiMessages(next).slice(-API_MESSAGE_CAP),
        persona,
        attachments: sendAtts,
        pageContext,
        requestMode,
        signal: controller.signal,
      });
      if (requestId !== requestIdRef.current) return;
      setTurns((t) => appendAssistant(t, result));
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err?.name === 'AbortError') {
        if (!silentAbortRef.current) {
          setTurns((t) => appendAssistant(t, { reply: 'Generation stopped.', recommendations: [], proposingDraft: false }));
        }
        return;
      }
      setTurns((t) =>
        appendAssistant(t, {
          reply: err?.message || 'The assistant is unavailable right now — please try again in a moment.',
          recommendations: [],
          proposingDraft: false,
          error: true,
        }),
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setPending(false);
        controllerRef.current = null;
        silentAbortRef.current = false;
      }
    }
  }

  function cancel() {
    controllerRef.current?.abort();
  }

  function retryLast() {
    const last = lastRequestRef.current;
    if (!last || pending) return;
    ask(last.text, { ...last, remember: false });
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
    silentAbortRef.current = true;
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    setTurns([]);
    setInput('');
    setAttachments([]);
    setAttachError('');
    setMode('chat');
    setPending(false);
    controllerRef.current = null;
    lastRequestRef.current = null;
    clearTurns(storage);
  }

  const value = {
    turns, pending, pendingStage, input, setInput, attachments, attachError,
    mode, setMode, ask, cancel, retryLast, addFiles, removeAttachment, resetChat,
  };
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useAssistantChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useAssistantChat must be used inside <ChatProvider>');
  return ctx;
}
