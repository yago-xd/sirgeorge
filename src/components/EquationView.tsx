import type { ReactNode } from "react";
import { chargeLabel, isSep, type Tok } from "../lib/chem";
import { cn } from "../utils/cn";

interface Props {
  tokens: Tok[];
  coeffs?: number[];
  caret?: number | null;
  onCaret?: (i: number) => void;
  className?: string;
}

function renderTok(t: Tok, key: string | number): ReactNode {
  switch (t.k) {
    case "el":
      return (
        <span key={key} className="px-px">
          {t.s}
        </span>
      );
    case "sub":
      return (
        <sub key={key} className="text-[0.62em] font-medium">
          {t.n}
        </sub>
      );
    case "ch":
      return (
        <sup key={key} className="text-[0.58em] font-semibold text-azure">
          {chargeLabel(t.z)}
        </sup>
      );
    case "lp":
      return (
        <span key={key} className="text-ink/80">
          (
        </span>
      );
    case "rp":
      return (
        <span key={key} className="text-ink/80">
          )
        </span>
      );
    case "dot":
      return (
        <span key={key} className="mx-1.5 inline-block -translate-y-[0.14em] scale-[1.35] leading-none text-ink/80">
          ·
        </span>
      );
    case "plus":
      return (
        <span key={key} className="mx-2.5 text-ink-soft sm:mx-3.5">
          +
        </span>
      );
    case "arrow":
      return (
        <span key={key} className="mx-2.5 text-azure sm:mx-3.5">
          →
        </span>
      );
  }
}

export default function EquationView({ tokens, coeffs, caret, onCaret, className }: Props) {
  let speciesIdx = -1;
  const nodes: ReactNode[] = [];

  const slot = (i: number) =>
    onCaret ? (
      <button
        key={`caret-${i}`}
        type="button"
        aria-label="Set cursor here"
        onClick={(e) => {
          e.stopPropagation();
          onCaret(i);
        }}
        className="relative h-10 w-3 shrink-0 cursor-text outline-none sm:h-11"
      >
        {caret === i && (
          <span className="caret-bar absolute top-1/2 left-1/2 h-[1.1em] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-azure" />
        )}
      </button>
    ) : null;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i === 0 || isSep(tokens[i - 1])) {
      speciesIdx++;
      const c = coeffs ? coeffs[speciesIdx] : undefined;
      if (c && c > 1)
        nodes.push(
          <span key={`coeff-${i}`} className="mr-0.5 text-azure-deep">
            {c}
          </span>,
        );
    }
    nodes.push(slot(i));
    nodes.push(
      <span
        key={`wrap-${i}`}
        onClick={(e) => {
          e.stopPropagation();
          onCaret?.(i + 1);
        }}
        className="cursor-text"
      >
        {renderTok(t, `tok-${i}`)}
      </span>,
    );
  }
  nodes.push(slot(tokens.length));

  return (
    <div
      className={cn("flex flex-wrap items-center justify-center", className)}
      onClick={(e) => {
        e.stopPropagation();
        onCaret?.(tokens.length);
      }}
    >
      {nodes}
    </div>
  );
}
