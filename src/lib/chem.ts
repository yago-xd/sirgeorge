import { elementBySymbol } from "../data/elements";

/* ------------------------------------------------------------------ */
/*  Token model                                                        */
/* ------------------------------------------------------------------ */

export type Tok =
  | { k: "el"; s: string }
  | { k: "sub"; n: number }
  | { k: "lp" }
  | { k: "rp" }
  | { k: "dot" }
  | { k: "plus" }
  | { k: "arrow" }
  | { k: "ch"; z: number };

export interface Species {
  toks: Tok[];
  start: number;
  end: number;
  side: 0 | 1;
  counts: Record<string, number>;
  charge: number;
}

export interface Parsed {
  species: Species[];
  elements: string[];
  hasCharge: boolean;
}

export type Validation =
  | { ok: true; parsed: Parsed }
  | { ok: false; msg: string; empty?: boolean };

export const isSep = (t: Tok) => t.k === "plus" || t.k === "arrow";

export function speciesRanges(tokens: Tok[]): { start: number; end: number; side: 0 | 1 }[] {
  const out: { start: number; end: number; side: 0 | 1 }[] = [];
  let start = 0;
  let side: 0 | 1 = 0;
  for (let i = 0; i <= tokens.length; i++) {
    const t = tokens[i];
    if (i === tokens.length || isSep(t)) {
      out.push({ start, end: i, side });
      if (t && t.k === "arrow") side = 1;
      start = i + 1;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Parsing one species into element counts                            */
/* ------------------------------------------------------------------ */

type ParseErr = string;

function parseSegment(body: Tok[]): { counts: Record<string, number> } | { err: ParseErr } {
  const stack: Map<string, number>[] = [new Map()];
  let i = 0;
  while (i < body.length) {
    const t = body[i];
    const top = stack[stack.length - 1];
    if (t.k === "el") {
      let n = 1;
      if (body[i + 1] && body[i + 1].k === "sub") {
        n = (body[i + 1] as { n: number }).n;
        i++;
      }
      top.set(t.s, (top.get(t.s) || 0) + n);
    } else if (t.k === "lp") {
      stack.push(new Map());
    } else if (t.k === "rp") {
      if (stack.length === 1) return { err: "Sir, a parenthesis closes without opening — please check this formula." };
      const inner = stack.pop()!;
      let n = 1;
      if (body[i + 1] && body[i + 1].k === "sub") {
        n = (body[i + 1] as { n: number }).n;
        i++;
      }
      const top2 = stack[stack.length - 1];
      for (const [el, c] of inner) top2.set(el, (top2.get(el) || 0) + c * n);
    } else if (t.k === "sub") {
      return { err: "Sir, a subscript needs an element or bracket before it — please check this formula." };
    } else if (t.k === "ch") {
      return { err: "Sir, the charge sits at the end of an ion — please check this formula." };
    } else {
      return { err: "Sir, please check this chemical formula." };
    }
    i++;
  }
  if (stack.length > 1) return { err: "Sir, a parenthesis is left open — please check this formula." };
  const counts: Record<string, number> = {};
  for (const [el, c] of stack[0]) counts[el] = c;
  if (Object.keys(counts).length === 0) return { err: "Sir, please check this chemical formula." };
  return { counts };
}

function parseSpecies(toks: Tok[]): { counts: Record<string, number>; charge: number } | { err: ParseErr } {
  const segments: Tok[][] = [[]];
  for (const t of toks) {
    if (t.k === "dot") segments.push([]);
    else segments[segments.length - 1].push(t);
  }
  const counts: Record<string, number> = {};
  let charge = 0;
  for (let si = 0; si < segments.length; si++) {
    let seg = segments[si];
    let mult = 1;
    if (seg.length && seg[0].k === "sub") {
      mult = (seg[0] as { n: number }).n;
      seg = seg.slice(1);
    }
    if (seg.length === 0) {
      return {
        err:
          segments.length > 1
            ? "Sir, the hydrate dot (·) needs a formula on both sides."
            : "Sir, please check this chemical formula.",
      };
    }
    // charge tokens live anywhere in the species; pull them out
    const body: Tok[] = [];
    let charges = 0;
    let seenCharge = false;
    for (const t of seg) {
      if (t.k === "ch") {
        if (seenCharge) return { err: "Sir, an ion carries one charge — please keep a single superscript." };
        charge = t.z;
        seenCharge = true;
        charges++;
      } else body.push(t);
    }
    if (body.length === 0) return { err: "Sir, please check this chemical formula." };
    const res = parseSegment(body);
    if ("err" in res) return res;
    for (const [el, c] of Object.entries(res.counts)) counts[el] = (counts[el] || 0) + c * mult;
    void charges;
  }
  if (Object.keys(counts).length === 0) return { err: "Sir, please check this chemical formula." };
  return { counts, charge };
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

export function validate(tokens: Tok[]): Validation {
  if (tokens.length === 0)
    return { ok: false, empty: true, msg: "Sir, enter your chemical equation below." };

  const arrows = tokens.filter((t) => t.k === "arrow").length;
  if (arrows === 0)
    return { ok: false, msg: "Sir, something looks incomplete — please add the arrow (→) between reactants and products." };
  if (arrows > 1)
    return { ok: false, msg: "Sir, one arrow (→) is enough — please keep a single one." };

  const ranges = speciesRanges(tokens);
  if (ranges.some((r) => r.start === r.end))
    return { ok: false, msg: "Sir, something looks incomplete — a + or → is missing a compound beside it." };

  const species: Species[] = [];
  for (const r of ranges) {
    const toks = tokens.slice(r.start, r.end);
    const res = parseSpecies(toks);
    if ("err" in res) return { ok: false, msg: res.err };
    species.push({ toks, start: r.start, end: r.end, side: r.side, counts: res.counts, charge: res.charge });
  }

  const left = species.filter((s) => s.side === 0);
  const right = species.filter((s) => s.side === 1);
  if (left.length === 0 || right.length === 0)
    return { ok: false, msg: "Sir, something looks incomplete — an equation needs both reactants and products." };

  const leftEls = new Set<string>();
  const rightEls = new Set<string>();
  for (const s of species) for (const el of Object.keys(s.counts)) (s.side === 0 ? leftEls : rightEls).add(el);
  for (const el of leftEls)
    if (!rightEls.has(el))
      return { ok: false, msg: `Sir, an element appears to be missing from one side — ${el} is only among the reactants.` };
  for (const el of rightEls)
    if (!leftEls.has(el))
      return { ok: false, msg: `Sir, an element appears to be missing from one side — ${el} is only among the products.` };

  const elements: string[] = [];
  for (const s of species) for (const el of Object.keys(s.counts)) if (!elements.includes(el)) elements.push(el);

  return { ok: true, parsed: { species, elements, hasCharge: species.some((s) => s.charge !== 0) } };
}

/* ------------------------------------------------------------------ */
/*  Exact rational arithmetic                                          */
/* ------------------------------------------------------------------ */

type Frac = [number, number]; // [numerator, denominator > 0], reduced

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}
function mk(n: number, d = 1): Frac {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  if (n === 0) return [0, 1];
  const g = gcd(n, d);
  return [n / g, d / g];
}
const fadd = (a: Frac, b: Frac): Frac => mk(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const fmul = (a: Frac, b: Frac): Frac => mk(a[0] * b[0], a[1] * b[1]);
const fneg = (a: Frac): Frac => [-a[0], a[1]];
const fsub = (a: Frac, b: Frac): Frac => fadd(a, fneg(b));
const fdiv = (a: Frac, b: Frac): Frac => mk(a[0] * b[1], a[1] * b[0]);

function nullspace(A: Frac[][]): Frac[][] {
  const m = A.length;
  const n = A[0] ? A[0].length : 0;
  if (n === 0) return [];
  const M = A.map((r) => r.slice());
  const pivotCols: number[] = [];
  let row = 0;
  for (let col = 0; col < n && row < m; col++) {
    let sel = -1;
    for (let r = row; r < m; r++) if (M[r][col][0] !== 0) { sel = r; break; }
    if (sel < 0) continue;
    [M[row], M[sel]] = [M[sel], M[row]];
    const pv = M[row][col];
    M[row] = M[row].map((v) => fdiv(v, pv));
    for (let r = 0; r < m; r++) {
      if (r !== row && M[r][col][0] !== 0) {
        const f = M[r][col];
        M[r] = M[r].map((v, c) => fsub(v, fmul(f, M[row][c])));
      }
    }
    pivotCols.push(col);
    row++;
  }
  const free: number[] = [];
  for (let c = 0; c < n; c++) if (!pivotCols.includes(c)) free.push(c);
  return free.map((f) => {
    const v: Frac[] = new Array(n).fill(mk(0));
    v[f] = mk(1);
    pivotCols.forEach((pc, i) => {
      v[pc] = fneg(M[i][f]);
    });
    return v;
  });
}

const sameSign = (v: Frac[]) => v.every((x) => x[0] > 0) || v.every((x) => x[0] < 0);

function toInts(v: Frac[]): number[] {
  let D = 1;
  for (const x of v) D = lcm(D, x[1]);
  let ints = v.map((x) => (x[0] * D) / x[1]);
  let g = 0;
  for (const x of ints) g = gcd(g, x);
  g = g || 1;
  ints = ints.map((x) => Math.abs(x / g));
  return ints;
}

/* ------------------------------------------------------------------ */
/*  Balancing                                                          */
/* ------------------------------------------------------------------ */

export type BalanceResult =
  | { status: "ok"; coeffs: number[] }
  | { status: "impossible"; charged: boolean };

export function balance(parsed: Parsed): BalanceResult {
  const { species, elements, hasCharge } = parsed;
  const n = species.length;
  const rows: Frac[][] = [];
  for (const el of elements) {
    rows.push(species.map((s) => mk((s.counts[el] || 0) * (s.side === 0 ? 1 : -1))));
  }
  if (hasCharge) {
    rows.push(species.map((s) => mk(s.charge * (s.side === 0 ? 1 : -1))));
  }
  const basis = nullspace(rows);
  if (basis.length === 0) return { status: "impossible", charged: hasCharge };

  let best: number[] | null = null;
  let bestSum = Infinity;

  const consider = (v: Frac[]) => {
    if (!sameSign(v)) return;
    const ints = toInts(v);
    if (ints.some((x) => x === 0)) return;
    const sum = ints.reduce((a, b) => a + b, 0);
    if (sum < bestSum) {
      bestSum = sum;
      best = ints;
    }
  };

  if (basis.length === 1) {
    consider(basis[0]);
  } else {
    // search small integer combinations of the basis vectors
    const dims = Math.min(basis.length, 4);
    const range = [-3, -2, -1, 0, 1, 2, 3];
    const combo = new Array(dims).fill(0);
    const walk = (d: number) => {
      if (d === dims) {
        if (combo.every((c) => c === 0)) return;
        let v: Frac[] = new Array(n).fill(mk(0));
        for (let i = 0; i < dims; i++) {
          if (combo[i] === 0) continue;
          const bi = basis[i];
          v = v.map((x, j) => fadd(x, fmul(mk(combo[i]), bi[j])));
        }
        consider(v);
        return;
      }
      for (const t of range) {
        combo[d] = t;
        walk(d + 1);
      }
    };
    walk(0);
  }

  if (!best) return { status: "impossible", charged: hasCharge };
  const coeffs = best as number[];

  // verify atom + charge conservation
  for (const el of elements) {
    let l = 0, r = 0;
    species.forEach((s, i) => {
      const c = (s.counts[el] || 0) * coeffs[i];
      if (s.side === 0) l += c;
      else r += c;
    });
    if (l !== r) return { status: "impossible", charged: hasCharge };
  }
  if (hasCharge) {
    let l = 0, r = 0;
    species.forEach((s, i) => {
      const c = s.charge * coeffs[i];
      if (s.side === 0) l += c;
      else r += c;
    });
    if (l !== r) return { status: "impossible", charged: true };
  }
  return { status: "ok", coeffs };
}

export function sideCounts(parsed: Parsed, coeffs: number[]) {
  const left: Record<string, number> = {};
  const right: Record<string, number> = {};
  parsed.species.forEach((s, i) => {
    const target = s.side === 0 ? left : right;
    for (const [el, c] of Object.entries(s.counts)) target[el] = (target[el] || 0) + c * coeffs[i];
  });
  return { left, right };
}

export function chargeSums(parsed: Parsed, coeffs: number[]) {
  let l = 0, r = 0;
  parsed.species.forEach((s, i) => {
    if (s.side === 0) l += s.charge * coeffs[i];
    else r += s.charge * coeffs[i];
  });
  return { left: l, right: r };
}

/* ------------------------------------------------------------------ */
/*  Friendly text parser  (H2 + O2 -> H2O, SO4^2-, CuSO4.5H2O)         */
/* ------------------------------------------------------------------ */

export function parseText(src: string): Tok[] | null {
  let s = src
    .replace(/<->|<=>|⇌|→|⇒/g, "->")
    .replace(/=>/g, "->")
    .replace(/=/g, "->")
    .replace(/[·•*]/g, ".")
    .replace(/−/g, "-");
  s = s.replace(/[\[\]]/g, (c) => (c === "[" ? "(" : ")"));

  const toks: Tok[] = [];
  let i = 0;
  let prev: Tok | null = null; // last token of the current compound
  const attachable = () => prev !== null && (prev.k === "el" || prev.k === "rp" || prev.k === "sub");

  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (s.startsWith("->", i)) {
      toks.push({ k: "arrow" });
      prev = null;
      i += 2;
      continue;
    }
    if (c === "+" || c === "-") {
      const prevIsSpace = i > 0 && /\s/.test(s[i - 1]);
      const nextIsDigit = /\d/.test(s[i + 1] || "");
      if (attachable() && !prevIsSpace) {
        // ionic charge: Na+ , Cl- , Ca+2 , Fe-3
        let mag = 1;
        let j = i + 1;
        if (nextIsDigit) {
          let num = "";
          while (/\d/.test(s[j] || "")) num += s[j++];
          mag = parseInt(num, 10);
        }
        toks.push({ k: "ch", z: (c === "+" ? 1 : -1) * mag });
        prev = toks[toks.length - 1];
        i = j;
        continue;
      }
      if (c === "+") {
        toks.push({ k: "plus" });
        prev = null;
        i++;
        continue;
      }
      return null;
    }
    if (c === "^") {
      // explicit charge: ^2-  ^-2  ^+  ^-
      let j = i + 1;
      let digits = "";
      let sign = "";
      if (/\d/.test(s[j] || "")) {
        while (/\d/.test(s[j] || "")) digits += s[j++];
        if (s[j] === "+" || s[j] === "-") sign = s[j++];
        else sign = "+";
      } else if (s[j] === "+" || s[j] === "-") {
        sign = s[j++];
        while (/\d/.test(s[j] || "")) digits += s[j++];
      } else {
        return null;
      }
      const mag = digits ? parseInt(digits, 10) : 1;
      if (!attachable()) return null;
      toks.push({ k: "ch", z: (sign === "-" ? -1 : 1) * mag });
      prev = toks[toks.length - 1];
      i = j;
      continue;
    }
    if (c === "(") {
      toks.push({ k: "lp" });
      prev = toks[toks.length - 1];
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ k: "rp" });
      prev = toks[toks.length - 1];
      i++;
      continue;
    }
    if (c === ".") {
      toks.push({ k: "dot" });
      prev = toks[toks.length - 1];
      i++;
      continue;
    }
    if (/\d/.test(c)) {
      let num = "";
      while (/\d/.test(s[i] || "")) num += s[i++];
      const n = parseInt(num, 10);
      if (prev && (prev.k === "el" || prev.k === "rp" || prev.k === "dot")) {
        toks.push({ k: "sub", n });
        prev = toks[toks.length - 1];
      }
      // otherwise a leading coefficient — politely ignored, we re-balance anyway
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      const two = s.slice(i, i + 2);
      const one = s.slice(i, i + 1);
      let sym: string | null = null;
      if (two.length === 2 && elementBySymbol(two)) sym = elementBySymbol(two)!.symbol;
      else if (elementBySymbol(one)) sym = elementBySymbol(one)!.symbol;
      if (!sym) return null;
      toks.push({ k: "el", s: sym });
      prev = toks[toks.length - 1];
      i += sym.length;
      continue;
    }
    return null;
  }
  return toks;
}

/* ------------------------------------------------------------------ */
/*  Display helpers                                                    */
/* ------------------------------------------------------------------ */

export function chargeLabel(z: number): string {
  const sign = z > 0 ? "+" : "−";
  const mag = Math.abs(z);
  return mag === 1 ? sign : `${mag}${sign}`;
}
