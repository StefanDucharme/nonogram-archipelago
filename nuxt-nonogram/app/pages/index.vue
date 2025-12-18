<script setup lang="ts">
  import NonogramBoard from '~/components/NonogramBoard.vue';
  import { useNonogram } from '~/composables/useNonogram';
  import { useArchipelago } from '~/composables/useArchipelago';

  const { rows, cols, fillRate, solution, player, rowClues, colClues, solved, newRandom, clearPlayer, cycleCell } = useNonogram();

  const { host, port, slot, password, status, lastMessage, connect, disconnect, checkPuzzleSolved } = useArchipelago();

  const showMistakes = ref(true);
  const checkPulse = ref(false);

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
  const activeTab = ref<RightTab>('archipelago');

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
    <div class="max-w-5xl w-full mx-auto p-6 flex-1">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-semibold">Archipelago Nonogram</h1>
          <p class="text-sm text-neutral-400">10×10 by default — scales to any size.</p>
        </div>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <!-- LEFT: board -->
        <div class="overflow-auto">
          <NonogramBoard
            :rows="rows"
            :cols="cols"
            :row-clues="rowClues"
            :col-clues="colClues"
            :player="player"
            :solution="solution"
            :show-mistakes="showMistakes || checkPulse"
            @cell="cycleCell"
          />

          <div v-if="solved" class="mt-4 p-3 rounded-lg border border-lime-400/40 bg-lime-400/10 text-lime-200">Solved 🎉</div>
        </div>

        <!-- RIGHT: tabs -->
        <div class="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
          <!-- tab bar -->
          <div class="flex border-b border-neutral-800">
            <button
              class="flex-1 px-3 py-2 text-xs"
              :class="activeTab === 'archipelago' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-900/50'"
              @click="activeTab = 'archipelago'"
            >
              Archipelago
            </button>
            <button
              class="flex-1 px-3 py-2 text-xs"
              :class="activeTab === 'settings' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-900/50'"
              @click="activeTab = 'settings'"
            >
              Settings
            </button>

            <button
              class="flex-1 px-3 py-2 text-xs"
              :class="activeTab === 'chat' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-900/50'"
              @click="activeTab = 'chat'"
            >
              Chat
            </button>
            <button
              class="flex-1 px-3 py-2 text-xs"
              :class="activeTab === 'shop' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-900/50'"
              @click="activeTab = 'shop'"
            >
              Shop
            </button>
          </div>

          <!-- tab content -->
          <div class="p-4">
            <!-- SETTINGS -->
            <div v-if="activeTab === 'settings'">
              <h2 class="text-sm font-semibold mb-4">Game Settings</h2>

              <form class="space-y-6">
                <!-- Game Display -->
                <div class="space-y-3">
                  <h3 class="text-xs font-medium text-neutral-300 uppercase tracking-wider">Display Options</h3>
                  <div class="space-y-3">
                    <label class="flex items-center gap-3">
                      <input
                        type="checkbox"
                        v-model="showMistakes"
                        class="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span class="text-sm text-neutral-300">Show mistakes</span>
                    </label>

                    <div>
                      <button
                        type="button"
                        class="w-full px-3 py-2 text-sm font-medium rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors"
                        @click="checkAll()"
                      >
                        Check for Mistakes
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Puzzle Dimensions -->
                <div class="space-y-3">
                  <h3 class="text-xs font-medium text-neutral-300 uppercase tracking-wider">Puzzle Size</h3>
                  <div class="space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label for="rows" class="block text-xs font-medium text-neutral-400 mb-1">Rows</label>
                        <input
                          id="rows"
                          type="number"
                          min="5"
                          max="50"
                          class="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          :value="rows"
                          @change="(e:any) => setRows(clampInt(e.target.value, 5, 50))"
                        />
                      </div>
                      <div>
                        <label for="cols" class="block text-xs font-medium text-neutral-400 mb-1">Columns</label>
                        <input
                          id="cols"
                          type="number"
                          min="5"
                          max="50"
                          class="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          :value="cols"
                          :disabled="lockSize"
                          @change="(e:any) => setCols(clampInt(e.target.value, 5, 50))"
                        />
                      </div>
                    </div>

                    <label class="flex items-center gap-3">
                      <input
                        type="checkbox"
                        v-model="lockSize"
                        class="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span class="text-sm text-neutral-300">Lock aspect ratio (square puzzles)</span>
                    </label>
                  </div>
                </div>

                <!-- Puzzle Generation -->
                <div class="space-y-3">
                  <h3 class="text-xs font-medium text-neutral-300 uppercase tracking-wider">Puzzle Generation</h3>
                  <div class="space-y-3">
                    <div>
                      <label for="fill-rate" class="block text-xs font-medium text-neutral-400 mb-2">
                        Fill Rate: {{ Math.round(fillRate * 100) }}%
                      </label>
                      <input
                        id="fill-rate"
                        type="range"
                        min="0.2"
                        max="0.7"
                        step="0.01"
                        v-model.number="fillRate"
                        class="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div class="flex justify-between text-xs text-neutral-500 mt-1">
                        <span>20%</span>
                        <span>70%</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="w-full px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors"
                      @click="randomize()"
                    >
                      Generate New Puzzle
                    </button>
                  </div>
                </div>

                <!-- Game Actions -->
                <div class="space-y-3">
                  <h3 class="text-xs font-medium text-neutral-300 uppercase tracking-wider">Game Actions</h3>
                  <div>
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-sm font-medium rounded-md border border-red-700 bg-red-900/20 text-red-300 hover:bg-red-900/40 hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors"
                      @click="clearPlayer()"
                    >
                      Clear Progress
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <!-- ARCHIPELAGO -->
            <div v-else-if="activeTab === 'archipelago'">
              <h2 class="text-sm font-semibold mb-3">Archipelago</h2>
              <p class="text-xs text-neutral-400 mb-4">Connect your web client using <code class="text-neutral-300">archipelago.js</code>.</p>

              <div class="space-y-2">
                <input v-model="host" class="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" placeholder="host" />
                <input v-model.number="port" class="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" placeholder="port" />
                <input v-model="slot" class="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" placeholder="slot name" />
                <input
                  v-model="password"
                  class="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm"
                  placeholder="password (optional)"
                />
              </div>

              <div class="mt-3 flex gap-2">
                <button
                  class="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="connect()"
                  :disabled="status === 'connected' || status === 'connecting'"
                >
                  {{ status === 'connecting' ? 'Connecting…' : 'Connect' }}
                </button>
                <button
                  class="px-3 py-2 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="disconnect()"
                  :disabled="status !== 'connected'"
                >
                  Disconnect
                </button>
              </div>

              <div v-if="lastMessage" class="mt-3 text-xs text-neutral-400">
                {{ lastMessage }}
              </div>
            </div>

            <!-- CHAT -->
            <div v-else-if="activeTab === 'chat'">
              <h2 class="text-sm font-semibold mb-3">Log</h2>

              <div class="mt-3 h-full rounded border border-neutral-800 bg-neutral-900/30 p-2 text-xs text-neutral-300 overflow-auto">
                <div class="opacity-60">No messages yet…</div>
              </div>
            </div>

            <!-- SHOP -->
            <div v-else>
              <h2 class="text-sm font-semibold mb-3">Shop</h2>
              <div class="text-xs text-neutral-400">(Placeholder) Put purchases / hint tokens / cosmetics here.</div>

              <div class="mt-3 space-y-2">
                <div class="rounded border border-neutral-800 bg-neutral-900/30 p-3">
                  <div class="text-sm">Hint Token</div>
                  <div class="text-xs text-neutral-400">Reveal one correct cell.</div>
                  <button class="mt-2 px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm">Buy</button>
                </div>

                <div class="rounded border border-neutral-800 bg-neutral-900/30 p-3">
                  <div class="text-sm">Row Reveal</div>
                  <div class="text-xs text-neutral-400">Reveal an entire row.</div>
                  <button class="mt-2 px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm">Buy</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom status bar (outside right panel) -->
    <div class="border-t border-neutral-900 bg-neutral-950/80 backdrop-blur">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-xs">
          <span class="inline-flex h-2.5 w-2.5 rounded-full" :class="statusMeta.dot"></span>
          <span class="text-neutral-400">Archipelago:</span>
          <span :class="statusMeta.text">{{ statusMeta.label }}</span>
        </div>

        <div class="text-xs text-neutral-500 truncate" v-if="lastMessage">
          {{ lastMessage }}
        </div>
      </div>
    </div>
  </div>
</template>
