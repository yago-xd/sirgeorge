import { useMemo, useRef, useState } from "react";
import Portrait from "./Portrait";
import ElementPicker from "./ElementPicker";
import EquationView from "./EquationView";
import Footer from "./Footer";
import {
  balance,
  chargeSums,
  parseText,
  sideCounts,
  speciesRanges,
  validate,
  type Parsed,
  type Tok,
} from "../lib/chem";
import { cn } from "../utils/cn";

const SUBSCRIPTS = ["₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
const CHARGES: { z: number; label: string }[] = [
  { z: 1, label: "+1" },
  { z: 2, label: "+2" },
  { z: 3, label: "+3" },
  { z: 4, label: "+4" },
  { z: -1, label: "−1" },
  { z: -2, label: "−2" },
  { z: -3, label: "−3" },
  { z: -4, label: "−4" },
  { z: 0, label: "Neutral" },
];

const ScaleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
    <path d="M12 3v18" />
    <path d="M8 21h8" />
    <path d="M4 7h16" />
    <path d="m6 7-3 6a3.2 3.2 0 0 0 6 0z" />
    <path d="m18 7-3 6a3.2 3.2 0 0 0 6 0z" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
);
const FlaskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
    <path d="M10 3v6L4.6 18a2 2 0 0 0 1.8 3h11.2a2 2 0 0 0 1.8-3L14 9V3" />
    <path d="M8.5 3h7" />
    <path d="M7 15h10" />
  </svg>
);
const BackspaceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M20 5H9l-6 7 6 7h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
    <path d="m12 9 6 6" />
    <path d="m18 9-6 6" />
  </svg>
);

export default function Lab() {
  const [tokens, setTokens] = useState<Tok[]>([]);
  const [caret, setCaret] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ coeffs: number[]; parsed: Parsed } | null>(null);
  const [showType, setShowType] = useState(false);
  const [typeText, setTypeText] = useState("");
  const resultRef = useRef<HTMLDivElement | null>(null);

  const edit = (next: Tok[], c: number) => {
    setTokens(next);
    setCaret(c);
    setError(null);
    setResult(null);
  };
  const insert = (t: Tok) => edit([...tokens.slice(0, caret), t, ...tokens.slice(caret)], caret + 1);
  const backspace = () => {
    if (caret > 0) edit([...tokens.slice(0, caret - 1), ...tokens.slice(caret)], caret - 1);
  };

  const speciesIndexAt = (pos: number) => {
    const ranges = speciesRanges(tokens).filter((r) => r.start < r.end);
    let idx = ranges.findIndex((r) => pos >= r.start && pos <= r.end);
    if (idx < 0) idx = ranges.findIndex((r) => pos - 1 >= r.start && pos - 1 < r.end);
    return idx < 0 ? null : ranges[idx];
  };

  const currentCharge = useMemo(() => {
    const r = speciesIndexAt(caret);
    if (!r) return null;
    const ch = tokens.slice(r.start, r.end).find((t) => t.k === "ch");
    return ch && ch.k === "ch" ? ch.z : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, caret]);

  const applyCharge = (z: number) => {
    const r = speciesIndexAt(caret);
    if (!r) {
      setError("Sir, place an element in the equation first — then choose its charge.");
      return;
    }
    const slice: Tok[] = tokens.slice(r.start, r.end).filter((t) => t.k !== "ch");
    if (z !== 0) slice.push({ k: "ch", z });
    const next = [...tokens.slice(0, r.start), ...slice, ...tokens.slice(r.end)];
    edit(next, Math.min(caret, r.start + slice.length));
  };

  const doBalance = () => {
    const v = validate(tokens);
    if (!v.ok) {
      setResult(null);
      setError(v.msg);
      return;
    }
    const b = balance(v.parsed);
    if (b.status !== "ok") {
      setResult(null);
      setError(
        b.charged
          ? "Sir, the charges don’t balance on both sides — please check the superscripts."
          : "Sir, this equation can’t be balanced as written — please check the formulas once more.",
      );
      return;
    }
    setError(null);
    setResult({ coeffs: b.coeffs, parsed: v.parsed });
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  };

  const clear = () => {
    setTokens([]);
    setCaret(0);
    setError(null);
    setResult(null);
    setTypeText("");
  };

  const loadTyped = () => {
    const t = parseText(typeText);
    if (!t || t.length === 0) {
      setError("Sir, please check this chemical formula — the typed line couldn’t be read.");
      return;
    }
    edit(t, t.length);
  };

  const counts = result ? sideCounts(result.parsed, result.coeffs) : null;
  const charges = result ? chargeSums(result.parsed, result.coeffs) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6">
        <header className="flex items-center justify-between py-6 sm:py-8">
          <span className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-azure-soft text-azure">
              <FlaskIcon />
            </span>
            <span className="font-display text-base font-semibold text-ink sm:text-lg">A gift from Class 11D</span>
          </span>
          <span className="rounded-full border border-lab-200 bg-lab-50 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-ink-soft uppercase sm:text-[11px]">
            11D · 2026–2027
          </span>
        </header>

        <div className="rise pb-8 text-center sm:pb-10">
          <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">Equation Balance</h1>
          <p className="mt-3 text-ink-soft sm:text-lg">Sir, enter your chemical equation below.</p>
        </div>

        <section className="card rise rise-1 p-4 sm:p-6">
          {/* ------------------------------ editor ------------------------------ */}
          <div
            tabIndex={0}
            role="textbox"
            aria-label="Chemical equation editor"
            onClick={() => setCaret(tokens.length)}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                e.preventDefault();
                backspace();
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                setCaret((c) => Math.max(0, c - 1));
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setCaret((c) => Math.min(tokens.length, c + 1));
              }
            }}
            className="flex min-h-[116px] cursor-text flex-wrap items-center justify-center rounded-xl border border-lab-200 bg-lab-50/70 px-3 py-6 font-display text-2xl text-ink transition-colors outline-none focus:border-azure focus:ring-4 focus:ring-azure/10 sm:text-3xl"
          >
            {tokens.length === 0 ? (
              <span className="px-4 text-center font-sans text-sm text-ink-faint sm:text-base">
                Sir, begin with an element — or open “prefer typing?” below.
              </span>
            ) : (
              <EquationView tokens={tokens} caret={caret} onCaret={setCaret} />
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-faint">
            Tap anywhere in the equation to place the cursor · Backspace deletes
          </p>

          {error && (
            <div
              role="alert"
              className="pop-in mt-4 flex items-start gap-2.5 rounded-xl border border-warm/25 bg-warm-soft px-4 py-3 text-sm leading-relaxed text-warm"
            >
              <InfoIcon />
              <span>{error}</span>
            </div>
          )}

          {/* ----------------------------- toolbars ----------------------------- */}
          <div className="mt-6 grid gap-6">
            <div>
              <span className="group-label">Element</span>
              <ElementPicker onPick={(s) => insert({ k: "el", s })} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <span className="group-label">Subscript</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUBSCRIPTS.map((ch, i) => (
                    <button
                      key={ch}
                      type="button"
                      title={`Subscript ${i + 1}`}
                      className="tool-btn"
                      onClick={() => insert({ k: "sub", n: i + 1 })}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="group-label">Structure</span>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" title="Open parenthesis" className="tool-btn" onClick={() => insert({ k: "lp" })}>
                    (
                  </button>
                  <button type="button" title="Close parenthesis" className="tool-btn" onClick={() => insert({ k: "rp" })}>
                    )
                  </button>
                  <button type="button" title="Hydrate / crystalline dot" className="tool-btn" onClick={() => insert({ k: "dot" })}>
                    ·
                  </button>
                  <button type="button" title="Add another compound" className="tool-btn" onClick={() => insert({ k: "plus" })}>
                    +
                  </button>
                  <button type="button" title="Reactants become products" className="tool-btn" onClick={() => insert({ k: "arrow" })}>
                    →
                  </button>
                  <button type="button" title="Delete before cursor" className="tool-btn" onClick={backspace}>
                    <BackspaceIcon />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <span className="group-label">Charge</span>
              <div className="flex flex-wrap gap-1.5">
                {CHARGES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    title={c.z === 0 ? "Remove any charge" : `Apply charge ${c.label}`}
                    className={cn("tool-btn", c.z !== 0 && currentCharge === c.z && "tool-btn-on")}
                    onClick={() => applyCharge(c.z)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-lab-100 pt-5">
              <button type="button" className="btn-primary" onClick={doBalance}>
                <ScaleIcon />
                Balance Equation
              </button>
              <button type="button" className="btn-ghost" onClick={clear}>
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowType((v) => !v)}
                className="ml-auto text-sm font-medium text-ink-soft underline decoration-lab-300 underline-offset-4 transition-colors hover:text-azure"
              >
                {showType ? "hide typing" : "prefer typing?"}
              </button>
            </div>

            {showType && (
              <div className="pop-in rounded-xl border border-lab-200 bg-lab-50/60 p-4">
                <textarea
                  value={typeText}
                  onChange={(e) => setTypeText(e.target.value)}
                  rows={2}
                  placeholder="Fe + O2 -> Fe2O3   ·   SO4^2-   ·   CuSO4.5H2O"
                  aria-label="Type an equation as plain text"
                  className="w-full resize-y rounded-lg border border-lab-200 bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-azure focus:ring-4 focus:ring-azure/10"
                />
                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={loadTyped}>
                    Load into editor
                  </button>
                  <p className="text-xs text-ink-faint">
                    Digits become subscripts · ^ sets a charge · . is the hydrate dot · -&gt; or = is the arrow.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------- result ------------------------------- */}
        {result && counts && charges && (
          <section ref={resultRef} className="card pop-in mt-6 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-ink">Balanced Equation</h2>
            <div className="mt-5 overflow-x-auto rounded-xl border border-lab-200 bg-lab-50 px-4 py-9 font-display text-2xl text-ink sm:text-[2.1rem]">
              <EquationView tokens={tokens} coeffs={result.coeffs} />
            </div>
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-moss">
              <CheckIcon />
              Balanced successfully
            </p>

            <table className="mx-auto mt-6 w-full max-w-xs border-collapse text-sm">
              <thead>
                <tr className="text-[11px] tracking-[0.14em] text-ink-faint uppercase">
                  <th className="pb-2 text-left font-semibold">Element</th>
                  <th className="pb-2 text-right font-semibold">Left</th>
                  <th className="pb-2 text-right font-semibold">Right</th>
                </tr>
              </thead>
              <tbody>
                {result.parsed.elements.map((el) => (
                  <tr key={el} className="border-t border-lab-100">
                    <td className="font-display py-1.5 font-semibold text-ink">{el}</td>
                    <td className="py-1.5 text-right text-ink-soft tabular-nums">{counts.left[el] || 0}</td>
                    <td className="py-1.5 text-right text-ink-soft tabular-nums">{counts.right[el] || 0}</td>
                  </tr>
                ))}
                {result.parsed.hasCharge && (
                  <tr className="border-t border-lab-100">
                    <td className="font-display py-1.5 font-semibold text-ink">Charge</td>
                    <td className="py-1.5 text-right text-ink-soft tabular-nums">
                      {charges.left > 0 ? `+${charges.left}` : charges.left}
                    </td>
                    <td className="py-1.5 text-right text-ink-soft tabular-nums">
                      {charges.right > 0 ? `+${charges.right}` : charges.right}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="mt-7 text-center">
              <button type="button" className="btn-ghost text-sm" onClick={clear}>
                Sir, try another one.
              </button>
            </div>
          </section>
        )}

        {/* ----------------------------- dedication ----------------------------- */}
        <section className="mt-10 flex flex-col items-center gap-6 rounded-2xl border border-lab-200 bg-lab-100/70 px-6 py-9 text-center sm:mt-14 sm:flex-row sm:text-left">
          <Portrait className="h-24 w-24 shrink-0 shadow-[0_16px_36px_-18px_rgba(20,48,76,0.5)] ring-4 ring-white" />
          <div>
            <p className="font-display text-2xl font-semibold text-ink">Sir George Sarkar</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-[15px]">
              Thank you for everything, Sir. This little
              laboratory is ours to you.
            </p>
            <p className="mt-3 text-[11px] font-semibold tracking-[0.18em] text-ink-faint uppercase">
              With gratitude · Class 11D · Teachers’ Day 2026
            </p>
          </div>
        </section>

        <div className="h-12" />
      </div>
      <Footer />
    </div>
  );
}
