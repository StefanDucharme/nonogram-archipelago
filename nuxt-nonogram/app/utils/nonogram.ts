export type Cell = 0 | 1;
export type Mark = 'empty' | 'fill' | 'x';

export type Grid<T> = T[][];

export function makeGrid<T>(rows: number, cols: number, value: T): Grid<T> {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
}

export function randomSolution(rows: number, cols: number, fillRate = 0.45): Grid<Cell> {
  // Basic random; always “valid” as a target solution.
  // (Uniqueness is not guaranteed; see optional uniqueness note below.)
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() < fillRate ? 1 : 0) as Cell));
}

export function lineClues(line: Cell[]): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const c of line) {
    if (c === 1) run++;
    else if (run) {
      clues.push(run);
      run = 0;
    }
  }
  if (run) clues.push(run);
  return clues.length ? clues : [0];
}

export function computeRowClues(solution: Grid<Cell>): number[][] {
  return solution.map(lineClues);
}

export function computeColClues(solution: Grid<Cell>): number[][] {
  const rows = solution.length;
  const cols = solution[0]?.length ?? 0;
  const out: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const col: Cell[] = [];
    for (let r = 0; r < rows; r++) col.push(solution[r][c]);
    out.push(lineClues(col));
  }
  return out;
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

/**
 * OPTIONAL (later):
 * - Add a uniqueness solver for small sizes (10x10) via backtracking.
 * - Regenerate until unique.
 * This can be done, but it’s a bit longer; the game works without it.
 */
