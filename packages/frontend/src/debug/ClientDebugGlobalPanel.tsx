import { useEffect, useState } from 'react';

const clientDebug = import.meta.env.VITE_CLIENT_DEBUG === 'true';

const MAX = 12000;

function truncate(s: string, max = MAX) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n[truncated, ${s.length} chars]`;
}

/**
 * When `VITE_CLIENT_DEBUG=true`, listens for `error` and `unhandledrejection`
 * and shows details in a fixed on-page panel (in addition to the console).
 */
export function ClientDebugGlobalPanel() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!clientDebug) return;

    const onErr = (ev: ErrorEvent) => {
      const msg = ev.message || 'error';
      const where = ev.filename ? `${ev.filename}:${ev.lineno}:${ev.colno}` : '';
      const stack = ev.error && typeof ev.error === 'object' && 'stack' in ev.error ? String((ev.error as Error).stack) : '';
      setText(truncate([msg, where, stack].filter(Boolean).join('\n')));
    };

    const onRej = (ev: PromiseRejectionEvent) => {
      const r = ev.reason;
      let body = '';
      if (r instanceof Error) {
        body = `${r.message}\n\n${r.stack ?? ''}`;
      } else {
        try {
          body = typeof r === 'object' && r !== null ? JSON.stringify(r) : String(r);
        } catch {
          body = String(r);
        }
      }
      setText(truncate(`Unhandled rejection\n\n${body}`));
    };

    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);

  if (!clientDebug || !text) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-2 left-2 right-2 z-[100000] max-h-[42vh] overflow-auto rounded-lg border-2 border-red-500 bg-neutral-900 p-3 text-left text-[11px] text-neutral-100 shadow-xl"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-red-400">Client debug — global error / rejection</strong>
        <button
          type="button"
          className="shrink-0 rounded bg-neutral-700 px-2 py-1 text-xs text-white hover:bg-neutral-600"
          onClick={() => setText(null)}
        >
          Dismiss
        </button>
      </div>
      <pre className="m-0 whitespace-pre-wrap break-words font-mono">{text}</pre>
    </div>
  );
}
