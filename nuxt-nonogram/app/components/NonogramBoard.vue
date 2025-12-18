<script setup lang="ts">
  import type { Mark } from '~/utils/nonogram';

  const props = defineProps<{
    rows: number;
    cols: number;
    rowClues: number[][];
    colClues: number[][];
    player: Mark[][];
  }>();

  const emit = defineEmits<{
    (e: 'cell', r: number, c: number, mode: 'fill' | 'x' | 'erase'): void;
  }>();

  function onPointerDown(e: PointerEvent, r: number, c: number) {
    // prevent right-click menu
    e.preventDefault();

    const erase = e.shiftKey;
    if (erase) return emit('cell', r, c, 'erase');

    // 0 = left, 2 = right
    if (e.button === 2) emit('cell', r, c, 'x');
    else emit('cell', r, c, 'fill');
  }
</script>

<template>
  <div class="select-none">
    <div class="grid gap-2" :style="{ gridTemplateColumns: `auto 1fr`, gridTemplateRows: `auto 1fr` }">
      <!-- top-left empty corner -->
      <div class="w-20 h-20"></div>

      <!-- column clues -->
      <div class="overflow-hidden">
        <div class="grid" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }">
          <div v-for="(clue, c) in colClues" :key="c" class="h-20 flex flex-col justify-end items-center text-xs text-neutral-300">
            <div v-for="(n, i) in clue" :key="i" class="leading-none">
              {{ n }}
            </div>
          </div>
        </div>
      </div>

      <!-- row clues -->
      <div class="overflow-hidden">
        <div class="grid" :style="{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }">
          <div v-for="(clue, r) in rowClues" :key="r" class="h-10 w-20 pr-2 flex justify-end items-center gap-1 text-xs text-neutral-300">
            <span v-for="(n, i) in clue" :key="i" class="leading-none">
              {{ n }}
            </span>
          </div>
        </div>
      </div>

      <!-- grid -->
      <div class="overflow-hidden">
        <div
          class="grid bg-neutral-900 rounded-lg p-2"
          :style="{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }"
          @contextmenu.prevent
        >
          <button
            v-for="(_, idx) in rows * cols"
            :key="idx"
            class="aspect-square border border-neutral-800 rounded-sm flex items-center justify-center text-neutral-300 hover:border-neutral-600 active:scale-[0.98] transition"
            :class="{
              'bg-neutral-800': player[Math.floor(idx / cols)][idx % cols] === 'fill',
              'bg-neutral-900': player[Math.floor(idx / cols)][idx % cols] !== 'fill',
            }"
            @pointerdown="(e) => onPointerDown(e as PointerEvent, Math.floor(idx / cols), idx % cols)"
          >
            <span v-if="player[Math.floor(idx / cols)][idx % cols] === 'x'" class="text-sm opacity-70"> ✕ </span>
          </button>
        </div>
      </div>
    </div>

    <div class="mt-3 text-xs text-neutral-400">Left click: fill • Right click: X • Shift+click: erase</div>
  </div>
</template>
