import { computed, ref, onMounted } from 'vue';
import { type Cell, type Grid, type Mark, computeColClues, computeRowClues, isSolved, makeGrid, randomSolution } from '~/utils/nonogram';

export function useNonogram() {
  const rows = ref(10);
  const cols = ref(10);
  const fillRate = ref(0.45);

  // SSR-safe deterministic initial state
  const solution = ref<Grid<Cell>>(makeGrid(rows.value, cols.value, 0 as Cell));
  const player = ref<Grid<Mark>>(makeGrid(rows.value, cols.value, 'empty'));

  const rowClues = computed(() => computeRowClues(solution.value));
  const colClues = computed(() => computeColClues(solution.value));
  const solved = computed(() => isSolved(player.value, solution.value));

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
    const cur = player.value[r][c];
    if (mode === 'erase') {
      player.value[r][c] = 'empty';
      return;
    }
    if (mode === 'fill') player.value[r][c] = cur === 'fill' ? 'empty' : 'fill';
    if (mode === 'x') player.value[r][c] = cur === 'x' ? 'empty' : 'x';
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
    solved,
    newRandom,
    clearPlayer,
    setCell,
    cycleCell,
  };
}
