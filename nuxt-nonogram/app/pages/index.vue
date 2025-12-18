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
  const showDebugGrid = ref(true);
  const dragPainting = ref(true);
  const coinsPerLine = ref(1); // Coins earned per completed row/column

  // Computed values that combine user preferences with unlock state
  const effectiveShowMistakes = computed(() => showMistakes.value); // Always available, just a preference
  const canPlaceX = computed(() => items.unlocks.placeX); // X placement requires unlock
  const effectiveAutoX = computed(() => autoX.value && items.unlocks.autoX);
  const effectiveGreyHints = computed(() => greyCompletedHints.value && items.unlocks.greyHints);
  const effectiveDragPainting = computed(() => dragPainting.value && items.unlocks.dragPaint);
  const hintsHidden = computed(() => !items.unlocks.hints);
  const gameOver = computed(() => items.archipelagoMode.value && items.currentLives.value <= 0);

  // Track completed rows/columns to award coins only once
  const completedRows = ref<Set<number>>(new Set());
  const completedCols = ref<Set<number>>(new Set());

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
      }
    }
  }

  // Handle cell changes - check for mistakes
  function handleCellChange(r: number, c: number, mode: 'fill' | 'x' | 'erase') {
    // Block X placement if not unlocked
    if (mode === 'x' && !canPlaceX.value) {
      return; // Silently ignore X placement attempts
    }

    // First apply the change
    cycleCell(r, c, mode);

    // Then check for mistake (only for fill actions)
    if (mode === 'fill' && solution.value) {
      const shouldBeFilled = solution.value[r]?.[c] === 1;
      const playerFilled = player.value[r]?.[c] === 'fill';

      // If player filled a cell that should be empty, it's a mistake
      if (playerFilled && !shouldBeFilled) {
        items.loseLife();
      }
    }

    // Check for newly completed lines
    checkLineCompletions();
  }

  function checkAll() {
    if (!items.unlocks.checkMistakes) return;
    checkPulse.value = true;
    window.setTimeout(() => (checkPulse.value = false), 2000);
  }

  watchEffect(() => {
    if (solved.value) checkPuzzleSolved();
  });

  function clampInt(v: any, min: number, max: number) {
    const n = Number.parseInt(String(v ?? ''), 10);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  /** Right panel tabs */
  type RightTab = 'archipelago' | 'settings' | 'chat' | 'shop';
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
    // When locked, ensure square randomize
    if (lockSize.value) newRandom(rows.value, rows.value);
    else newRandom(rows.value, cols.value);
    // Reset lives for new puzzle
    items.resetLivesForNewPuzzle();
    // Reset completed line tracking
    completedRows.value = new Set();
    completedCols.value = new Set();
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
</script>

<template>
  <!-- Loading Screen -->
  <div v-if="isLoading" class="fixed inset-0 z-50 bg-neutral-950 flex flex-col items-center justify-center">
    <div class="text-center space-y-6">
      <div class="relative">
        <!-- Spinning loader -->
        <div class="w-16 h-16 border-4 border-neutral-700 border-t-accent-400 rounded-full animate-spin"></div>
      </div>
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-neutral-100">Archipelago Nonogram</h1>
        <p class="text-sm text-neutral-400">Loading puzzle...</p>
      </div>
    </div>
  </div>

  <div class="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
    <div class="flex flex-1">
      <!-- Main content area -->
      <div class="flex-1 max-w-6xl mx-auto p-6">
        <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
          <div class="space-y-1">
            <h1 class="text-3xl font-bold">Archipelago Nonogram</h1>
            <p class="text-sm text-neutral-400">Interactive puzzle game with multiplayer support</p>
          </div>
        </header>

        <!-- LEFT: board -->
        <div class="glass-card p-6 animate-fade-in">
          <!-- Status bar: Lives, Coins-->
          <div class="flex items-center justify-between mb-4 pb-4 border-b border-neutral-700/50">
            <div class="flex items-center gap-6">
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
                  <span v-if="!items.archipelagoMode.value" class="text-xs text-neutral-500 ml-1">(∞)</span>
                </div>
              </div>
              <!-- Coins Display -->
              <div class="flex items-center gap-2">
                <span class="text-sm text-neutral-400">Coins:</span>
                <span class="text-lg font-bold text-amber-400">🪙 {{ items.coins.value }}</span>
                <span v-if="!items.archipelagoMode.value" class="text-xs text-neutral-500">(∞)</span>
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
            <div class="flex-shrink-0">
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
                :hide-hints="hintsHidden"
                @cell="handleCellChange"
              />
            </div>

            <!-- Active Abilities Panel -->
            <div class="flex-shrink-0 w-48">
              <div class="bg-neutral-800/40 rounded-sm p-4 border border-neutral-700/50">
                <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Active Abilities</h3>
                <div class="space-y-2">
                  <!-- Place X Markers -->
                  <div class="flex items-center gap-2 text-sm" :class="items.unlocks.placeX ? 'text-lime-400' : 'text-neutral-500'">
                    <span>{{ items.unlocks.placeX ? '✓' : '🔒' }}</span>
                    <span>Place X Markers</span>
                  </div>
                  <!-- Auto X -->
                  <div class="flex items-center gap-2 text-sm" :class="effectiveAutoX ? 'text-lime-400' : 'text-neutral-500'">
                    <span>{{ items.unlocks.autoX ? (autoX ? '✓' : '○') : '🔒' }}</span>
                    <span>Auto-X Lines</span>
                  </div>
                  <!-- Grey Hints -->
                  <div class="flex items-center gap-2 text-sm" :class="effectiveGreyHints ? 'text-lime-400' : 'text-neutral-500'">
                    <span>{{ items.unlocks.greyHints ? (greyCompletedHints ? '✓' : '○') : '🔒' }}</span>
                    <span>Grey Hints</span>
                  </div>
                  <!-- Drag Paint -->
                  <div class="flex items-center gap-2 text-sm" :class="effectiveDragPainting ? 'text-lime-400' : 'text-neutral-500'">
                    <span>{{ items.unlocks.dragPaint ? (dragPainting ? '✓' : '○') : '🔒' }}</span>
                    <span>Drag Paint</span>
                  </div>
                </div>
                <div class="mt-3 pt-3 border-t border-neutral-700/50 text-xs text-neutral-500">
                  <span v-if="items.archipelagoMode.value">Unlock abilities via Archipelago</span>
                  <span v-else>Free Play - All unlocked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: sidebar attached to right side -->
      <div
        class="w-96 bg-neutral-900/95 backdrop-blur-lg border-l border-neutral-700 flex flex-col min-h-screen animate-fade-in"
        style="box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3)"
      >
        <!-- tab bar -->
        <div class="flex border-b border-neutral-700/50">
          <button class="tab-button" :class="{ active: activeTab === 'archipelago' }" @click="activeTab = 'archipelago'">Archipelago</button>
          <button class="tab-button" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">Settings</button>
          <button class="tab-button" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">Chat</button>
          <button class="tab-button" :class="{ active: activeTab === 'shop' }" @click="activeTab = 'shop'">Shop</button>
        </div>

        <!-- tab content -->
        <div class="p-6 flex-1 overflow-auto">
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
              <h3 class="section-heading">Starting Resources</h3>
              <div class="bg-neutral-800/30 rounded-sm p-4 space-y-4">
                <div class="flex items-center justify-between">
                  <label for="starting-lives" class="text-sm text-neutral-300">Starting Lives</label>
                  <input
                    id="starting-lives"
                    type="number"
                    min="1"
                    max="10"
                    class="input-field w-20 text-center text-sm"
                    v-model.number="items.baseLives.value"
                  />
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
                  />
                </div>
                <div v-if="items.extraLives.value > 0" class="text-xs text-lime-400">+{{ items.extraLives.value }} extra lives from Archipelago</div>
              </div>
            </section>

            <div class="space-y-6">
              <section class="space-y-4">
                <h3 class="section-heading">Debug</h3>
                <div class="space-y-4 bg-neutral-800/30 rounded-sm p-4">
                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" v-model="showDebugGrid" class="checkbox-field" />
                    <span class="text-sm text-neutral-200 group-hover:text-white transition-colors">Show solution grid (debug)</span>
                  </label>
                  <button type="button" class="btn-secondary w-full" @click="autoSolve()">Auto-Solve Puzzle</button>
                </div>
              </section>
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

                  <label class="flex items-center gap-3 group" :class="items.unlocks.greyHints ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'">
                    <input type="checkbox" v-model="greyCompletedHints" class="checkbox-field" :disabled="!items.unlocks.greyHints" />
                    <span class="text-sm text-neutral-200 group-hover:text-white transition-colors flex items-center gap-2">
                      <span v-if="!items.unlocks.greyHints">🔒</span>
                      Grey out completed hints
                    </span>
                  </label>

                  <label class="flex items-center gap-3 group" :class="items.unlocks.dragPaint ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'">
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
          <div v-else class="space-y-6">
            <div class="flex items-center gap-3">
              <div>
                <h2 class="font-semibold text-neutral-100">Items & Unlocks</h2>
                <p class="text-xs text-neutral-400">Archipelago items and unlock status</p>
              </div>
            </div>

            <!-- Unlocked Items -->
            <section class="space-y-3">
              <h3 class="section-heading flex items-center gap-2">
                <span class="text-lime-400">✓</span> Unlocked ({{ items.unlockedItems.value.length }})
              </h3>
              <div v-if="items.unlockedItems.value.length === 0" class="text-xs text-neutral-500 italic p-3 bg-neutral-800/20 rounded">
                No items unlocked yet
              </div>
              <div v-else class="space-y-2">
                <div v-for="item in items.unlockedItems.value" :key="item.id" class="p-3 bg-lime-500/10 border border-lime-500/20 rounded-sm">
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
                <span class="text-neutral-500">🔒</span> Locked ({{ items.lockedItems.value.length }})
              </h3>
              <div v-if="items.lockedItems.value.length === 0" class="text-xs text-lime-400 italic p-3 bg-neutral-800/20 rounded">
                All items unlocked! 🎉
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="item in items.lockedItems.value"
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

            <!-- Debug: Test Item Reception -->
            <section v-if="showDebugGrid" class="space-y-3">
              <h3 class="section-heading">Debug: Simulate Items</h3>
              <div class="bg-neutral-800/30 rounded-sm p-4 space-y-2">
                <p class="text-xs text-neutral-400 mb-3">Click to simulate receiving an item from Archipelago:</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="item in items.ITEM_REGISTRY"
                    :key="item.id"
                    class="px-2 py-1 text-xs rounded transition-colors"
                    :class="
                      items.hasItem(item.id) && item.id !== items.AP_ITEMS.EXTRA_LIFE && item.id !== items.AP_ITEMS.COINS_BUNDLE
                        ? 'bg-lime-500/20 text-lime-300 cursor-default'
                        : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200'
                    "
                    :disabled="items.hasItem(item.id) && item.id !== items.AP_ITEMS.EXTRA_LIFE && item.id !== items.AP_ITEMS.COINS_BUNDLE"
                    @click="debugReceiveItem(item.id)"
                  >
                    {{ item.name }}
                    <span v-if="item.id === items.AP_ITEMS.EXTRA_LIFE" class="text-lime-400">(+{{ items.extraLives.value }})</span>
                    <span v-if="item.id === items.AP_ITEMS.COINS_BUNDLE" class="text-amber-400">({{ items.coins.value }})</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom status bar -->
    <footer class="border-t border-neutral-700/50 bg-neutral-950/90 backdrop-blur-lg">
      <div class="max-w-6xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="status-indicator">
            <span class="status-dot" :class="statusMeta.dot"></span>
            <span class="text-neutral-400 font-medium">Archipelago</span>
            <span :class="statusMeta.text" class="font-semibold">{{ statusMeta.label }}</span>
          </div>

          <div class="text-xs text-neutral-400 truncate max-w-md" v-if="lastMessage"><span class="opacity-60">Latest:</span> {{ lastMessage }}</div>
        </div>
      </div>
    </footer>
  </div>
</template>
