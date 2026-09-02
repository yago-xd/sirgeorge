export default function Footer() {
  return (
    <footer className="border-t border-lab-200 bg-lab-50 py-9 text-center">
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft">
        Made with
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-warm" aria-label="love">
          <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.3 4.9 5.9 4.3c2-.3 4 .6 5.1 2.3h2c1.1-1.7 3.1-2.6 5.1-2.3 3.6.6 5.5 4.3 3.9 7.4C19.5 16.3 12 21 12 21z" />
        </svg>
        by 11D
      </p>
      <p className="mt-2 text-xs tracking-[0.14em] text-ink-faint uppercase">
        For Sir George Sarkar · Teachers’ Day 2026
      </p>
    </footer>
  );
}
