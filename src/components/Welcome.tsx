import Portrait from "./Portrait";

interface Props {
  onEnter: () => void;
}

function LabPattern() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full text-lab-200" >
      <defs>
        <pattern id="hexes" width="84" height="96" patternUnits="userSpaceOnUse">
          <path
            d="M42 6 74 25v38L42 82 10 63V25z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
          <circle cx="42" cy="6" r="2" fill="currentColor" opacity="0.45" />
          <circle cx="74" cy="63" r="2" fill="currentColor" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hexes)" />
    </svg>
  );
}

export default function Welcome({ onEnter }: Props) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-white px-6 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#f7fbfe_0%,#ffffff_62%)]" />
      <div className="absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]">
        <LabPattern />
      </div>

      <main className="relative flex flex-col items-center">
        <Portrait className="rise h-20 w-20 shadow-[0_16px_36px_-18px_rgba(20,48,76,0.45)] ring-4 ring-lab-100 sm:h-24 sm:w-24" />
        <h1 className="rise rise-1 font-display mt-7 text-4xl font-semibold text-ink sm:text-6xl">
          For Sir George Sarkar
        </h1>
        <p className="rise rise-2 mt-5 text-xs font-semibold tracking-[0.42em] text-ink-soft uppercase sm:text-sm">
          11D · 2026–2027
        </p>
        <p className="rise rise-3 font-display mt-6 text-lg text-ink-soft italic sm:text-xl">
          Made for you, Sir.
        </p>
        <button type="button" onClick={onEnter} className="rise rise-4 btn-primary mt-10">
          Enter the Lab
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </main>
    </div>
  );
}
