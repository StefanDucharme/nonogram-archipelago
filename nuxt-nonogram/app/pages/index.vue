<script setup lang="ts">
  import NonogramBoard from '~/components/NonogramBoard.vue';
  import { useNonogram } from '~/composables/useNonogram';
  import { useArchipelago } from '~/composables/useArchipelago';

  const { rows, cols, fillRate, solution, player, rowClues, colClues, solved, newRandom, clearPlayer, cycleCell } = useNonogram();

  const { host, port, slot, password, status, lastMessage, connect, disconnect, checkPuzzleSolved } = useArchipelago();

  const showMistakes = ref(false);
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
</script>

<template>
  <div class="min-h-screen bg-neutral-950 text-neutral-100">
    <div class="max-w-5xl mx-auto p-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-semibold">Nuxt Nonogram</h1>
          <p class="text-sm text-neutral-400">10×10 by default — scales to any size.</p>
        </div>

        <div class="flex flex-wrap gap-2 items-end">
          <label class="text-xs text-neutral-400">
            Rows
            <input
              class="ml-2 w-20 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm"
              :value="rows"
              @change="(e:any) => (rows = clampInt(e.target.value, 5, 50))"
            />
          </label>

          <label class="text-xs text-neutral-400">
            Cols
            <input
              class="ml-2 w-20 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm"
              :value="cols"
              @change="(e:any) => (cols = clampInt(e.target.value, 5, 50))"
            />
          </label>

          <label class="text-xs text-neutral-400">
            Fill
            <input class="ml-2 w-24" type="range" min="0.2" max="0.7" step="0.01" v-model.number="fillRate" />
          </label>

          <button class="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" @click="newRandom(rows, cols)">Randomize</button>

          <button class="px-3 py-2 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-sm" @click="clearPlayer()">
            Clear
          </button>
        </div>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
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

          <label class="flex items-center gap-2 text-xs text-neutral-300">
            <input type="checkbox" v-model="showMistakes" class="accent-blue-500" />
            Show mistakes
          </label>

          <button class="px-3 py-2 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-sm" @click="checkAll()">
            Check all
          </button>
        </div>

        <div class="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <h2 class="text-sm font-semibold mb-3">Archipelago</h2>
          <p class="text-xs text-neutral-400 mb-4">
            Connect your web client to an AP server using <code class="text-neutral-300">archipelago.js</code>.
          </p>

          <div class="space-y-2">
            <input
              v-model="host"
              class="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm"
              placeholder="host (e.g. localhost)"
            />
            <input
              v-model.number="port"
              class="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm"
              placeholder="port (e.g. 38281)"
            />
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

          <div class="mt-3 text-xs">
            Status:
            <span :class="status === 'connected' ? 'text-lime-300' : 'text-neutral-400'">
              {{ status }}
            </span>
          </div>

          <div v-if="lastMessage" class="mt-3 text-xs text-neutral-400">
            {{ lastMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
