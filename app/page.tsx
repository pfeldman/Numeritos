'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const SECRET_LENGTH = 4;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type CellState = 0 | 1 | 2; // 0 vacío, 1 marcado (verde), 2 tachado (rojo)
type GameStatus = 'playing' | 'won' | 'revealed';
type GridMode = 'notes' | 'play';

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
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [grid, setGrid] = useState<CellState[][]>(emptyGrid);
  const [gridMode, setGridMode] = useState<GridMode>('notes');
  const [error, setError] = useState<string>('');
  const historyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [guesses.length]);

  useEffect(() => {
    setSecret(pickSecret());
  }, []);

  // Teclado físico (opcional): números, backspace y enter.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status !== 'playing') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        typeDigit(parseInt(e.key, 10));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitGuess();
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((i) => Math.min(SECRET_LENGTH - 1, i + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, current, activeIndex, secret]);

  function newGame() {
    setSecret(pickSecret());
    setGuesses([]);
    setCurrent(Array(SECRET_LENGTH).fill(null));
    setActiveIndex(0);
    setStatus('playing');
    setGrid(emptyGrid());
    setError('');
  }

  function typeDigit(n: number) {
    if (status !== 'playing') return;
    setError('');
    setCurrent((prev) => {
      const copy = [...prev];
      copy[activeIndex] = n;
      return copy;
    });
    setActiveIndex((i) => Math.min(SECRET_LENGTH - 1, i + 1));
  }

  function backspace() {
    if (status !== 'playing') return;
    setError('');
    setCurrent((prev) => {
      const copy = [...prev];
      if (copy[activeIndex] !== null) {
        copy[activeIndex] = null;
      } else if (activeIndex > 0) {
        copy[activeIndex - 1] = null;
        setActiveIndex(activeIndex - 1);
      }
      return copy;
    });
  }

  function submitGuess() {
    if (status !== 'playing') return;
    if (current.some((v) => v === null)) {
      setError('Completá los 4 numeritos.');
      return;
    }
    const values = current as number[];
    const { buenos, regulares } = evaluateGuess(values, secret);
    setGuesses((g) => [...g, { values, buenos, regulares }]);
    setCurrent(Array(SECRET_LENGTH).fill(null));
    setActiveIndex(0);
    setError('');
    if (buenos === SECRET_LENGTH) setStatus('won');
  }

  function onGridCell(digit: number, col: number) {
    if (gridMode === 'notes') {
      setGrid((g) => {
        const copy = g.map((r) => [...r]);
        const cur = copy[digit][col];
        copy[digit][col] = (cur === 0 ? 2 : cur === 2 ? 1 : 0) as CellState;
        return copy;
      });
    } else {
      if (status !== 'playing') return;
      setError('');
      setCurrent((prev) => {
        const copy = [...prev];
        copy[col] = digit;
        return copy;
      });
      setActiveIndex(col);
    }
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
              Adiviná los 4 numeritos secretos.{' '}
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 align-middle" /> bueno = misma
              posición ·{' '}
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 align-middle" /> regular = el número
              está, en otra posición.
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
            <div ref={historyRef} className="mb-4 max-h-[320px] overflow-y-auto rounded-lg">
              {guesses.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-slate-500">
                  Todavía no jugaste. Probá una combinación.
                </p>
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
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {Array.from({ length: SECRET_LENGTH }).map((_, i) => {
                  const v = current[i];
                  const active = i === activeIndex;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      disabled={status !== 'playing'}
                      className={`h-14 w-14 rounded-md border-2 text-center font-mono text-2xl font-bold transition ${
                        active
                          ? 'border-amber-400 bg-slate-950 text-amber-300 ring-2 ring-amber-400/40'
                          : 'border-slate-600 bg-slate-950 text-amber-300 hover:border-slate-500'
                      } disabled:opacity-50`}
                      aria-label={`Posición ${i + 1}`}
                    >
                      {v === null ? '·' : v}
                    </button>
                  );
                })}
              </div>
              {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

              <Keypad
                disabled={status !== 'playing'}
                canSubmit={canSubmit}
                onDigit={typeDigit}
                onBackspace={backspace}
                onSubmit={submitGuess}
              />
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
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Grilla</h2>
              <div className="flex rounded-md bg-slate-800 p-0.5 text-xs ring-1 ring-slate-700">
                <button
                  onClick={() => setGridMode('notes')}
                  className={`rounded px-2.5 py-1 font-medium transition ${
                    gridMode === 'notes' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  Notas
                </button>
                <button
                  onClick={() => setGridMode('play')}
                  className={`rounded px-2.5 py-1 font-medium transition ${
                    gridMode === 'play' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  Jugar
                </button>
              </div>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              {gridMode === 'notes' ? (
                <>
                  Tocá una celda para alternar: vacío → <span className="text-rose-400">tachar</span> →{' '}
                  <span className="text-emerald-400">marcar</span>.
                </>
              ) : (
                <>Tocá una celda y se escribe ese número en esa posición de tu jugada.</>
              )}
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
                  <Row key={d} digit={d} row={grid[d]} mode={gridMode} onCellClick={onGridCell} />
                ))}
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Hecho con Next.js · 4 numeritos del 0 al 9
        </footer>
      </div>
    </main>
  );
}

function Keypad({
  disabled,
  canSubmit,
  onDigit,
  onBackspace,
  onSubmit,
}: {
  disabled: boolean;
  canSubmit: boolean;
  onDigit: (n: number) => void;
  onBackspace: () => void;
  onSubmit: () => void;
}) {
  const keyBase =
    'h-14 rounded-md font-mono text-2xl font-bold transition select-none active:scale-[0.97] disabled:opacity-40';
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onDigit(n)}
          disabled={disabled}
          className={`${keyBase} bg-slate-900 text-slate-100 ring-1 ring-slate-700 hover:bg-slate-800`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={onBackspace}
        disabled={disabled}
        aria-label="Borrar"
        className={`${keyBase} bg-slate-900 text-slate-300 ring-1 ring-slate-700 hover:bg-slate-800`}
      >
        ⌫
      </button>
      <button
        type="button"
        onClick={() => onDigit(0)}
        disabled={disabled}
        className={`${keyBase} bg-slate-900 text-slate-100 ring-1 ring-slate-700 hover:bg-slate-800`}
      >
        0
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !canSubmit}
        aria-label="Probar"
        className={`${keyBase} bg-emerald-500 text-slate-950 ring-1 ring-emerald-400 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400`}
      >
        ✓
      </button>
    </div>
  );
}

function Row({
  digit,
  row,
  mode,
  onCellClick,
}: {
  digit: number;
  row: CellState[];
  mode: GridMode;
  onCellClick: (row: number, col: number) => void;
}) {
  return (
    <>
      <div className="grid h-9 w-7 place-items-center font-mono text-sm font-bold text-slate-300">{digit}</div>
      {row.map((state, c) => {
        const base = 'h-9 w-9 rounded-md ring-1 transition select-none grid place-items-center text-base font-bold';
        let cls: string;
        let label: string;
        if (mode === 'play') {
          cls = 'bg-slate-900 ring-slate-700 text-slate-300 hover:bg-amber-400/20 hover:ring-amber-400/60 hover:text-amber-300';
          label = String(digit);
        } else if (state === 0) {
          cls = 'bg-slate-900 ring-slate-700 text-transparent hover:bg-slate-800';
          label = '·';
        } else if (state === 1) {
          cls = 'bg-emerald-500/20 ring-emerald-500/50 text-emerald-300';
          label = '•';
        } else {
          cls = 'bg-rose-500/15 ring-rose-500/40 text-rose-300 line-through';
          label = '×';
        }
        return (
          <button
            key={c}
            onClick={() => onCellClick(digit, c)}
            className={`${base} ${cls}`}
            aria-label={`Dígito ${digit} en posición ${c + 1}`}
          >
            {label}
          </button>
        );
      })}
    </>
  );
}
