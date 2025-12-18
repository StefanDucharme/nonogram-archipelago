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

  const MAX_BOARD_PX = 520;

  const cellSize = computed(() => {
    const count = Math.max(props.rows, props.cols);
    return Math.max(18, Math.floor(MAX_BOARD_PX / count));
  });

  const groupSize = 5;
  const padPx = 8; // matches p-2 = 0.5rem = 8px

  const boardW = computed(() => props.cols * cellSize.value);
  const boardH = computed(() => props.rows * cellSize.value);

  function isThick(i: number) {
    return i > 0 && i % groupSize === 0;
  }

  function onPointerDown(e: PointerEvent, r: number, c: number) {
    e.preventDefault();

    // Only left click sets "selected"
    if (e.button === 0) selected.value = { r, c };

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
  <div class="select-none" :style="{ '--cell': `${cellSize}px` }">
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
        class="bg-neutral-950/40 border border-neutral-900 invisible"
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
            gridTemplateRows: `repeat(${colDepth}, calc(var(--cell) * 0.45))`,
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
            gridTemplateColumns: `repeat(${rowDepth}, calc(var(--cell) * 0.45))`,
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
        <div class="relative p-2 bg-neutral-950/40">
          <!-- SVG Grid overlay (pixel-perfect) -->
          <svg
            class="pointer-events-none absolute"
            :style="{
              left: `${padPx}px`,
              top: `${padPx}px`,
              width: `${boardW}px`,
              height: `${boardH}px`,
            }"
            :viewBox="`0 0 ${boardW} ${boardH}`"
            shape-rendering="crispEdges"
          >
            <!-- OUTER BORDER (half-pixel inset so all sides render the same) -->
            <line x1="0.5" y1="0.5" :x2="boardW - 0.5" y2="0.5" stroke="rgba(255,255,255,0.10)" stroke-width="1" />
            <line x1="0.5" y1="0.5" x2="0.5" :y2="boardH - 0.5" stroke="rgba(255,255,255,0.10)" stroke-width="1" />
            <line x1="0.5" :y1="boardH - 0.5" :x2="boardW - 0.5" :y2="boardH - 0.5" stroke="rgba(255,255,255,0.10)" stroke-width="1" />
            <line :x1="boardW - 0.5" y1="0.5" :x2="boardW - 0.5" :y2="boardH - 0.5" stroke="rgba(255,255,255,0.10)" stroke-width="1" />

            <!-- INTERNAL vertical lines at cell boundaries -->
            <template v-for="i in cols - 1" :key="`v-${i}`">
              <line
                :x1="i * cellSize"
                y1="0"
                :x2="i * cellSize"
                :y2="boardH"
                :stroke="isThick(i) ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.10)'"
                :stroke-width="isThick(i) ? 2 : 1"
              />
            </template>

            <!-- INTERNAL horizontal lines at cell boundaries -->
            <template v-for="i in rows - 1" :key="`h-${i}`">
              <line
                x1="0"
                :y1="i * cellSize"
                :x2="boardW"
                :y2="i * cellSize"
                :stroke="isThick(i) ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.10)'"
                :stroke-width="isThick(i) ? 2 : 1"
              />
            </template>
          </svg>

          <!-- Clickable cells -->
          <div
            class="grid relative"
            :style="{
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            }"
            @contextmenu.prevent
          >
            <button
              v-for="idx in rows * cols"
              :key="idx"
              class="flex items-center justify-center transition active:scale-[0.98] hover:bg-white/5"
              :class="
                (() => {
                  const r = Math.floor((idx - 1) / cols);
                  const c = (idx - 1) % cols;
                  const v = player[r][c];
                  const sel = selected && selected.r === r && selected.c === c;

                  return [
                    // normal cell look
                    v === 'fill' ? 'bg-neutral-800' : 'bg-transparent',

                    // selection: cell itself turns blue (even if empty)
                    sel ? 'bg-blue-500/25' : '',

                    // mistakes (optional)
                    isWrongFill(r, c) ? 'bg-red-500/25' : '',
                    isWrongX(r, c) ? 'bg-orange-500/20' : '',
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
    </div>

    <div class="mt-3 text-xs text-neutral-400">Left click: fill • Right click: X • Shift+click: erase</div>
  </div>
</template>
