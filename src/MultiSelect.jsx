import React, { useState, useRef, useEffect } from 'react';

/**
 * Multi-select dropdown. An empty array means "all", matching the old
 * "ALL" sentinel so the filter predicates stay simple.
 */
export default function MultiSelect({ id, label, options, values, onChange, allLabel }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (val) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const summary = values.length === 0
    ? allLabel
    : values.length === 1
      ? values[0]
      : `${values.length} selected`;

  return (
    <div ref={wrapRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="w-full text-xs rounded-lg border-2 border-slate-300 hover:border-slate-400 bg-white text-slate-900 font-semibold py-2 px-3 pr-8 focus:border-blue-700 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-colors shadow-2xs text-left flex items-center justify-between gap-2"
      >
        <span className={`truncate ${values.length === 0 ? 'text-slate-900' : 'text-blue-900'}`}>
          {summary}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute z-40 mt-1 w-full min-w-[180px] max-h-64 overflow-y-auto bg-white border border-slate-300 rounded-lg shadow-lg py-1"
        >
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 border-b border-slate-100"
          >
            <span className="w-3.5 h-3.5 rounded border border-slate-400 flex items-center justify-center shrink-0">
              {values.length === 0 && <span className="w-2 h-2 rounded-sm bg-blue-900" />}
            </span>
            {allLabel}
          </button>

          {options.map((opt) => {
            const checked = values.includes(opt);
            return (
              <label
                key={opt}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-100 flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt)}
                  className="w-3.5 h-3.5 rounded border-slate-400 text-blue-900 focus:ring-blue-200 shrink-0"
                />
                <span className="truncate">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
