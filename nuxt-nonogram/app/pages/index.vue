<script setup lang="ts">
  import NonogramBoard from '~/components/NonogramBoard.vue';
  import { useNonogram } from '~/composables/useNonogram';
  import { useArchipelago } from '~/composables/useArchipelago';
  import { AP_ITEMS } from '~/composables/useArchipelagoItems';

  const {
    rows,
    cols,
    fillRate,
    solution,
    player,
    rowClueNumbers,
    colClueNumbers,
    solved,
    isRowClueComplete,
    isColClueComplete,
    newRandom,
    clearPlayer,
    autoSolve,
    cycleCell,
  } = useNonogram();

  const { host, port, slot, password, status, lastMessage, messageLog, connect, disconnect, checkPuzzleSolved, debugReceiveItem, items } =
    useArchipelago();

  // Loading state
  const isLoading = ref(true);

  onMounted(() => {
    // Small delay to ensure everything is rendered
    nextTick(() => {
      isLoading.value = false;
    });
  });

  // User preference settings (these are what the user WANTS, actual behavior depends on unlocks)
  const showMistakes = ref(true);
  const checkPulse = ref(false);
  const autoX = ref(true);
  const greyCompletedHints = ref(true);
  const showDebugGrid = ref(false);
  const dragPainting = ref(true);
  const coinsPerLine = ref(1); // Coins earned per completed row/column

  // Computed values that combine user preferences with unlock state
  const effectiveShowMistakes = computed(() => showMistakes.value); // Always available, just a preference
  const canPlaceX = computed(() => items.unlocks.placeX); // X placement requires unlock
  const effectiveAutoX = computed(() => autoX.value && items.unlocks.autoX);
  const effectiveGreyHints = computed(() => greyCompletedHints.value && items.unlocks.greyHints);
  const effectiveDragPainting = computed(() => dragPainting.value && items.unlocks.dragPaint);
  const gameOver = computed(() => !items.unlimitedLives.value && items.currentLives.value <= 0);

  // Filter out consumables from unlocked/locked items display
  const unlockedNonConsumables = computed(() => items.unlockedItems.value.filter((item) => item.category !== 'consumable'));
  const lockedNonConsumables = computed(() => items.lockedItems.value.filter((item) => item.category !== 'consumable'));

  // Track completed rows/columns to award coins only once
  const completedRows = ref<Set<number>>(new Set());
  const completedCols = ref<Set<number>>(new Set());
  const hasCompletedFirstLine = ref(false); // Track if we've sent first line check this session

  // Check for newly completed rows/columns and award coins
  function checkLineCompletions() {
    if (!solution.value) return;

    // Check rows
    for (let r = 0; r < rows.value; r++) {
      if (completedRows.value.has(r)) continue;

      let rowComplete = true;
      for (let c = 0; c < cols.value; c++) {
        const shouldBeFilled = solution.value[r]?.[c] === 1;
        const playerFilled = player.value[r]?.[c] === 'fill';
        if (shouldBeFilled !== playerFilled) {
          rowComplete = false;
          break;
        }
      }

      if (rowComplete) {
        completedRows.value.add(r);
        items.addCoins(coinsPerLine.value);
        // Check for first line completion
        if (!hasCompletedFirstLine.value) {
          hasCompletedFirstLine.value = true;
          items.markFirstLineCompleted();
        }
      }
    }

    // Check columns
    for (let c = 0; c < cols.value; c++) {
      if (completedCols.value.has(c)) continue;

      let colComplete = true;
      for (let r = 0; r < rows.value; r++) {
        const shouldBeFilled = solution.value[r]?.[c] === 1;
        const playerFilled = player.value[r]?.[c] === 'fill';
        if (shouldBeFilled !== playerFilled) {
          colComplete = false;
          break;
        }
      }

      if (colComplete) {
        completedCols.value.add(c);
        items.addCoins(coinsPerLine.value);
        // Check for first line completion
        if (!hasCompletedFirstLine.value) {
          hasCompletedFirstLine.value = true;
          items.markFirstLineCompleted();
        }
      }
    }
  }

  // Handle cell changes - award coins for correct moves
  function handleCellChange(r: number, c: number, mode: 'fill' | 'x' | 'erase') {
    // Block X placement if not unlocked
    if (mode === 'x' && !canPlaceX.value) {
      return; // Silently ignore X placement attempts
    }

    if (!solution.value) return;

    const currentState = player.value[r]?.[c];
    const shouldBeFilled = solution.value[r]?.[c] === 1;

    // Block changing correct cells (can't erase or toggle off correct answers)
    const isCorrectFill = currentState === 'fill' && shouldBeFilled;
    const isCorrectX = currentState === 'x' && !shouldBeFilled;
    if (isCorrectFill || isCorrectX) {
      return; // Can't modify correct cells
    }

    // Apply the change
    cycleCell(r, c, mode);

    // Check result after change
    const newState = player.value[r]?.[c];

    // Award coins for correct placements
    if (mode === 'fill' && newState === 'fill') {
      if (shouldBeFilled) {
        items.addCoins(1); // Correct fill
      } else {
        items.loseLife(); // Mistake
      }
    } else if (mode === 'x' && newState === 'x') {
      if (!shouldBeFilled) {
        items.addCoins(1); // Correct X
      }
    }

    // Check for newly completed lines
    checkLineCompletions();
  }

  // Solve a random unsolved cell
  function solveRandomCell() {
    if (!solution.value) return false;

    // Find all unsolved cells
    const unsolvedCells: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < rows.value; r++) {
      for (let c = 0; c < cols.value; c++) {
        const currentState = player.value[r]?.[c];
        const shouldBeFilled = solution.value[r]?.[c] === 1;

        // Cell is unsolved if it's empty, or filled wrong, or x'd wrong
        if (currentState === 'empty') {
          unsolvedCells.push({ r, c });
        } else if (currentState === 'fill' && !shouldBeFilled) {
          unsolvedCells.push({ r, c });
        } else if (currentState === 'x' && shouldBeFilled) {
          unsolvedCells.push({ r, c });
        }
      }
    }

    if (unsolvedCells.length === 0) return false;

    // Pick random cell
    const randomIndex = Math.floor(Math.random() * unsolvedCells.length);
    const cell = unsolvedCells[randomIndex];
    if (!cell) return false;

    const shouldBeFilled = solution.value[cell.r]?.[cell.c] === 1;

    // Set the correct value (use cycleCell to set it)
    // First clear it if needed
    if (player.value[cell.r]?.[cell.c] !== 'empty') {
      cycleCell(cell.r, cell.c, 'erase');
    }

    if (shouldBeFilled) {
      cycleCell(cell.r, cell.c, 'fill');
    } else {
      cycleCell(cell.r, cell.c, 'x');
    }

    // Check for newly completed lines
    checkLineCompletions();
    return true;
  }

  // Use a random cell solve token
  function useRandomCellSolve() {
    if (items.useRandomCellSolve()) {
      solveRandomCell();
    }
  }

  // Buy and use a random cell solve from shop
  function buyAndUseRandomCellSolve() {
    if (items.buyRandomCellSolve()) {
      solveRandomCell();
    }
  }

  // Buy a temporary hint reveal
  function buyTempHint() {
    items.buyTempHintReveal();
  }

  // Buy difficulty increase
  function buyDifficultyIncrease() {
    if (items.buyDifficultyIncrease()) {
      // Regenerate puzzle at new difficulty
      randomize();
    }
  }

  function checkAll() {
    if (!items.unlocks.checkMistakes) return;
    checkPulse.value = true;
    window.setTimeout(() => (checkPulse.value = false), 2000);
  }

  watchEffect(() => {
    if (solved.value) {
      checkPuzzleSolved();
      items.markPuzzleCompleted();
    }
  });

  function clampInt(v: any, min: number, max: number) {
    const n = Number.parseInt(String(v ?? ''), 10);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  /** Right panel tabs */
  type RightTab = 'archipelago' | 'settings' | 'chat' | 'shop' | 'debug';
  const activeTab = ref<RightTab>('settings');

  /** Keep rows & cols equal */
  const lockSize = ref(true);
  function setRows(next: number) {
    rows.value = next;
    if (lockSize.value) cols.value = next;
  }
  function setCols(next: number) {
    cols.value = next;
    if (lockSize.value) rows.value = next;
  }

  /** If user toggles lock ON, immediately equalize */
  watch(lockSize, (on) => {
    if (on) cols.value = rows.value;
  });

  /** Bottom status indicator */
  const statusMeta = computed(() => {
    switch (status.value) {
      case 'connected':
        return { label: 'Connected', dot: 'bg-lime-400', text: 'text-lime-300' };
      case 'connecting':
        return { label: 'Connecting…', dot: 'bg-amber-400', text: 'text-amber-300' };
      case 'error':
        return { label: 'Error', dot: 'bg-red-400', text: 'text-red-300' };
      default:
        return { label: 'Disconnected', dot: 'bg-neutral-500', text: 'text-neutral-300' };
    }
  });

  function randomize() {
    // In archipelago mode, use the current difficulty setting
    const size = items.archipelagoMode.value ? items.currentDifficulty.value : rows.value;
    // When locked, ensure square randomize
    if (lockSize.value) newRandom(size, size);
    else newRandom(items.archipelagoMode.value ? size : rows.value, items.archipelagoMode.value ? size : cols.value);
    // Update rows/cols refs to match
    if (items.archipelagoMode.value) {
      rows.value = size;
      cols.value = size;
    }
    // Reset lives for new puzzle
    items.resetLivesForNewPuzzle();
    // Reset temporary hints
    items.resetTempHintsForNewPuzzle();
    // Reset completed line tracking
    completedRows.value = new Set();
    completedCols.value = new Set();
    // Select which hints to reveal for this puzzle
    items.selectRevealedHints(rows.value, cols.value);
  }

  // When Archipelago mode is enabled, generate a new puzzle so user doesn't see the hints
  watch(
    () => items.archipelagoMode.value,
    (isArchipelagoMode) => {
      if (isArchipelagoMode) {
        randomize();
      }
    },
  );

  // Debug functions
  function debugHints() {
    if (!solution.value) return;
    console.log('=== HINT DEBUG ===');
    console.log('Solution grid:');
    solution.value.forEach((row, i) => {
      console.log(`Row ${i + 1}:`, row.join(' '));
    });

    console.log('\nCalculated row hints:');
    rowClueNumbers.value.forEach((clues, i) => {
      console.log(`Row ${i + 1}:`, clues);
    });

    console.log('\nCalculated column hints:');
    colClueNumbers.value.forEach((clues, i) => {
      console.log(`Col ${i + 1}:`, clues);
    });
    console.log('==================');
  }

  function copyDebugInfo() {
    if (!solution.value) {
      console.log('No solution available');
      return;
    }

    let output = '=== DEBUG INFO ===\n\n';
    output += 'Solution rows (0=empty, 1=fill) → rowClues prop:\n';
    solution.value.forEach((row, r) => {
      output += `R${r + 1}: [${row.join(',')}] → [${rowClueNumbers.value[r]?.join(', ') || '?'}]\n`;
    });

    output += '\nColumn hints (colClues prop):\n';
    colClueNumbers.value.forEach((clues, c) => {
      output += `C${c + 1}: [${clues.join(', ')}]\n`;
    });

    console.log('Debug output:', output);

    try {
      navigator.clipboard
        .writeText(output)
        .then(() => {
          console.log('Copied to clipboard!');
          alert('Debug info copied to clipboard!');
        })
        .catch((err) => {
          console.error('Clipboard write failed:', err);
          alert('Failed to copy. Check console for debug info.');
        });
    } catch (err) {
      console.error('Clipboard error:', err);
      alert('Failed to copy. Check console for debug info.');
    }
  }
</script>

<template>
  <!-- Loading Screen -->
  <div v-if="isLoading" class="fixed inset-0 z-50 bg-neutral-950 flex flex-col items-center justify-center">
    <div class="text-center space-y-6">
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-neutral-100">Archipelago Nonogram</h1>
        <p class="text-sm text-neutral-400">Loading puzzle...</p>
      </div>
    </div>
  </div>

  <div class="h-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-hidden">
    <div class="flex flex-1 min-h-0">
      <!-- Main content area -->
      <div class="flex-1 px-6 overflow-auto">
        <!-- LEFT: board -->
        <div class="glass-card p-6 animate-fade-in">
          <!-- Status bar: Lives, Coins-->
          <div class="flex items-center justify-between mb-4 pb-4 border-b border-neutral-700/50">
            <div class="flex items-center gap-6">
              <div class="flex items-center gap-2">
                <span class="text-sm text-neutral-400">Archipelago Nonogram</span>
              </div>
              <!-- Lives Display -->
              <div class="flex items-center gap-2">
                <span class="text-sm text-neutral-400">Lives:</span>
                <div class="flex items-center gap-0.5">
                  <span
                    v-for="i in items.maxLives.value"
                    :key="i"
                    class="text-lg"
                    :class="i <= items.currentLives.value ? 'text-red-400' : 'text-neutral-600'"
                  >
                    ♥
                  </span>
                  <span v-if="items.unlimitedLives.value" class="text-xs text-neutral-500 ml-1">(∞)</span>
                </div>
              </div>
              <!-- Coins Display -->
              <div class="flex items-center gap-2">
                <span class="text-sm text-neutral-400">Coins:</span>
                <span class="text-lg font-bold text-amber-400">🪙 {{ items.coins.value }}</span>
                <span v-if="items.unlimitedCoins.value" class="text-xs text-neutral-500">(∞)</span>
              </div>
            </div>
          </div>

          <div
            v-if="solved"
            class="mb-6 p-4 rounded-sm border border-accent-500/40 bg-accent-500/10 text-accent-200 celebration-glow animate-slide-up"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">🎉</span>
                <div>
                  <div class="font-semibold">Puzzle Solved!</div>
                  <div class="text-sm text-accent-300/80">Congratulations on completing the nonogram!</div>
                </div>
              </div>
              <button type="button" class="btn-primary" @click="randomize()">New Puzzle</button>
            </div>
          </div>

          <!-- Game Over Message -->
          <div v-if="gameOver && !solved" class="mb-6 p-4 rounded-sm border border-red-500/40 bg-red-500/10 text-red-200 animate-slide-up">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">💔</span>
                <div>
                  <div class="font-semibold">Game Over!</div>
                  <div class="text-sm text-red-300/80">You ran out of lives. Try again?</div>
                </div>
              </div>
              <button type="button" class="btn-primary" @click="randomize()">New Puzzle</button>
            </div>
          </div>

          <div class="flex gap-6">
            <!-- Grid -->
            <div class="shrink-0">
              <NonogramBoard
                :rows="rows"
                :cols="cols"
                :row-clues="rowClueNumbers"
                :col-clues="colClueNumbers"
                :player="player"
                :solution="solution"
                :show-mistakes="effectiveShowMistakes || checkPulse"
                :auto-x="effectiveAutoX"
                :grey-completed-hints="effectiveGreyHints"
                :is-row-clue-complete="isRowClueComplete"
                :is-col-clue-complete="isColClueComplete"
                :show-debug-grid="showDebugGrid"
                :drag-painting="effectiveDragPainting"
                :is-row-hint-revealed="items.isRowHintRevealed"
                :is-col-hint-revealed="items.isColHintRevealed"
                @cell="handleCellChange"
              />
            </div>

            <!-- Solution Grid (debug) -->
            <div v-if="showDebugGrid && solution" class="shrink-0">
              <div class="bg-neutral-800/40 rounded-sm p-4 border border-neutral-700/50 select-text">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Solution (Debug)</h3>
                  <div class="flex gap-2">
                    <button @click="copyDebugInfo" class="px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded">
                      Copy Debug
                    </button>
                    <button @click="debugHints" class="px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded">
                      Log Hints
                    </button>
                  </div>
                </div>

                <!-- Visual grid -->
                <div class="flex mb-4">
                  <!-- Row numbers -->
                  <div class="flex flex-col mr-1">
                    <!-- Spacer for column header row -->
                    <div class="h-3 mb-1"></div>
                    <div v-for="r in rows" :key="`row-num-${r}`" class="h-3 text-[8px] text-neutral-500 flex items-center justify-end pr-1">
                      {{ r }}
                    </div>
                  </div>
                  <!-- Grid -->
                  <div>
                    <!-- Column numbers -->
                    <div class="flex mb-1">
                      <div v-for="c in cols" :key="`col-num-${c}`" class="w-3 text-[8px] text-neutral-500 text-center">
                        {{ c }}
                      </div>
                    </div>
                    <div
                      class="grid gap-0 border border-neutral-600"
                      :style="{
                        gridTemplateColumns: `repeat(${cols}, 12px)`,
                        gridTemplateRows: `repeat(${rows}, 12px)`,
                      }"
                    >
                      <div v-for="(row, r) in solution" :key="`debug-row-${r}`" class="contents">
                        <div
                          v-for="(cell, c) in row"
                          :key="`debug-${r}-${c}`"
                          class="border-r border-b border-neutral-700"
                          :class="cell === 1 ? 'bg-neutral-400' : 'bg-transparent'"
                          :style="{
                            borderRightWidth: c === cols - 1 ? '0' : '1px',
                            borderBottomWidth: r === rows - 1 ? '0' : '1px',
                          }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Show each row's raw solution data + computed hints side by side -->
                <div class="text-[10px] text-neutral-400 font-mono space-y-1">
                  <div class="text-neutral-500 mb-2">Row data: [solution cells] → [computed hints]</div>
                  <div v-for="(row, r) in solution" :key="`debug-row-data-${r}`" class="flex items-center gap-2">
                    <span class="text-neutral-500 w-8">R{{ r + 1 }}:</span>
                    <span class="text-neutral-300">[{{ row.join(',') }}]</span>
                    <span class="text-neutral-500">→</span>
                    <span class="text-amber-400">[{{ rowClueNumbers[r]?.join(', ') || '?' }}]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: sidebar attached to right side -->
      <div
        class="w-1/3 shrink-0 bg-neutral-900/95 backdrop-blur-lg border-l border-neutral-700 flex h-full animate-fade-in"
        style="box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3)"
      >
        <!-- Active Abilities Panel - left side of right panel -->
        <div class="w-44 shrink-0 p-3 border-r border-neutral-700/50 bg-neutral-900/95 overflow-auto">
          <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Abilities</h3>
          <div class="space-y-2">
            <!-- Place X Markers -->
            <div class="flex items-center gap-1.5 text-xs" :class="items.unlocks.placeX ? 'text-lime-400' : 'text-neutral-500'">
              <span>{{ items.unlocks.placeX ? '✓' : '🔒' }}</span>
              <span>Place X</span>
            </div>
            <!-- Auto X -->
            <div class="flex items-center gap-1.5 text-xs" :class="effectiveAutoX ? 'text-lime-400' : 'text-neutral-500'">
              <span>{{ items.unlocks.autoX ? (autoX ? '✓' : '○') : '🔒' }}</span>
              <span>Auto-X</span>
            </div>
            <!-- Grey Hints -->
            <div class="flex items-center gap-1.5 text-xs" :class="effectiveGreyHints ? 'text-lime-400' : 'text-neutral-500'">
              <span>{{ items.unlocks.greyHints ? (greyCompletedHints ? '✓' : '○') : '🔒' }}</span>
              <span>Grey Hints</span>
            </div>
            <!-- Drag Paint -->
            <div class="flex items-center gap-1.5 text-xs" :class="effectiveDragPainting ? 'text-lime-400' : 'text-neutral-500'">
              <span>{{ items.unlocks.dragPaint ? (dragPainting ? '✓' : '○') : '🔒' }}</span>
              <span>Drag Paint</span>
            </div>
            <!-- Hint Reveals -->
            <div
              class="flex items-center gap-1.5 text-xs"
              :class="items.totalHintReveals.value > 0 || !items.archipelagoMode.value ? 'text-lime-400' : 'text-neutral-500'"
            >
              <span>{{ items.archipelagoMode.value ? items.totalHintReveals.value : '∞' }}</span>
              <span>Hints</span>
            </div>
            <!-- Difficulty -->
            <div v-if="items.archipelagoMode.value" class="flex items-center gap-1.5 text-xs text-purple-400">
              <span>{{ items.currentDifficulty.value }}x{{ items.currentDifficulty.value }}</span>
              <span>Grid</span>
            </div>
          </div>

          <!-- Checks Section -->
          <div v-if="items.archipelagoMode.value" class="mt-3 pt-3 border-t border-neutral-700/50">
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Checks</h3>
            <div class="space-y-1">
              <div
                v-for="loc in items.LOCATION_REGISTRY"
                :key="loc.id"
                class="flex items-center gap-1.5 text-[10px]"
                :class="items.isLocationCompleted(loc.id) ? 'text-lime-400' : 'text-neutral-600'"
              >
                <span>{{ items.isLocationCompleted(loc.id) ? '✓' : '○' }}</span>
                <span>{{ loc.name }}</span>
              </div>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-neutral-700/50 text-[10px] text-neutral-500 leading-tight">
            <span v-if="items.archipelagoMode.value">Unlock via AP</span>
            <span v-else>Free Play</span>
          </div>
        </div>

        <!-- Right side: tabs and content -->
        <div class="flex-1 flex flex-col min-w-0">
          <!-- tab bar -->
          <div class="flex border-b border-neutral-700/50 shrink-0">
            <button class="tab-button" :class="{ active: activeTab === 'archipelago' }" @click="activeTab = 'archipelago'">Archipelago</button>
            <button class="tab-button" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">Settings</button>
            <button class="tab-button" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">Chat</button>
            <button class="tab-button" :class="{ active: activeTab === 'shop' }" @click="activeTab = 'shop'">Shop</button>
            <button class="tab-button" :class="{ active: activeTab === 'debug' }" @click="activeTab = 'debug'">Debug</button>
          </div>

          <!-- tab content -->
          <div class="p-4 flex-1 overflow-auto">
            <!-- SETTINGS -->
            <div v-if="activeTab === 'settings'" class="space-y-6">
              <div class="flex items-center gap-3 mb-6">
                <div>
                  <h2 class="font-semibold text-neutral-100">Game Settings</h2>
                  <p class="text-xs text-neutral-400">Customize your puzzle experience</p>
                </div>
              </div>

              <!-- Archipelago Mode Indicator -->
              <div v-if="items.archipelagoMode.value" class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-sm">
                <div class="flex items-center gap-2 text-amber-300 text-sm">
                  <span>🔒</span>
                  <span>Archipelago Mode - Some features are locked until rewarded</span>
                </div>
              </div>

              <!-- Mode Toggle -->
              <div class="bg-neutral-800/30 rounded-sm p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-sm font-medium text-neutral-200">Archipelago Mode</div>
                    <div class="text-xs text-neutral-400">Lock features until received from AP</div>
                  </div>
                  <button
                    class="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    :class="
                      items.archipelagoMode.value
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-neutral-600/30 text-neutral-300 hover:bg-neutral-600/50'
                    "
                    @click="items.archipelagoMode.value ? items.disableArchipelagoMode() : items.enableArchipelagoMode()"
                  >
                    {{ items.archipelagoMode.value ? 'Disable' : 'Enable' }}
                  </button>
                </div>
              </div>

              <!-- Starting Resources -->
              <section class="space-y-3">
                <h3 class="section-heading">Resources</h3>
                <div class="bg-neutral-800/30 rounded-sm p-4 space-y-4" :class="{ 'opacity-60': items.archipelagoMode.value }">
                  <!-- Lock notice for Archipelago mode -->
                  <div v-if="items.archipelagoMode.value" class="text-xs text-amber-300/70 mb-2">
                    🔒 Resource settings are locked in Archipelago mode
                  </div>
                  <!-- Unlimited toggles -->
                  <label class="flex items-center gap-3 group" :class="items.archipelagoMode.value ? 'cursor-not-allowed' : 'cursor-pointer'">
                    <input type="checkbox" v-model="items.unlimitedLives.value" class="checkbox-field" :disabled="items.archipelagoMode.value" />
                    <span class="text-sm text-neutral-200 group-hover:text-white transition-colors">Unlimited Lives</span>
                  </label>
                  <label class="flex items-center gap-3 group" :class="items.archipelagoMode.value ? 'cursor-not-allowed' : 'cursor-pointer'">
                    <input type="checkbox" v-model="items.unlimitedCoins.value" class="checkbox-field" :disabled="items.archipelagoMode.value" />
                    <span class="text-sm text-neutral-200 group-hover:text-white transition-colors">Unlimited Coins</span>
                  </label>

                  <div class="border-t border-neutral-700/50 pt-4">
                    <div class="flex items-center justify-between">
                      <label for="starting-lives" class="text-sm text-neutral-300">Starting Lives</label>
                      <input
                        id="starting-lives"
                        type="number"
                        min="1"
                        max="10"
                        class="input-field w-20 text-center text-sm"
                        v-model.number="items.baseLives.value"
                        :disabled="items.archipelagoMode.value"
                      />
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <label for="starting-coins" class="text-sm text-neutral-300">Starting Coins</label>
                    <input
                      id="starting-coins"
                      type="number"
                      min="0"
                      max="100"
                      class="input-field w-20 text-center text-sm"
                      v-model.number="items.startingCoins.value"
                      :disabled="items.archipelagoMode.value"
                    />
                  </div>
                  <div class="flex items-center justify-between">
                    <label for="starting-hints" class="text-sm text-neutral-300">Starting Hints Revealed</label>
                    <input
                      id="starting-hints"
                      type="number"
                      min="0"
                      max="20"
                      class="input-field w-20 text-center text-sm"
                      v-model.number="items.startingHintReveals.value"
                      :disabled="items.archipelagoMode.value"
                    />
                  </div>
                  <div class="flex items-center justify-between">
                    <label for="coins-per-line" class="text-sm text-neutral-300">Coins per Line</label>
                    <input
                      id="coins-per-line"
                      type="number"
                      min="0"
                      max="10"
                      class="input-field w-20 text-center text-sm"
                      v-model.number="coinsPerLine"
                      :disabled="items.archipelagoMode.value"
                    />
                  </div>
                  <div class="flex items-center justify-between">
                    <label for="coins-per-bundle" class="text-sm text-neutral-300">Coins per Bundle</label>
                    <input
                      id="coins-per-bundle"
                      type="number"
                      min="1"
                      max="50"
                      class="input-field w-20 text-center text-sm"
                      v-model.number="items.coinsPerBundle.value"
                      :disabled="items.archipelagoMode.value"
                    />
                  </div>
                  <div v-if="items.extraLives.value > 0" class="text-xs text-lime-400">
                    +{{ items.extraLives.value }} extra lives from Archipelago
                  </div>
                </div>
              </section>

              <div class="space-y-6">
                <!-- Game Display -->
                <section class="space-y-4">
                  <h3 class="section-heading">Behaviour</h3>
                  <div class="space-y-4 bg-neutral-800/30 rounded-sm p-4">
                    <label class="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" v-model="showMistakes" class="checkbox-field" />
                      <span class="text-sm text-neutral-200 group-hover:text-white transition-colors"> Show mistakes in real-time </span>
                    </label>

                    <label class="flex items-center gap-3 group" :class="items.unlocks.autoX ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'">
                      <input type="checkbox" v-model="autoX" class="checkbox-field" :disabled="!items.unlocks.autoX" />
                      <span class="text-sm text-neutral-200 group-hover:text-white transition-colors flex items-center gap-2">
                        <span v-if="!items.unlocks.autoX">🔒</span>
                        Auto-X completed rows/columns
                      </span>
                    </label>

                    <label
                      class="flex items-center gap-3 group"
                      :class="items.unlocks.greyHints ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'"
                    >
                      <input type="checkbox" v-model="greyCompletedHints" class="checkbox-field" :disabled="!items.unlocks.greyHints" />
                      <span class="text-sm text-neutral-200 group-hover:text-white transition-colors flex items-center gap-2">
                        <span v-if="!items.unlocks.greyHints">🔒</span>
                        Grey out completed hints
                      </span>
                    </label>

                    <label
                      class="flex items-center gap-3 group"
                      :class="items.unlocks.dragPaint ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'"
                    >
                      <input type="checkbox" v-model="dragPainting" class="checkbox-field" :disabled="!items.unlocks.dragPaint" />
                      <span class="text-sm text-neutral-200 group-hover:text-white transition-colors flex items-center gap-2">
                        <span v-if="!items.unlocks.dragPaint">🔒</span>
                        Click and drag to paint cells
                      </span>
                    </label>
                  </div>
                </section>
                <!-- Puzzle Dimensions -->
                <section class="space-y-4">
                  <h3 class="section-heading">Puzzle Dimensions</h3>
                  <div class="space-y-4 bg-neutral-800/30 rounded-sm p-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-2">
                        <label for="rows" class="block text-xs font-medium text-neutral-300">Rows</label>
                        <input
                          id="rows"
                          type="number"
                          min="5"
                          max="50"
                          class="input-field"
                          :value="rows"
                          @change="(e:any) => setRows(clampInt(e.target.value, 5, 50))"
                        />
                      </div>
                      <div class="space-y-2">
                        <label for="cols" class="block text-xs font-medium text-neutral-300">Columns</label>
                        <input
                          id="cols"
                          type="number"
                          min="5"
                          max="50"
                          class="input-field"
                          :value="cols"
                          :disabled="lockSize"
                          @change="(e:any) => setCols(clampInt(e.target.value, 5, 50))"
                        />
                      </div>
                    </div>

                    <label class="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" v-model="lockSize" class="checkbox-field" />
                      <span class="text-sm text-neutral-200 group-hover:text-white transition-colors">Lock aspect ratio (square puzzles) </span>
                    </label>
                  </div>
                </section>
                <!-- Puzzle Generation -->
                <section class="space-y-4">
                  <h3 class="section-heading">Puzzle Generation</h3>
                  <div class="space-y-4 bg-neutral-800/30 rounded-sm p-4">
                    <div class="space-y-3">
                      <div class="flex items-center justify-between">
                        <label for="fill-rate" class="text-xs font-medium text-neutral-300"> Fill Density </label>
                        <div class="flex items-center gap-2">
                          <span class="px-2 py-1 bg-neutral-600/30 text-neutral-300 rounded-md text-xs font-medium">
                            {{ Math.round(fillRate * 100) }}%
                          </span>
                        </div>
                      </div>
                      <input id="fill-rate" type="range" min="0.2" max="0.7" step="0.01" v-model.number="fillRate" class="slider w-full" />
                      <div class="flex justify-between text-2xs text-neutral-500">
                        <span>Sparse (20%)</span>
                        <span>Dense (70%)</span>
                      </div>
                    </div>

                    <button type="button" class="btn-primary w-full" @click="randomize()">Generate New Puzzle</button>
                  </div>
                </section>
                <!-- Game Actions -->
                <section class="space-y-4">
                  <h3 class="section-heading">Game Actions</h3>
                  <div class="bg-neutral-800/30 rounded-sm p-4">
                    <button type="button" class="btn-destructive w-full" @click="clearPlayer()">Clear Progress</button>
                  </div>
                </section>
              </div>
            </div>

            <!-- ARCHIPELAGO -->
            <div v-else-if="activeTab === 'archipelago'" class="space-y-6">
              <div class="flex items-center gap-3">
                <div>
                  <h2 class="font-semibold text-neutral-100">Archipelago Connection</h2>
                  <p class="text-xs text-neutral-400">Connect to multiplayer server</p>
                </div>
              </div>

              <div class="bg-neutral-800/30 rounded-sm p-4 space-y-4">
                <p class="text-xs text-neutral-400">Enter your server details</p>

                <div class="space-y-3">
                  <div class="space-y-1">
                    <label class="text-xs font-medium text-neutral-300">Host</label>
                    <input v-model="host" class="input-field" placeholder="localhost" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs font-medium text-neutral-300">Port</label>
                    <input v-model.number="port" class="input-field" placeholder="38281" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs font-medium text-neutral-300">Player Name</label>
                    <input v-model="slot" class="input-field" placeholder="Your player name" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs font-medium text-neutral-300">Password</label>
                    <input v-model="password" type="password" class="input-field" placeholder="Optional password" />
                  </div>
                </div>

                <div class="flex gap-3 pt-2">
                  <button class="btn-primary flex-1" @click="connect()" :disabled="status === 'connected' || status === 'connecting'">
                    {{ status === 'connecting' ? 'Connecting…' : 'Connect' }}
                  </button>
                  <button class="btn-secondary" @click="disconnect()" :disabled="status !== 'connected'">Disconnect</button>
                </div>

                <div v-if="lastMessage" class="mt-4 p-3 bg-neutral-900/50 rounded-lg border border-neutral-600">
                  <div class="text-xs text-neutral-300">
                    {{ lastMessage }}
                  </div>
                </div>
              </div>
            </div>

            <!-- CHAT -->
            <div v-else-if="activeTab === 'chat'" class="space-y-6">
              <div class="flex items-center gap-3">
                <div>
                  <h2 class="font-semibold text-neutral-100">Game Log</h2>
                  <p class="text-xs text-neutral-400">Messages and events</p>
                </div>
              </div>

              <div class="bg-neutral-800/30 rounded-sm h-64 overflow-hidden">
                <div class="h-full p-4 overflow-auto custom-scrollbar">
                  <div v-if="messageLog.length === 0" class="flex items-center justify-center h-full text-xs text-neutral-500">
                    <div class="text-center space-y-2">
                      <div>No messages yet</div>
                      <div class="text-2xs">Game events will appear here</div>
                    </div>
                  </div>
                  <div v-else class="space-y-2">
                    <div
                      v-for="(msg, idx) in messageLog"
                      :key="idx"
                      class="text-xs py-1 border-b border-neutral-700/30 last:border-0"
                      :class="{
                        'text-lime-300': msg.type === 'item',
                        'text-red-300': msg.type === 'error',
                        'text-blue-300': msg.type === 'chat',
                        'text-neutral-400': msg.type === 'info',
                      }"
                    >
                      <span class="text-neutral-600 mr-2">{{ msg.time.toLocaleTimeString() }}</span>
                      {{ msg.text }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SHOP / ITEMS -->
            <div v-else-if="activeTab === 'shop'" class="space-y-6">
              <div class="flex items-center gap-3">
                <div>
                  <h2 class="font-semibold text-neutral-100">Shop & Items</h2>
                  <p class="text-xs text-neutral-400">Spend coins and use items</p>
                </div>
              </div>

              <!-- Current Resources -->
              <section class="space-y-3">
                <h3 class="section-heading">Your Resources</h3>
                <div class="bg-neutral-800/30 rounded-sm p-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div class="flex items-center gap-2">
                      <span class="text-lg">🪙</span>
                      <div>
                        <div class="text-lg font-bold text-amber-400">{{ items.coins.value }}</div>
                        <div class="text-xs text-neutral-500">Coins</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-lg">🎯</span>
                      <div>
                        <div class="text-lg font-bold text-cyan-400">{{ items.randomCellSolves.value }}</div>
                        <div class="text-xs text-neutral-500">Cell Solves</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Use Items -->
              <section class="space-y-3">
                <h3 class="section-heading">Use Items</h3>
                <div class="bg-neutral-800/30 rounded-sm p-4 space-y-3">
                  <button
                    class="w-full px-4 py-3 rounded text-sm font-medium transition-colors flex items-center justify-between"
                    :class="
                      items.randomCellSolves.value > 0
                        ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                        : 'bg-neutral-700/30 text-neutral-500 cursor-not-allowed'
                    "
                    :disabled="items.randomCellSolves.value <= 0"
                    @click="useRandomCellSolve()"
                  >
                    <span>🎯 Solve Random Cell</span>
                    <span class="text-xs opacity-70">{{ items.randomCellSolves.value }} available</span>
                  </button>
                </div>
              </section>

              <!-- Shop -->
              <section class="space-y-3">
                <h3 class="section-heading">Shop</h3>
                <div class="bg-neutral-800/30 rounded-sm p-4 space-y-3">
                  <!-- Random Cell Solve -->
                  <button
                    class="w-full px-4 py-3 rounded text-sm font-medium transition-colors flex items-center justify-between"
                    :class="
                      items.coins.value >= items.RANDOM_CELL_SOLVE_COST
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-neutral-700/30 text-neutral-500 cursor-not-allowed'
                    "
                    :disabled="items.coins.value < items.RANDOM_CELL_SOLVE_COST"
                    @click="buyAndUseRandomCellSolve()"
                  >
                    <span>🎯 Buy & Use Random Cell Solve</span>
                    <span class="text-xs">🪙 {{ items.RANDOM_CELL_SOLVE_COST }}</span>
                  </button>

                  <!-- Temporary Hint Reveal (only in AP mode) -->
                  <button
                    v-if="items.archipelagoMode.value"
                    class="w-full px-4 py-3 rounded text-sm font-medium transition-colors flex items-center justify-between"
                    :class="
                      items.coins.value >= items.TEMP_HINT_COST.value
                        ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                        : 'bg-neutral-700/30 text-neutral-500 cursor-not-allowed'
                    "
                    :disabled="items.coins.value < items.TEMP_HINT_COST.value"
                    @click="buyTempHint()"
                  >
                    <div class="text-left">
                      <span>👁️ Temporary Hint Reveal</span>
                      <div class="text-[10px] opacity-70">Reveals 1 hint (this puzzle only)</div>
                    </div>
                    <span class="text-xs">🪙 {{ items.TEMP_HINT_COST.value }}</span>
                  </button>

                  <!-- Increase Difficulty (only in AP mode) -->
                  <button
                    v-if="items.archipelagoMode.value"
                    class="w-full px-4 py-3 rounded text-sm font-medium transition-colors flex items-center justify-between"
                    :class="
                      items.coins.value >= items.DIFFICULTY_INCREASE_COST.value
                        ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-neutral-700/30 text-neutral-500 cursor-not-allowed'
                    "
                    :disabled="items.coins.value < items.DIFFICULTY_INCREASE_COST.value"
                    @click="buyDifficultyIncrease()"
                  >
                    <div class="text-left">
                      <span>📈 Increase Difficulty</span>
                      <div class="text-[10px] opacity-70">
                        {{ items.currentDifficulty.value }}x{{ items.currentDifficulty.value }} →
                        {{ items.currentDifficulty.value + items.DIFFICULTY_STEP }}x{{ items.currentDifficulty.value + items.DIFFICULTY_STEP }}
                      </div>
                    </div>
                    <span class="text-xs">🪙 {{ items.DIFFICULTY_INCREASE_COST.value }}</span>
                  </button>
                </div>
              </section>

              <!-- Unlocked Items -->
              <section class="space-y-3">
                <h3 class="section-heading flex items-center gap-2">
                  <span class="text-lime-400">✓</span> Unlocked ({{ unlockedNonConsumables.length }})
                </h3>
                <div v-if="unlockedNonConsumables.length === 0" class="text-xs text-neutral-500 italic p-3 bg-neutral-800/20 rounded">
                  No items unlocked yet
                </div>
                <div v-else class="space-y-2">
                  <div v-for="item in unlockedNonConsumables" :key="item.id" class="p-3 bg-lime-500/10 border border-lime-500/20 rounded-sm">
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="text-sm font-medium text-lime-300">{{ item.name }}</div>
                        <div class="text-xs text-neutral-400">{{ item.description }}</div>
                      </div>
                      <span class="px-2 py-0.5 bg-lime-500/20 text-lime-300 rounded text-xs">{{ item.category }}</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Locked Items -->
              <section class="space-y-3">
                <h3 class="section-heading flex items-center gap-2">
                  <span class="text-neutral-500">🔒</span> Locked ({{ lockedNonConsumables.length }})
                </h3>
                <div v-if="lockedNonConsumables.length === 0" class="text-xs text-lime-400 italic p-3 bg-neutral-800/20 rounded">
                  All items unlocked! 🎉
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="item in lockedNonConsumables"
                    :key="item.id"
                    class="p-3 bg-neutral-800/30 border border-neutral-700/30 rounded-sm opacity-60"
                  >
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="text-sm font-medium text-neutral-300">{{ item.name }}</div>
                        <div class="text-xs text-neutral-500">{{ item.description }}</div>
                      </div>
                      <span class="px-2 py-0.5 bg-neutral-700/30 text-neutral-500 rounded text-xs">{{ item.category }}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <!-- DEBUG -->
            <div v-else class="space-y-6">
              <div class="flex items-center gap-3">
                <div>
                  <h2 class="font-semibold text-neutral-100">Debug Tools</h2>
                  <p class="text-xs text-neutral-400">Development and testing options</p>
                </div>
              </div>

              <!-- Debug Display -->
              <section class="space-y-3">
                <h3 class="section-heading">Display Options</h3>
                <div class="bg-neutral-800/30 rounded-sm p-4 space-y-4">
                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" v-model="showDebugGrid" class="checkbox-field" />
                    <span class="text-sm text-neutral-200 group-hover:text-white transition-colors">Show solution grid (debug)</span>
                  </label>
                </div>
              </section>

              <!-- Debug Actions -->
              <section class="space-y-3">
                <h3 class="section-heading">Actions</h3>
                <div class="bg-neutral-800/30 rounded-sm p-4 space-y-3">
                  <button type="button" class="btn-secondary w-full" @click="autoSolve()">Auto-Solve Puzzle</button>
                </div>
              </section>

              <!-- Simulate Items -->
              <section class="space-y-3">
                <h3 class="section-heading">Simulate Items</h3>
                <div class="bg-neutral-800/30 rounded-sm p-4 space-y-2">
                  <p class="text-xs text-neutral-400 mb-3">Click to simulate receiving an item from Archipelago:</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="item in items.ITEM_REGISTRY"
                      :key="item.id"
                      class="px-2 py-1 text-xs rounded transition-colors"
                      :class="
                      items.hasItem(item.id) && ![items.AP_ITEMS.EXTRA_LIFE, items.AP_ITEMS.COINS_BUNDLE, items.AP_ITEMS.UNLOCK_HINTS, items.AP_ITEMS.SOLVE_RANDOM_CELL].includes(item.id as any)
                        ? 'bg-lime-500/20 text-lime-300 cursor-default'
                        : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200'
                    "
                      :disabled="items.hasItem(item.id) && ![items.AP_ITEMS.EXTRA_LIFE, items.AP_ITEMS.COINS_BUNDLE, items.AP_ITEMS.UNLOCK_HINTS, items.AP_ITEMS.SOLVE_RANDOM_CELL].includes(item.id as any)"
                      @click="debugReceiveItem(item.id)"
                    >
                      {{ item.name }}
                      <span v-if="item.id === items.AP_ITEMS.EXTRA_LIFE" class="text-lime-400"></span>
                      <span v-if="item.id === items.AP_ITEMS.COINS_BUNDLE" class="text-amber-400"></span>
                      <span v-if="item.id === items.AP_ITEMS.UNLOCK_HINTS" class="text-purple-400"></span>
                      <span v-if="item.id === items.AP_ITEMS.SOLVE_RANDOM_CELL" class="text-cyan-400"></span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom status bar -->
    <footer class="shrink-0 border-t border-neutral-700/50 bg-neutral-950/90 backdrop-blur-lg">
      <div class="px-6 py-3">
        <div class="flex items-center gap-4">
          <!-- Left side: Status indicator and controls info -->
          <div class="flex items-center gap-4 w-1/2">
            <div class="status-indicator shrink-0">
              <span class="status-dot" :class="statusMeta.dot"></span>
              <span class="text-neutral-400 font-medium">Archipelago</span>
              <span :class="statusMeta.text" class="font-semibold">{{ statusMeta.label }}</span>
            </div>
            <div class="text-xs text-neutral-500 hidden lg:block">
              Left click: fill &nbsp;&nbsp;•&nbsp;&nbsp; Right click: X &nbsp;&nbsp;•&nbsp;&nbsp; Shift+click or click again: erase
            </div>
          </div>

          <!-- Right side: Latest message (always takes half) -->
          <div class="w-1/2 text-xs text-neutral-400 truncate text-right">
            <span v-if="lastMessage" :key="lastMessage" class="inline-block animate-message-flash">
              <span class="opacity-60">Latest:</span> {{ lastMessage }}
            </span>
            <span v-else class="opacity-40">No messages</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
