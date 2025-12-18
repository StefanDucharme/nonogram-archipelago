<script setup lang="ts">
  import NonogramBoard from '~/components/NonogramBoard.vue';
  import { useNonogram } from '~/composables/useNonogram';
  import { useArchipelago } from '~/composables/useArchipelago';

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
    cycleCell,
  } = useNonogram();

  const { host, port, slot, password, status, lastMessage, connect, disconnect, checkPuzzleSolved } = useArchipelago();

  const showMistakes = ref(true);
  const checkPulse = ref(false);
  const autoX = ref(true);
  const greyCompletedHints = ref(true);
  const showDebugGrid = ref(true);
  const dragPainting = ref(true);

  function checkAll() {
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
  }
</script>

<template>
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
          <NonogramBoard
            :rows="rows"
            :cols="cols"
            :row-clues="rowClueNumbers"
            :col-clues="colClueNumbers"
            :player="player"
            :solution="solution"
            :show-mistakes="showMistakes || checkPulse"
            :auto-x="autoX"
            :grey-completed-hints="greyCompletedHints"
            :is-row-clue-complete="isRowClueComplete"
            :is-col-clue-complete="isColClueComplete"
            :show-debug-grid="showDebugGrid"
            :drag-painting="dragPainting"
            @cell="cycleCell"
          />

          <div
            v-if="solved"
            class="mt-6 p-4 rounded-sm border border-accent-500/40 bg-accent-500/10 text-accent-200 celebration-glow animate-slide-up"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🎉</span>
              <div>
                <div class="font-semibold">Puzzle Solved!</div>
                <div class="text-sm text-accent-300/80">Congratulations on completing the nonogram!</div>
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

            <div>
              <button type="button" class="btn-secondary w-full" @click="checkAll()">Check for Mistakes</button>
            </div>

            <div class="space-y-6">
              <!-- Game Display -->
              <section class="space-y-4">
                <h3 class="section-heading">Behaviour</h3>
                <div class="space-y-4 bg-neutral-800/30 rounded-sm p-4">
                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" v-model="showMistakes" class="checkbox-field" />
                    <span class="text-sm text-neutral-200 group-hover:text-white transition-colors">Show mistakes in real-time</span>
                  </label>

                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" v-model="autoX" class="checkbox-field" />
                    <span class="text-sm text-neutral-200 group-hover:text-white transition-colors">Auto-X completed rows/columns</span>
                  </label>

                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" v-model="greyCompletedHints" class="checkbox-field" />
                    <span class="text-sm text-neutral-200 group-hover:text-white transition-colors">Grey out completed hints</span>
                  </label>

                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" v-model="showDebugGrid" class="checkbox-field" />
                    <span class="text-sm text-neutral-200 group-hover:text-white transition-colors">Show solution grid (debug)</span>
                  </label>

                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" v-model="dragPainting" class="checkbox-field" />
                    <span class="text-sm text-neutral-200 group-hover:text-white transition-colors">Click and drag to paint cells</span>
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
                <div class="flex items-center justify-center h-full text-xs text-neutral-500">
                  <div class="text-center space-y-2">
                    <div>No messages yet</div>
                    <div class="text-2xs">Game events will appear here</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SHOP -->
          <div v-else class="space-y-6">
            <div class="flex items-center gap-3">
              <div>
                <h2 class="font-semibold text-neutral-100">Puzzle Shop</h2>
                <p class="text-xs text-neutral-400">Hints and power-ups</p>
              </div>
            </div>

            <div class="space-y-3">
              <div class="glass-card p-4 hover:bg-neutral-800/50 transition-colors">
                <div class="flex items-start justify-between">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-neutral-200">Hint Token</span>
                      <span class="px-2 py-0.5 bg-neutral-600/30 text-neutral-400 rounded text-xs font-medium">5 coins</span>
                    </div>
                    <div class="text-xs text-neutral-400">Reveal one correct cell in the puzzle</div>
                  </div>
                  <button class="btn-secondary text-xs px-3 py-1.5">Buy</button>
                </div>
              </div>
            </div>
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
