export type Cell = 0 | 1;
export type Mark = 'empty' | 'fill' | 'x' | 'maybe';

export type Grid<T> = T[][];

/**
 * A clue represents a contiguous segment of filled cells in a row/column.
 * - `length`: the number of filled cells (this is what's displayed to the user)
 * - `start`: the starting index of this segment in the solution
 * - `end`: the ending index (exclusive) of this segment in the solution
 */
export interface Clue {
  length: number;
  start: number;
  end: number;
}

export function makeGrid<T>(rows: number, cols: number, value: T): Grid<T> {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
}

export function randomSolution(rows: number, cols: number, fillRate = 0.45): Grid<Cell> {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() < fillRate ? 1 : 0) as Cell));
}

/**
 * Compute clues for a single line (row or column) from the solution.
 * Each clue includes the length and the exact position (start/end) in the solution.
 */
export function lineClues(line: Cell[]): Clue[] {
  const clues: Clue[] = [];
  let runStart = -1;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === 1) {
      if (runStart === -1) {
        runStart = i;
      }
    } else {
      if (runStart !== -1) {
        clues.push({
          length: i - runStart,
          start: runStart,
          end: i,
        });
        runStart = -1;
      }
    }
  }

  // Handle segment that extends to the end
  if (runStart !== -1) {
    clues.push({
      length: line.length - runStart,
      start: runStart,
      end: line.length,
    });
  }

  // Empty line gets a single "0" clue
  if (clues.length === 0) {
    clues.push({ length: 0, start: -1, end: -1 });
  }

  return clues;
}

/**
 * Extract just the clue numbers for display purposes.
 */
export function clueNumbers(clues: Clue[]): number[] {
  return clues.map((c) => c.length);
}

export function computeRowClues(solution: Grid<Cell>): Clue[][] {
  return solution.map(lineClues);
}

export function computeColClues(solution: Grid<Cell>): Clue[][] {
  const rows = solution.length;
  const cols = solution[0]?.length ?? 0;
  const out: Clue[][] = [];
  for (let c = 0; c < cols; c++) {
    const col: Cell[] = [];
    for (let r = 0; r < rows; r++) col.push(solution[r][c]);
    out.push(lineClues(col));
  }
  return out;
}

/**
 * Check if a specific clue segment is completely filled by the player.
 * This checks that all cells in the clue's range are filled.
 */
export function isClueComplete(clue: Clue, playerLine: Mark[]): boolean {
  // Empty clue (0) is complete when no cells are filled
  if (clue.length === 0) {
    return playerLine.every((cell) => cell !== 'fill');
  }

  // Check that all cells in the clue's range are filled
  for (let i = clue.start; i < clue.end; i++) {
    if (playerLine[i] !== 'fill') {
      return false;
    }
  }

  return true;
}

export function isSolved(player: Grid<Mark>, solution: Grid<Cell>): boolean {
  for (let r = 0; r < solution.length; r++) {
    for (let c = 0; c < solution[0].length; c++) {
      const want = solution[r][c] === 1;
      const got = player[r][c] === 'fill';
      if (want !== got) return false;
    }
  }
  return true;
}


// --- Unique-solution enforcement -------------------------------------------------------------
// A nonogram is "line-solvable" when it can be solved by pure constraint propagation (no guessing).
// Line-solvability implies the clues admit exactly one solution AND that solution is fully
// deducible — the strongest, most player-friendly form of "single solution". We generate random
// grids and keep only line-solvable ones (see randomUniqueSolution below).

const LINE_ARRANGEMENT_CAP = 200000;

// Positive run lengths of a line (empty line -> []), i.e. the clue numbers the solver reasons over.
function lineBlockLengths(line: Cell[]): number[] {
  const blocks: number[] = [];
  let run = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === 1) run++;
    else if (run > 0) { blocks.push(run); run = 0; }
  }
  if (run > 0) blocks.push(run);
  return blocks;
}

// Enumerate every placement of `blocks` in a length-n line consistent with `known`
// (-1 unknown / 0 empty / 1 filled), accumulating the OR/AND of the "filled" bit per cell.
// `capped` means the arrangement count blew past the safety cap, so the masks must be ignored.
function enumerateLine(blocks: number[], n: number, known: Int8Array) {
  const orMask = new Int8Array(n);
  const andMask = new Int8Array(n).fill(1);
  const cur = new Int8Array(n);
  let count = 0;
  let capped = false;
  const rec = (bi: number, pos: number): void => {
    if (capped) return;
    if (bi === blocks.length) {
      for (let i = pos; i < n; i++) if (known[i] === 1) return; // tail must stay empty
      count++;
      if (count > LINE_ARRANGEMENT_CAP) { capped = true; return; }
      for (let i = 0; i < n; i++) { if (cur[i]) orMask[i] = 1; else andMask[i] = 0; }
      return;
    }
    const len = blocks[bi];
    for (let s = pos; s + len <= n; s++) {
      let skippable = true;
      for (let i = pos; i < s; i++) if (known[i] === 1) { skippable = false; break; }
      if (!skippable) break; // a forced-fill before the block cannot be skipped
      let fillable = true;
      for (let i = s; i < s + len; i++) if (known[i] === 0) { fillable = false; break; }
      if (fillable && !(s + len < n && known[s + len] === 1)) {
        for (let i = s; i < s + len; i++) cur[i] = 1;
        rec(bi + 1, Math.min(s + len + 1, n));
        for (let i = s; i < s + len; i++) cur[i] = 0;
        if (capped) return;
      }
    }
  };
  rec(0, 0);
  return { orMask, andMask, count, capped };
}

// True iff the puzzle defined by these clues is solvable by pure line-solving (=> single solution,
// no guessing). Starts blank and propagates row/column deductions to a fixpoint.
function cluesAreLineSolvable(rowBlocks: number[][], colBlocks: number[][], rows: number, cols: number): boolean {
  const grid = new Int8Array(rows * cols).fill(-1);
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < rows; r++) {
      const line = grid.subarray(r * cols, r * cols + cols);
      const res = enumerateLine(rowBlocks[r], cols, line);
      if (res.count === 0) return false;
      if (res.capped) continue;
      for (let i = 0; i < cols; i++) {
        const forced = res.andMask[i] === 1 ? 1 : res.orMask[i] === 0 ? 0 : -1;
        if (forced !== -1 && line[i] === -1) { line[i] = forced; changed = true; }
      }
    }
    for (let c = 0; c < cols; c++) {
      const col = new Int8Array(rows);
      for (let r = 0; r < rows; r++) col[r] = grid[r * cols + c];
      const res = enumerateLine(colBlocks[c], rows, col);
      if (res.count === 0) return false;
      if (res.capped) continue;
      for (let r = 0; r < rows; r++) {
        const forced = res.andMask[r] === 1 ? 1 : res.orMask[r] === 0 ? 0 : -1;
        if (forced !== -1 && grid[r * cols + c] === -1) { grid[r * cols + c] = forced; changed = true; }
      }
    }
  }
  for (let i = 0; i < rows * cols; i++) if (grid[i] === -1) return false;
  return true;
}

// True iff `solution`'s clues have a single, no-guess-solvable answer.
export function isSolutionUnique(solution: Grid<Cell>): boolean {
  const rows = solution.length;
  const cols = solution[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return true;
  const rowBlocks = solution.map(lineBlockLengths);
  const colBlocks: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const col: Cell[] = [];
    for (let r = 0; r < rows; r++) col.push(solution[r][c]);
    colBlocks.push(lineBlockLengths(col));
  }
  return cluesAreLineSolvable(rowBlocks, colBlocks, rows, cols);
}

export interface UniqueSolutionOptions {
  maxAttempts?: number;  // regeneration cap (default 400)
  timeBudgetMs?: number; // wall-clock budget before giving up (default 750)
}

// Generate a random solution whose clues have a single, no-guess-solvable answer. If none is found
// within the attempt/time budget (expected only for very large grids, where uniqueness is
// impractical anyway) it returns the last candidate so the caller never blocks or loops forever.
export function randomUniqueSolution(rows: number, cols: number, fillRate = 0.45, opts: UniqueSolutionOptions = {}): Grid<Cell> {
  const maxAttempts = opts.maxAttempts ?? 400;
  const timeBudgetMs = opts.timeBudgetMs ?? 750;
  const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const start = clock();
  let last = randomSolution(rows, cols, fillRate);
  if (isSolutionUnique(last)) return last;
  for (let attempt = 1; attempt < maxAttempts; attempt++) {
    last = randomSolution(rows, cols, fillRate);
    if (isSolutionUnique(last)) return last;
    if (clock() - start >= timeBudgetMs) break;
  }
  return last;
}
