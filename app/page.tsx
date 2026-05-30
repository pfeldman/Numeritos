'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const SECRET_LENGTH = 4;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const GRID_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as const;

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
  const [gridMode, setGridMode] = useState<GridMode>('play');
  const [error, setError] = useState<string>('');
  const historyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [guesses.length]);

  useEffect(() => {
    setSecret(pickSecret());
  }, []);

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
    setGridMode('play');
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
    setGridMode('notes');
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
      // One-shot a partir del 2do turno: en el primer turno se queda en Jugar.
      if (guesses.length > 0) setGridMode('notes');
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
    <main className="min-h-screen px-3 py-3 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="text-amber-400">Numeritos</span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={newGame}
              className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-300 transition sm:text-sm"
            >
              Nuevo juego
            </button>
            <button
              onClick={reveal}
              disabled={status !== 'playing'}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition disabled:opacity-40 sm:text-sm"
            >
              Rendirse
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-5">
          {/* Jugada actual */}
          <section className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-800 sm:p-4 lg:col-start-1 lg:row-start-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tu jugada</label>
              <div className="flex gap-1.5">
                <button
                  onClick={backspace}
                  disabled={status !== 'playing'}
                  className="rounded-md border border-slate-600 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 transition disabled:opacity-40"
                >
                  ⌫ Borrar
                </button>
                <button
                  onClick={submitGuess}
                  disabled={!canSubmit}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  ✓ Probar
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {Array.from({ length: SECRET_LENGTH }).map((_, i) => {
                const v = current[i];
                const active = i === activeIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    disabled={status !== 'playing'}
                    className={`h-12 w-12 rounded-md border-2 text-center font-mono text-2xl font-bold transition ${
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
            {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
          </section>

          {/* Grilla */}
          <aside className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-800 sm:p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Grilla</h2>
              <div className="flex rounded-md bg-slate-800 p-0.5 text-xs ring-1 ring-slate-700">
                <button
                  onClick={() => setGridMode('notes')}
                  className={`rounded px-2 py-0.5 font-medium transition ${
                    gridMode === 'notes' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  Notas
                </button>
                <button
                  onClick={() => setGridMode('play')}
                  className={`rounded px-2 py-0.5 font-medium transition ${
                    gridMode === 'play' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  Jugar
                </button>
              </div>
            </div>
            <p className="mb-2 text-[11px] leading-tight text-slate-500">
              {gridMode === 'notes' ? (
                <>
                  Tocá: vacío → <span className="text-rose-400">tachar</span> →{' '}
                  <span className="text-emerald-400">marcar</span>.
                </>
              ) : (
                <>Tocá un número/columna para escribirlo en esa posición.</>
              )}
            </p>
            <div className="inline-block rounded-lg bg-slate-950/60 p-1.5 ring-1 ring-slate-800">
              <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `auto repeat(${SECRET_LENGTH}, minmax(0, 1fr))` }}
              >
                <div />
                {Array.from({ length: SECRET_LENGTH }).map((_, c) => (
                  <div
                    key={`h-${c}`}
                    className="grid h-5 w-8 place-items-center text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    P{c + 1}
                  </div>
                ))}
                {GRID_DIGITS.map((d) => (
                  <Row key={d} digit={d} row={grid[d]} mode={gridMode} onCellClick={onGridCell} />
                ))}
              </div>
            </div>
          </aside>

          {/* Historial */}
          <section className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-800 sm:p-4 lg:col-start-1 lg:row-start-2">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Jugadas ({guesses.length})
            </h2>
            <div ref={historyRef} className="max-h-[180px] overflow-y-auto rounded-lg sm:max-h-[280px]">
              {guesses.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-slate-500">
                  Todavía no jugaste. Probá una combinación.
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {guesses.map((g, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-md bg-slate-800/60 px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-right text-xs tabular-nums text-slate-500">{idx + 1}.</span>
                        <div className="flex gap-1">
                          {g.values.map((v, i) => (
                            <span
                              key={i}
                              className="grid h-7 w-7 place-items-center rounded bg-slate-900 font-mono text-sm font-bold text-slate-100 ring-1 ring-slate-700"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1"
                        aria-label={`${g.buenos} buenos, ${g.regulares} regulares`}
                        title={`${g.buenos} buenos · ${g.regulares} regulares`}
                      >
                        {Array.from({ length: g.buenos }).map((_, i) => (
                          <span
                            key={`b${i}`}
                            className="h-3.5 w-3.5 rounded-full bg-emerald-400 ring-1 ring-emerald-300/60"
                          />
                        ))}
                        {Array.from({ length: g.regulares }).map((_, i) => (
                          <span
                            key={`r${i}`}
                            className="h-3.5 w-3.5 rounded-full bg-amber-400 ring-1 ring-amber-300/60"
                          />
                        ))}
                        {g.buenos === 0 && g.regulares === 0 && (
                          <span className="text-[11px] text-slate-500">— nada</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {status === 'won' && (
              <div className="mt-3 rounded-md bg-emerald-500/15 p-2.5 text-sm ring-1 ring-emerald-500/40">
                <p className="text-emerald-300">
                  ¡Ganaste en {guesses.length} {guesses.length === 1 ? 'jugada' : 'jugadas'}! El secreto era{' '}
                  <span className="font-mono font-bold">{secret.join(' ')}</span>.
                </p>
              </div>
            )}
            {status === 'revealed' && (
              <div className="mt-3 rounded-md bg-rose-500/10 p-2.5 text-sm ring-1 ring-rose-500/40">
                <p className="text-rose-300">
                  El secreto era <span className="font-mono font-bold">{secret.join(' ')}</span>.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
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
      <div className="grid h-8 w-6 place-items-center font-mono text-xs font-bold text-slate-300">{digit}</div>
      {row.map((state, c) => {
        const base = 'h-8 w-8 rounded-md ring-1 transition select-none grid place-items-center text-sm font-bold';
        let cls: string;
        let label: string;
        if (state === 0) {
          cls = 'bg-slate-900 ring-slate-700 text-transparent';
          label = '·';
        } else if (state === 1) {
          cls = 'bg-emerald-500/20 ring-emerald-500/50 text-emerald-300';
          label = '•';
        } else {
          cls = 'bg-rose-500/15 ring-rose-500/40 text-rose-300 line-through';
          label = '×';
        }
        const hover =
          mode === 'play'
            ? 'hover:bg-amber-400/20 hover:ring-amber-400/60 cursor-pointer'
            : 'hover:bg-slate-800';
        return (
          <button
            key={c}
            onClick={() => onCellClick(digit, c)}
            className={`${base} ${cls} ${hover}`}
            aria-label={
              mode === 'play'
                ? `Escribir ${digit} en posición ${c + 1}`
                : `Dígito ${digit} en posición ${c + 1}`
            }
          >
            {label}
          </button>
        );
      })}
    </>
  );
}
