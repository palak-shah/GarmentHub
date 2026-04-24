import { useState, useRef, useEffect } from 'react';

interface ComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

export function Combobox({ label, value, onChange, options, placeholder, disabled }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const display = open ? query : selected?.label ?? '';

  useEffect(() => {
    if (!open) setQuery(selected?.label ?? '');
  }, [open, selected?.label]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-1" ref={wrapRef}>
      {label ? (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      ) : null}
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={display}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
        />
        {open && !disabled && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
            ) : (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(o.value);
                      setQuery(o.label);
                      setOpen(false);
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

interface StringComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
}

/** Free text with optional suggestion list (filters as you type). */
export function StringCombobox({ label, value, onChange, suggestions, placeholder }: StringComboboxProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** While non-null, user is editing: show blank / draft without losing committed `value` until blur or pick. */
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const valueWhenEditStartedRef = useRef('');
  const blurCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filterText = draft !== null ? draft : value;
  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(filterText.toLowerCase()))
    .slice(0, 40);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    return () => {
      if (blurCloseTimerRef.current) clearTimeout(blurCloseTimerRef.current);
    };
  }, []);

  const inputValue = draft !== null ? draft : value;

  return (
    <div className="space-y-1" ref={wrapRef}>
      {label ? (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      ) : null}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            if (draft !== null) {
              draftRef.current = v;
              setDraft(v);
            } else {
              onChange(v);
            }
            setOpen(true);
          }}
          onFocus={() => {
            if (blurCloseTimerRef.current) {
              clearTimeout(blurCloseTimerRef.current);
              blurCloseTimerRef.current = null;
            }
            valueWhenEditStartedRef.current = value;
            draftRef.current = '';
            setDraft('');
            setOpen(true);
          }}
          onBlur={() => {
            blurCloseTimerRef.current = setTimeout(() => {
              blurCloseTimerRef.current = null;
              const d = draftRef.current;
              draftRef.current = null;
              if (d !== null) {
                const trimmed = d.trim();
                if (trimmed === '') onChange(valueWhenEditStartedRef.current);
                else onChange(trimmed);
                setDraft(null);
              }
            }, 200);
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {filtered.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurCloseTimerRef.current) {
                      clearTimeout(blurCloseTimerRef.current);
                      blurCloseTimerRef.current = null;
                    }
                  }}
                  onClick={() => {
                    draftRef.current = null;
                    onChange(s);
                    setDraft(null);
                    setOpen(false);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
