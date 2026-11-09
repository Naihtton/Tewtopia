export const ui = {
  shell: 'min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.45),rgba(255,255,255,0)),var(--background)] text-[var(--foreground)]',
  panel:
    'rounded-[1.5rem] border border-[rgba(23,23,23,0.08)] bg-white/82 shadow-[0_20px_40px_rgba(44,34,24,0.06)] backdrop-blur-[10px]',
  heroPanel:
    'rounded-[2rem] border border-white/60 bg-white/55 px-6 py-5 shadow-[0_18px_50px_rgba(44,34,24,0.08)] backdrop-blur-xl',
  title:
    'font-["Instrument_Serif",Georgia,"Times_New_Roman",serif] leading-[0.96] tracking-[-0.03em] text-[#171717]',
  chip:
    'inline-flex items-center gap-[0.35rem] rounded-full border border-[rgba(23,23,23,0.08)] bg-white/84 px-[0.85rem] py-[0.35rem] text-xs font-semibold text-[var(--ink-soft)]',
  chipAccent:
    'inline-flex items-center gap-[0.35rem] rounded-full bg-[var(--accent-soft)] px-[0.85rem] py-[0.35rem] text-xs font-semibold text-[#8d4024]',
  buttonPrimary:
    'rounded-full bg-[#171717] px-[1.15rem] py-[0.7rem] text-sm font-semibold text-[#fafaf8] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#2b2621] hover:shadow-[0_10px_24px_rgba(43,38,33,0.16)]',
  buttonSecondary:
    'rounded-full border border-[rgba(23,23,23,0.1)] bg-white/62 px-[1.15rem] py-[0.7rem] text-sm font-semibold text-[var(--ink-soft)] transition-[transform,background-color] duration-150 hover:-translate-y-px hover:bg-white/95',
  input:
    'w-full rounded-2xl border border-[rgba(23,23,23,0.08)] bg-white/72 px-4 py-3 text-sm text-[#171717] outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-stone-400 focus:border-[rgba(184,92,56,0.45)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(184,92,56,0.08)]',
  textarea:
    'min-h-32 w-full rounded-2xl border border-[rgba(23,23,23,0.08)] bg-white/72 px-4 py-3 text-sm text-[#171717] outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-stone-400 focus:border-[rgba(184,92,56,0.45)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(184,92,56,0.08)]',
  asideCard: 'rounded-[1.1rem] bg-stone-50 px-4 py-4',
  label: 'mb-2 block text-sm font-medium text-stone-700',
  helper: 'mt-2 text-xs text-stone-500',
} as const;
