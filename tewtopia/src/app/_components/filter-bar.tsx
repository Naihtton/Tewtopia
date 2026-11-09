'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export type FilterSelect = {
  name: string;
  label: string;
  // first option is "any"
  anyLabel: string;
  options: { value: string; label: string }[];
};

type FilterBarProps = {
  selects: FilterSelect[];
  // Optional numeric filter (e.g. max price), applied on Enter / blur rather than per keystroke.
  number?: { name: string; label: string; placeholder: string };
  // Current values, as they appear in the URL.
  values: Record<string, string>;
  resultCount: number;
  noun: [singular: string, plural: string];
};

// Query params that open a modal; dropped when filters change so the modal doesn't reappear.
const MODAL_PARAMS = ['tutor', 'request'];

const selectClass =
  'w-full rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink outline-none transition-colors hover:border-primary/50 focus:border-primary sm:w-auto';

export function FilterBar({ selects, number, values, resultCount, noun }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [numberDraft, setNumberDraft] = useState(number ? (values[number.name] ?? '') : '');
  const active = Object.values(values).some(Boolean);

  function apply(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of MODAL_PARAMS) params.delete(key);
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clearAll() {
    setNumberDraft('');
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {selects.map((select) => (
          <label key={select.name} className="w-full sm:w-auto">
            <span className="sr-only">{select.label}</span>
            <select
              value={values[select.name] ?? ''}
              onChange={(event) => apply({ [select.name]: event.target.value })}
              className={`${selectClass} ${values[select.name] ? 'border-primary bg-primary-soft text-primary-deep' : ''}`}
            >
              <option value="">{select.anyLabel}</option>
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {number && (
          <form
            className="w-full sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              apply({ [number.name]: numberDraft.trim() });
            }}
          >
            <label
              className={`flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold transition-colors focus-within:border-primary ${
                values[number.name] ? 'border-primary bg-primary-soft text-primary-deep' : 'border-line text-muted hover:border-primary/50'
              }`}
            >
              <span>{number.label}</span>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={numberDraft}
                onChange={(event) => setNumberDraft(event.target.value)}
                onBlur={() => {
                  if (numberDraft.trim() !== (values[number.name] ?? '')) apply({ [number.name]: numberDraft.trim() });
                }}
                placeholder={number.placeholder}
                className="w-20 min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted/70 sm:flex-none"
              />
              <span>THB/hr</span>
            </label>
          </form>
        )}

        {active && (
          <button
            type="button"
            onClick={clearAll}
            className="px-2 text-sm font-bold text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-sm font-semibold text-muted">
        {resultCount} {resultCount === 1 ? noun[0] : noun[1]}
        {active ? ' match' + (resultCount === 1 ? 'es' : '') : ''}
      </p>
    </div>
  );
}
