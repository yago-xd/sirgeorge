import { useMemo, useRef, useState } from "react";
import { searchElements } from "../data/elements";
import { cn } from "../utils/cn";

interface Props {
  onPick: (symbol: string) => void;
}

export default function ElementPicker({ onPick }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | null>(null);

  const results = useMemo(() => searchElements(q, 7), [q]);

  const pick = (symbol: string) => {
    onPick(symbol);
    setQ("");
    setOpen(false);
    setActive(0);
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-faint"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 140);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const target = open ? results[active] : results[0];
            if (target) pick(target.symbol);
            else setOpen(true);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Element — name, symbol or number (Sodium, Na, 11)"
        aria-label="Search elements by name, symbol or atomic number"
        className="w-full rounded-xl border border-lab-200 bg-lab-50/60 py-2.5 pr-3 pl-10 text-sm text-ink transition-colors outline-none placeholder:text-ink-faint focus:border-azure focus:bg-white focus:ring-4 focus:ring-azure/10"
      />
      {open && results.length > 0 && (
        <ul
          onMouseDown={(e) => e.preventDefault()}
          className="card absolute z-30 mt-2 max-h-64 w-full overflow-auto p-1"
          role="listbox"
        >
          {results.map((el, i) => (
            <li key={el.n}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  if (blurTimer.current) window.clearTimeout(blurTimer.current);
                  pick(el.symbol);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  i === active ? "bg-azure-soft text-azure-deep" : "text-ink hover:bg-lab-100",
                )}
              >
                <span className="flex items-baseline gap-2.5">
                  <span className="font-display text-base font-semibold">{el.symbol}</span>
                  <span className="text-ink-soft">{el.name}</span>
                </span>
                <span className="text-xs text-ink-faint tabular-nums">{el.n}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
