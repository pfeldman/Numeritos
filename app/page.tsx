'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const SECRET_LENGTH = 4;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type CellState = 0 | 1 | 2; // 0 neutral, 1 maybe (verde), 2 descartado (rojo)
type GameStatus = 'playing' | 'won' | 'revealed';

interface Guess {
  values: number[];
  buenos: number;
  regulares: number;
}

function pickSecret(): number[] {
  const pool = [...DIGITS];
  const out: number[] = [];
  for (let i = 0; i < SECRET_LENGTH; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

function evaluateGuess(guess: number[], secret: number[]): { buenos: number; regulares: number } {
  // Si el usuario repite un dígito, contamos ese dígito una sola vez,
  // y "bueno" gana a "regular".
  let buenos = 0;
  let regulares = 0;
  const seen = new Set<number>();
  for (let i = 0; i < SECRET_LENGTH; i++) {
    const d = guess[i];
    if (seen.has(d)) continue;
    seen.add(d);
    let hasBueno = false;
    for (let j = 0; j < SECRET_LENGTH; j++) {
      if (guess[j] === d && secret[j] === d) {
        hasBueno = true;
        break;
      }
    }
    if (hasBueno) buenos++;
    else if (secret.includes(d)) regulares++;
  }
  return { buenos, regulares };
}

function emptyGrid(): CellState[][] {
  return DIGITS.map(() => Array(SECRET_LENGTH).fill(0) as CellState[]);
}

export default function Page() {
  const [secret, setSecret] = useState<number[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [current, setCurrent] = useState<(number | null)[]>(Array(SECRET_LENGTH).fill(null));
  const [status, setStatus] = useState<GameStatus>('playing');
  const [grid, setGrid] = useState<CellState[][]>(emptyGrid);
  const [error, setError] = useState<string>('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const historyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [guesses.length]);

  useEffect(() => {
    // initialize on client only to avoid hydration mismatch
    setSecret(pickSecret());
  }, []);

  function newGame() {
    setSecret(pickSecret());
    setGuesses([]);
    setCurrent(Array(SECRET_LENGTH).fill(null));
    setStatus('playing');
    setGrid(emptyGrid());
    setError('');
    setTimeout(() => inputs.current[0]?.focus(), 0);
  }

  function setDigit(i: number, raw: string) {
    setError('');
    if (raw === '') {
      setCurrent((prev) => {
        const copy = [...prev];
        copy[i] = null;
        return copy;
      });
      return;
    }
    const ch = raw[raw.length - 1];
    if (!/^[0-9]$/.test(ch)) return;
    const n = parseInt(ch, 10);
    setCurrent((prev) => {
      const copy = [...prev];
      copy[i] = n;
      return copy;
    });
    if (i < SECRET_LENGTH - 1) {
      setTimeout(() => inputs.current[i + 1]?.focus(), 0);
    }
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && (current[i] === null || (e.target as HTMLInputElement).value === '')) {
      if (i > 0) {
        setCurrent((prev) => {
          const copy = [...prev];
          copy[i - 1] = null;
          return copy;
        });
        setTimeout(() => inputs.current[i - 1]?.focus(), 0);
      }
    } else if (e.key === 'Enter') {
      submitGuess();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < SECRET_LENGTH - 1) {
      inputs.current[i + 1]?.focus();
    }
  }

  function submitGuess() {
    if (status !== 'playing') return;
    if (current.some((v) => v === null)) {
      setError('Completá los 4 numeritos.');
      return;
    }
    const values = current as number[];
    const { buenos, regulares } = evaluateGuess(values, secret);
    const next: Guess = { values, buenos, regulares };
    setGuesses((g) => [...g, next]);
    setCurrent(Array(SECRET_LENGTH).fill(null));
    setError('');
    setTimeout(() => inputs.current[0]?.focus(), 0);
    if (buenos === SECRET_LENGTH) {
      setStatus('won');
    }
  }

  function cycleCell(row: number, col: number) {
    setGrid((g) => {
      const copy = g.map((r) => [...r]);
      const cur = copy[row][col];
      // 0 (vacío) -> 2 (tachar) -> 1 (marcar) -> 0
      copy[row][col] = (cur === 0 ? 2 : cur === 2 ? 1 : 0) as CellState;
      return copy;
    });
  }

  function reveal() {
    setStatus('revealed');
  }

  const canSubmit = useMemo(
    () => status === 'playing' && current.every((v) => v !== null),
    [current, status]
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="text-amber-400">Numeritos</span>
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Adiviná los 4 numeritos secretos (del 0 al 9, sin repetir).{' '}
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 align-middle" /> bueno = misma posición ·{' '}
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 align-middle" /> regular = el número está, en otra posición.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={newGame}
              className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition"
            >
              Nuevo juego
            </button>
            <button
              onClick={reveal}
              disabled={status !== 'playing'}
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition disabled:opacity-40"
            >
              Rendirse
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto]">
          <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Tus jugadas ({guesses.length})
            </h2>
            <div ref={historyRef} className="mb-4 max-h-[360px] overflow-y-auto rounded-lg">
              {guesses.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-slate-500">Todavía no jugaste. Probá una combinación.</p>
              ) : (
                <ol className="space-y-2">
                  {guesses.map((g, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-800/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-right text-xs tabular-nums text-slate-500">{idx + 1}.</span>
                        <div className="flex gap-1.5">
                          {g.values.map((v, i) => (
                            <span
                              key={i}
                              className="grid h-9 w-9 place-items-center rounded-md bg-slate-900 font-mono text-lg font-bold text-slate-100 ring-1 ring-slate-700"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1.5"
                        aria-label={`${g.buenos} buenos, ${g.regulares} regulares`}
                        title={`${g.buenos} buenos · ${g.regulares} regulares`}
                      >
                        {Array.from({ length: g.buenos }).map((_, i) => (
                          <span
                            key={`b${i}`}
                            className="h-4 w-4 rounded-full bg-emerald-400 ring-1 ring-emerald-300/60"
                          />
                        ))}
                        {Array.from({ length: g.regulares }).map((_, i) => (
                          <span
                            key={`r${i}`}
                            className="h-4 w-4 rounded-full bg-amber-400 ring-1 ring-amber-300/60"
                          />
                        ))}
                        {g.buenos === 0 && g.regulares === 0 && (
                          <span className="text-xs text-slate-500">— nada</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="rounded-lg bg-slate-800/40 p-4 ring-1 ring-slate-700">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tu jugada
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2">
                  {Array.from({ length: SECRET_LENGTH }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputs.current[i] = el;
                      }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={current[i] === null ? '' : String(current[i])}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => onKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                      disabled={status !== 'playing'}
                      className="h-14 w-14 rounded-md border-2 border-slate-600 bg-slate-950 text-center font-mono text-2xl font-bold text-amber-300 outline-none transition focus:border-amber-400 disabled:opacity-50"
                      aria-label={`Posición ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={submitGuess}
                  disabled={!canSubmit}
                  className="rounded-md bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Probar
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
            </div>

            {status === 'won' && (
              <div className="mt-4 rounded-lg bg-emerald-500/15 p-4 ring-1 ring-emerald-500/40">
                <p className="text-emerald-300">
                  ¡Ganaste en {guesses.length} {guesses.length === 1 ? 'jugada' : 'jugadas'}! El secreto era{' '}
                  <span className="font-mono font-bold">{secret.join(' ')}</span>.
                </p>
              </div>
            )}
            {status === 'revealed' && (
              <div className="mt-4 rounded-lg bg-rose-500/10 p-4 ring-1 ring-rose-500/40">
                <p className="text-rose-300">
                  El secreto era <span className="font-mono font-bold">{secret.join(' ')}</span>. Dale a{' '}
                  <em>Nuevo juego</em> para volver a intentar.
                </p>
              </div>
            )}
          </section>

          <aside className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 sm:p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-400">Grilla de descarte</h2>
            <p className="mb-3 text-xs text-slate-500">
              Tocá una celda para alternar: vacío → <span className="text-rose-400">tachar</span> →{' '}
              <span className="text-emerald-400">marcar</span>.
            </p>
            <div className="inline-block rounded-lg bg-slate-950/60 p-2 ring-1 ring-slate-800">
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `auto repeat(${SECRET_LENGTH}, minmax(0, 1fr))` }}
              >
                <div />
                {Array.from({ length: SECRET_LENGTH }).map((_, c) => (
                  <div
                    key={`h-${c}`}
                    className="grid h-7 w-9 place-items-center text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    P{c + 1}
                  </div>
                ))}
                {DIGITS.map((d) => (
                  <Row key={d} digit={d} row={grid[d]} onCellClick={cycleCell} />
                ))}
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Hecho con Next.js · sin repetidos · 4 numeritos del 0 al 9
        </footer>
      </div>
    </main>
  );
}

function Row({
  digit,
  row,
  onCellClick,
}: {
  digit: number;
  row: CellState[];
  onCellClick: (row: number, col: number) => void;
}) {
  return (
    <>
      <div className="grid h-9 w-7 place-items-center font-mono text-sm font-bold text-slate-300">{digit}</div>
      {row.map((state, c) => {
        const base = 'h-9 w-9 rounded-md ring-1 transition select-none grid place-items-center text-base font-bold';
        const cls =
          state === 0
            ? 'bg-slate-900 ring-slate-700 text-transparent hover:bg-slate-800'
            : state === 1
              ? 'bg-emerald-500/20 ring-emerald-500/50 text-emerald-300'
              : 'bg-rose-500/15 ring-rose-500/40 text-rose-300 line-through';
        return (
          <button
            key={c}
            onClick={() => onCellClick(digit, c)}
            className={`${base} ${cls}`}
            aria-label={`Dígito ${digit} en posición ${c + 1}`}
          >
            {state === 1 ? '•' : state === 2 ? '×' : '·'}
          </button>
        );
      })}
    </>
  );
}
