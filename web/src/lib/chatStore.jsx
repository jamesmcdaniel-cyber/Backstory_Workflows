// web/src/lib/chatStore.jsx
// One shared Librarian conversation for the whole app. The floating widget
// and the AssistantHome page are two skins over this store, so expanding
// from widget to page (or navigating) never loses the thread. Persisted to
// localStorage via chatStorage (exception-safe).
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  sendChat,
  getPersona,
  getAudienceRole,
  saveAudienceRole,
  recordAssistantEvent,
  appendUser,
  appendAssistant,
  toApiMessages,
  readFileToAttachment,
  attachmentsForRequest,
} from './assistant';
import { loadTurns, saveTurns, clearTurns } from './chatStorage';
import { clearBuildAttachments, loadBuildAttachments, saveBuildAttachments } from './buildAttachmentStorage';
import { MAX_ATTACHMENT_COUNT, validateAttachments } from './attachmentValidation';

const ChatContext = createContext(null);
const storage = typeof window !== 'undefined' ? window.localStorage : null;
const API_MESSAGE_CAP = 20;

export function ChatProvider({ children }) {
  const [turns, setTurns] = useState(() => loadTurns(storage));
  const [pending, setPending] = useState(false);
  const [pendingStage, setPendingStage] = useState('Thinking');
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [buildAttachments, setBuildAttachments] = useState([]);
  const [buildAttachmentsReady, setBuildAttachmentsReady] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [mode, setMode] = useState('chat'); // 'chat' | 'builder'
  // Whether the floating Ask AI widget is expanded. Lives here (not in the
  // widget) so it survives route changes — e.g. clicking a recommendation on
  // the home page opens it on the destination detail page, where the widget
  // mounts fresh.
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [audienceRole, setAudienceRoleState] = useState(() => getAudienceRole());
  const persona = useMemo(() => getPersona(), []);
  const controllerRef = useRef(null);
  const lastRequestRef = useRef(null);
  const silentAbortRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let active = true;
    loadBuildAttachments().then((stored) => {
      if (active) {
        setBuildAttachments(stored);
        setBuildAttachmentsReady(true);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    saveTurns(storage, turns);
  }, [turns]);

  function setAudienceRole(value) {
    if (!['sales', 'csm', 'marketing', 'it'].includes(value)) return;
    setAudienceRoleState(value);
    saveAudienceRole(value);
    recordAssistantEvent('audience_role_changed', { audienceRole: value });
  }

  async function ask(text, { attachments: atts, pageContext, requestMode = 'chat', remember = true } = {}) {
    const q = (text || '').trim();
    const sendAtts = attachmentsForRequest({
      requestMode,
      explicitAttachments: atts,
      composerAttachments: attachments,
      buildAttachments,
    });
    if ((!q && (!sendAtts || !sendAtts.length)) || pending || controllerRef.current) return;
    const next = appendUser(turns, q || '📎 (see attached)');
    setTurns(next);
    setInput('');
    setAttachments([]);
    setAttachError('');
    setPending(true);
    setPendingStage(requestMode === 'artifact' ? 'Generating' : requestMode === 'plan' ? 'Planning' : 'Thinking');
    if (requestMode === 'plan') {
      setBuildAttachments(sendAtts || []);
      saveBuildAttachments(sendAtts || []);
    }
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    const startedAt = Date.now();
    controllerRef.current = controller;
    if (remember) lastRequestRef.current = { text: q, attachments: sendAtts, pageContext, requestMode };
    recordAssistantEvent('assistant_request', {
      requestMode,
      audienceRole,
      attachmentCount: sendAtts?.length || 0,
      historyTurns: Math.min(next.length, API_MESSAGE_CAP),
    });
    try {
      const result = await sendChat({
        surface: 'platform',
        messages: toApiMessages(next).slice(-API_MESSAGE_CAP),
        persona,
        attachments: sendAtts,
        pageContext,
        requestMode,
        audienceRole,
        signal: controller.signal,
      });
      if (requestId !== requestIdRef.current) return;
      const resultWithExamples = result.proposingDraft && result.draft
        ? {
            ...result,
            draft: {
              ...result.draft,
              formatExamples: (sendAtts || []).map(({ name, mediaType, kind, size }) => ({ name, mediaType, kind, size })),
            },
          }
        : result;
      setTurns((t) => appendAssistant(t, resultWithExamples));
      recordAssistantEvent('assistant_response', {
        requestMode,
        audienceRole,
        intent: result.intent || 'unknown',
        recommendationCount: result.recommendations?.length || 0,
        hasDraft: !!result.proposingDraft,
        hasArtifact: !!result.buildsArtifact,
        latencyMs: Date.now() - startedAt,
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err?.name === 'AbortError') {
        if (!silentAbortRef.current) {
          setTurns((t) => appendAssistant(t, { reply: 'Generation stopped.', recommendations: [], proposingDraft: false }));
          recordAssistantEvent('assistant_cancel', { requestMode, latencyMs: Date.now() - startedAt });
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
      recordAssistantEvent('assistant_error', { requestMode, latencyMs: Date.now() - startedAt });
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
    const available = Math.max(0, MAX_ATTACHMENT_COUNT - attachments.length);
    const next = [];
    for (const f of Array.from(fileList || []).slice(0, available)) {
      try {
        next.push(await readFileToAttachment(f));
      } catch (err) {
        setAttachError((err && err.message) || 'Could not attach that file');
      }
    }
    const validation = validateAttachments([...attachments, ...next]);
    if (!validation.valid) setAttachError(validation.errors.join(' '));
    else setAttachments(validation.attachments);
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
    setBuildAttachments([]);
    setAttachError('');
    setMode('chat');
    setPending(false);
    controllerRef.current = null;
    lastRequestRef.current = null;
    clearTurns(storage);
    clearBuildAttachments();
    recordAssistantEvent('chat_reset', { previousTurns: turns.length });
  }

  const value = {
    turns, pending, pendingStage, input, setInput, attachments, attachError, buildAttachments, buildAttachmentsReady,
    mode, setMode, audienceRole, setAudienceRole, ask, cancel, retryLast, addFiles, removeAttachment, resetChat,
    assistantOpen, setAssistantOpen, openAssistant: () => setAssistantOpen(true),
  };
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useAssistantChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useAssistantChat must be used inside <ChatProvider>');
  return ctx;
}
