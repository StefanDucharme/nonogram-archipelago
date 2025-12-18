import { computed, ref, onMounted } from 'vue';
import {
  type Cell,
  type Clue,
  type Grid,
  type Mark,
  clueNumbers,
  computeColClues,
  computeRowClues,
  isClueComplete,
  isSolved,
  makeGrid,
  randomSolution,
} from '~/utils/nonogram';

export function useNonogram() {
  const rows = ref(10);
  const cols = ref(10);
  const fillRate = ref(0.45);

  // SSR-safe deterministic initial state
  const solution = ref<Grid<Cell>>(makeGrid(rows.value, cols.value, 0 as Cell));
  const player = ref<Grid<Mark>>(makeGrid(rows.value, cols.value, 'empty'));

  // Full clue objects with position data (for completion checking)
  const rowClues = computed(() => computeRowClues(solution.value));
  const colClues = computed(() => computeColClues(solution.value));

  // Just the numbers for display
  const rowClueNumbers = computed(() => {
    const result = rowClues.value.map(clueNumbers);
    console.log('Computing rowClueNumbers from solution:', JSON.stringify(solution.value[0]));
    console.log('rowClueNumbers result:', JSON.stringify(result));
    return result;
  });
  const colClueNumbers = computed(() => colClues.value.map(clueNumbers));

  const solved = computed(() => isSolved(player.value, solution.value));

  // Check if a specific row clue is complete
  function isRowClueComplete(rowIndex: number, clueIndex: number): boolean {
    const clue = rowClues.value[rowIndex]?.[clueIndex];
    const playerRow = player.value[rowIndex];
    if (!clue || !playerRow) return false;
    return isClueComplete(clue, playerRow);
  }

  // Check if a specific column clue is complete
  function isColClueComplete(colIndex: number, clueIndex: number): boolean {
    const clue = colClues.value[colIndex]?.[clueIndex];
    if (!clue) return false;
    // Build the column from player grid
    const playerCol: Mark[] = [];
    for (const row of player.value) {
      const cell = row[colIndex];
      if (cell !== undefined) playerCol.push(cell);
    }
    return isClueComplete(clue, playerCol);
  }

  function newRandom(r = rows.value, c = cols.value) {
    rows.value = r;
    cols.value = c;
    solution.value = randomSolution(r, c, fillRate.value);
    player.value = makeGrid(r, c, 'empty');
  }

  function clearPlayer() {
    player.value = makeGrid(rows.value, cols.value, 'empty');
  }

  function setCell(r: number, c: number, v: Mark) {
    player.value[r][c] = v;
  }

  function cycleCell(r: number, c: number, mode: 'fill' | 'x' | 'erase') {
    // Create new array to trigger reactivity
    const newPlayer = [...player.value.map((row) => [...row])];
    const cur = newPlayer[r][c];

    if (mode === 'erase') {
      newPlayer[r][c] = 'empty';
    } else if (mode === 'fill') {
      newPlayer[r][c] = cur === 'fill' ? 'empty' : 'fill';
    } else if (mode === 'x') {
      newPlayer[r][c] = cur === 'x' ? 'empty' : 'x';
    }

    player.value = newPlayer;
  }

  // Generate only on client to avoid hydration mismatch
  onMounted(() => {
    newRandom(rows.value, cols.value);
  });

  return {
    rows,
    cols,
    fillRate,
    solution,
    player,
    rowClues,
    colClues,
    rowClueNumbers,
    colClueNumbers,
    solved,
    isRowClueComplete,
    isColClueComplete,
    newRandom,
    clearPlayer,
    setCell,
    cycleCell,
  };
}
