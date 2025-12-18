import { computed, ref } from 'vue';
import { type Cell, type Grid, type Mark, computeColClues, computeRowClues, isSolved, makeGrid, randomSolution } from '~/utils/nonogram';

export function useNonogram() {
  const rows = ref(10);
  const cols = ref(10);
  const fillRate = ref(0.45);

  const solution = ref<Grid<Cell>>(randomSolution(rows.value, cols.value, fillRate.value));
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
