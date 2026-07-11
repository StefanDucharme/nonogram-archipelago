import { usePersistentRef } from './usePersistence';
import type { Cell, Grid } from '~/utils/nonogram';

// Pre-generated banks exist only for the square Archipelago tier sizes. Every stored grid is
// guaranteed to have a single, no-guess solution (verified offline), so drawing from the bank is
// instant and needs no runtime solver. Non-banked sizes (free play, non-square, > 20) fall back to
// runtime generation in the caller.
const BANKED_SIZES = new Set([5, 10, 15, 20]);

// Module-level cache: the bank is a static asset shared by every consumer, loaded at most once.
let bankData: Record<string, string[]> | null = null;
let bankLoading: Promise<void> | null = null;

async function loadBankData(): Promise<void> {
  if (bankData) return;
  const mod = await import('../data/grid-bank.json');
  bankData = ((mod as any).default ?? mod) as Record<string, string[]>;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Inverse of the offline packing: row-major, LSB-first bits -> n x n grid of 0/1.
function unpackGrid(b64: string, n: number): Grid<Cell> {
  const bytes = base64ToBytes(b64);
  const grid: Cell[][] = [];
  let idx = 0;
  for (let r = 0; r < n; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < n; c++) {
      row.push(((bytes[idx >> 3] >> (idx & 7)) & 1) as Cell);
      idx++;
    }
    grid.push(row);
  }
  return grid;
}

export function useGridBank() {
  // Indices already served per size key, persisted; cleared when a size's pool is exhausted.
  const played = usePersistentRef<Record<string, number[]>>('bank_played', {});

  function hasBank(rows: number, cols: number): boolean {
    return rows === cols && BANKED_SIZES.has(rows);
  }

  // Kick off loading the static bank (client only, once). Safe to call repeatedly.
  function ensureBankLoaded(): void {
    if (import.meta.server || bankData || bankLoading) return;
    bankLoading = loadBankData().catch((e) => {
      console.error('Failed to load grid bank:', e);
    });
  }

  // Draw a unique grid for a banked square size, marking it played (resetting the pool when
  // exhausted). Returns null when the bank can't serve this request (not loaded yet, or size not
  // banked) so the caller can fall back to runtime generation.
  function pickBankGrid(rows: number, cols: number): Grid<Cell> | null {
    if (!bankData || !hasBank(rows, cols)) return null;
    const key = `${rows}x${cols}`;
    const grids = bankData[key];
    if (!grids || grids.length === 0) return null;

    let playedIdx = played.value[key] ?? [];
    if (playedIdx.length >= grids.length) playedIdx = []; // pool exhausted -> reset
    const playedSet = new Set(playedIdx);
    const available: number[] = [];
    for (let i = 0; i < grids.length; i++) if (!playedSet.has(i)) available.push(i);
    const pick = available[Math.floor(Math.random() * available.length)];

    played.value = { ...played.value, [key]: [...playedIdx, pick] };
    return unpackGrid(grids[pick], rows);
  }

  return { ensureBankLoaded, hasBank, pickBankGrid };
}
