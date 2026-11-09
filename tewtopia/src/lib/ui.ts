export const ui = {
  shell: 'min-h-screen bg-cream text-ink',
  panel: 'rounded-[1.75rem] border border-line bg-white shadow-[0_12px_32px_rgba(46,36,51,0.05)]',
  heroPanel: 'rounded-[2rem] border border-line bg-white px-6 py-5 shadow-[0_12px_32px_rgba(46,36,51,0.05)]',
  title: 'font-extrabold leading-[1.1] tracking-[-0.01em] text-ink',
  chip: 'inline-flex items-center gap-[0.35rem] rounded-full border border-line bg-white px-[0.85rem] py-[0.35rem] text-xs font-bold text-ink-soft',
  chipAccent:
    'inline-flex items-center gap-[0.35rem] rounded-full bg-primary-soft px-[0.85rem] py-[0.35rem] text-xs font-bold text-primary-deep',
  // The one action on a screen that should stand out.
  buttonPrimary:
    'inline-flex items-center justify-center rounded-full bg-cta px-5 py-[0.7rem] text-sm font-bold text-white shadow-[0_8px_20px_rgba(193,112,212,0.28)] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-px hover:bg-cta-deep disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none',
  buttonSecondary:
    'inline-flex items-center justify-center rounded-full border-[1.5px] border-primary bg-white px-5 py-[0.65rem] text-sm font-bold text-primary-deep transition-[transform,background-color] duration-150 hover:-translate-y-px hover:bg-primary-soft',
  input:
    'w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(153,117,161,0.15)]',
  textarea:
    'min-h-32 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(153,117,161,0.15)]',
  asideCard: 'rounded-[1.25rem] bg-cream px-4 py-4',
  label: 'mb-2 block text-sm font-bold text-ink-soft',
  helper: 'mt-2 text-xs text-muted',
} as const;
