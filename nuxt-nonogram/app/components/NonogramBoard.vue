<script setup lang="ts">
  import type { Cell, Mark } from '~/utils/nonogram';

  const props = defineProps<{
    rows: number;
    cols: number;
    rowClues: number[][];
    colClues: number[][];
    player: Mark[][];
    solution?: Cell[][];
    showMistakes?: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'cell', r: number, c: number, mode: 'fill' | 'x' | 'erase'): void;
  }>();

  const selected = ref<{ r: number; c: number } | null>(null);

  const colDepth = computed(() => Math.max(1, ...props.colClues.map((c) => c.length)));
  const rowDepth = computed(() => Math.max(1, ...props.rowClues.map((r) => r.length)));

  function onPointerDown(e: PointerEvent, r: number, c: number) {
    e.preventDefault();
    selected.value = { r, c };

    const erase = e.shiftKey;
    if (erase) return emit('cell', r, c, 'erase');
    if (e.button === 2) emit('cell', r, c, 'x');
    else emit('cell', r, c, 'fill');
  }

  function isWrongFill(r: number, c: number) {
    if (!props.showMistakes || !props.solution) return false;
    return props.player[r][c] === 'fill' && props.solution[r][c] === 0;
  }

  function isWrongX(r: number, c: number) {
    if (!props.showMistakes || !props.solution) return false;
    return props.player[r][c] === 'x' && props.solution[r][c] === 1;
  }
</script>

<template>
  <div class="select-none" style="--cell: 2.5rem">
    <!-- Whole thing is a 2x2 grid: [corner | col clues] / [row clues | board] -->
    <div
      class="grid gap-2"
      :style="{
        gridTemplateColumns: `auto 1fr`,
        gridTemplateRows: `auto 1fr`,
      }"
    >
      <!-- corner: sized by rowDepth and colDepth so clue grids align -->
      <div
        class="rounded-lg bg-neutral-950/40 border border-neutral-900"
        :style="{
          width: `calc(${rowDepth} * 1.25rem)`,
          height: `calc(${colDepth} * 1.1rem)`,
        }"
      />

      <!-- column clues (grid: rows=colDepth, cols=cols) -->
      <div class="overflow-hidden">
        <div
          class="grid"
          :style="{
            gridTemplateColumns: `repeat(${cols}, var(--cell))`,
            gridTemplateRows: `repeat(${colDepth}, 1.1rem)`,
          }"
        >
          <template v-for="c in cols" :key="`col-${c}`">
            <div v-for="i in colDepth" :key="`col-${c}-r-${i}`" class="flex items-end justify-center text-[11px] text-neutral-300 leading-none">
              <!-- show from bottom -->
              {{ colClues[c - 1][colClues[c - 1].length - (colDepth - i + 1)] ?? '' }}
            </div>
          </template>
        </div>
      </div>

      <!-- row clues (grid: rows=rows, cols=rowDepth) -->
      <div class="overflow-hidden">
        <div
          class="grid"
          :style="{
            gridTemplateRows: `repeat(${rows}, var(--cell))`,
            gridTemplateColumns: `repeat(${rowDepth}, 1.25rem)`,
          }"
        >
          <template v-for="r in rows" :key="`row-${r}`">
            <div v-for="i in rowDepth" :key="`row-${r}-c-${i}`" class="flex items-center justify-end pr-1 text-[11px] text-neutral-300 leading-none">
              <!-- show from right -->
              {{ rowClues[r - 1][rowClues[r - 1].length - (rowDepth - i + 1)] ?? '' }}
            </div>
          </template>
        </div>
      </div>

      <!-- board (grid: rows x cols) -->
      <div class="overflow-hidden">
        <div
          class="grid rounded-lg bg-neutral-900/40 p-2 border border-neutral-800"
          :style="{
            gridTemplateColumns: `repeat(${cols}, var(--cell))`,
            gridTemplateRows: `repeat(${rows}, var(--cell))`,
          }"
          @contextmenu.prevent
        >
          <button
            v-for="idx in rows * cols"
            :key="idx"
            class="flex items-center justify-center rounded-sm transition active:scale-[0.98]"
            :class="
              (() => {
                const r = Math.floor((idx - 1) / cols);
                const c = (idx - 1) % cols;
                const v = player[r][c];
                const sel = selected && selected.r === r && selected.c === c;

                // thicker lines every 5
                const thickBottom = (r + 1) % 5 === 0 && r !== rows - 1;
                const thickRight = (c + 1) % 5 === 0 && c !== cols - 1;

                return [
                  'border',
                  thickBottom ? 'border-b-2' : '',
                  thickRight ? 'border-r-2' : '',
                  thickBottom || thickRight ? 'border-neutral-700' : 'border-neutral-800',

                  v === 'fill' ? 'bg-neutral-800' : 'bg-neutral-950/30',

                  // selection highlight
                  sel ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-neutral-950' : '',

                  // mistake highlighting
                  isWrongFill(r, c) ? 'bg-red-500/20 border-red-500/60' : '',
                  isWrongX(r, c) ? 'bg-orange-500/15 border-orange-500/60' : '',
                ];
              })()
            "
            @pointerdown="(e) => onPointerDown(e as PointerEvent, Math.floor((idx - 1) / cols), (idx - 1) % cols)"
          >
            <span v-if="player[Math.floor((idx - 1) / cols)][(idx - 1) % cols] === 'x'" class="text-sm opacity-70"> ✕ </span>
          </button>
        </div>
      </div>
    </div>

    <div class="mt-3 text-xs text-neutral-400">Left click: fill • Right click: X • Shift+click: erase</div>
  </div>
</template>
