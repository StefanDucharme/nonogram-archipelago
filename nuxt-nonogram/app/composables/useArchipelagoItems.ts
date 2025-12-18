/**
 * Archipelago Items & Unlocks Management
 *
 * This composable manages all items that can be received from Archipelago.
 * Each item has an ID that corresponds to the Archipelago data package.
 *
 * === ARCHIPELAGO ITEM STANDARD ===
 * Items are identified by numeric IDs defined in your AP world's data package.
 * When the AP server sends an item, it includes the item ID which we map to unlocks.
 *
 * To add new items:
 * 1. Define the item ID constant below (must match your AP world)
 * 2. Add the unlock state to the `unlocks` reactive object
 * 3. Add the item to the `ITEM_REGISTRY` for documentation/UI
 * 4. Handle the item in `receiveItem()` function
 */

// ============================================
// ITEM IDS - Must match your Archipelago world
// ============================================
export const AP_ITEMS = {
  // Settings Unlocks (8000xxx range)
  UNLOCK_PLACE_X: 8000001,
  UNLOCK_AUTO_X: 8000002,
  UNLOCK_GREY_HINTS: 8000003,
  UNLOCK_DRAG_PAINT: 8000004,
  UNLOCK_CHECK_MISTAKES: 8000005,

  // Hint Visibility (8001xxx range)
  UNLOCK_HINTS: 8001001,

  // Lives (8002xxx range)
  EXTRA_LIFE: 8002001,

  // Coins (8003xxx range)
  COINS_BUNDLE: 8003001, // Grants coins

  // Consumables (8004xxx range)
  SOLVE_RANDOM_CELL: 8004001, // Solves a random unsolved cell

  // Future items can be added here
  // UNLOCK_LARGER_PUZZLES: 8004001,
  // HINT_TOKEN: 8005001,
} as const;

// ============================================
// LOCATION IDS - Checks sent TO Archipelago
// ============================================
export const AP_LOCATIONS = {
  SOLVE_PUZZLE: 9000001,
  // Future locations:
  // SOLVE_5X5: 9000002,
  // SOLVE_10X10: 9000003,
  // SOLVE_WITHOUT_MISTAKES: 9000004,
} as const;

// ============================================
// ITEM REGISTRY - For UI and documentation
// ============================================
export interface ItemDefinition {
  id: number;
  name: string;
  description: string;
  category: 'settings' | 'hints' | 'consumable' | 'progression';
}

export const ITEM_REGISTRY: ItemDefinition[] = [
  {
    id: AP_ITEMS.UNLOCK_PLACE_X,
    name: 'Place X',
    description: 'Unlock the ability to mark cells with X',
    category: 'settings',
  },
  {
    id: AP_ITEMS.UNLOCK_AUTO_X,
    name: 'Auto-X',
    description: 'Unlock automatic X marking for completed rows/columns',
    category: 'settings',
  },
  {
    id: AP_ITEMS.UNLOCK_GREY_HINTS,
    name: 'Grey Completed Hints',
    description: 'Unlock greying out of completed hint numbers',
    category: 'settings',
  },
  {
    id: AP_ITEMS.UNLOCK_DRAG_PAINT,
    name: 'Drag Painting',
    description: 'Unlock click and drag to paint multiple cells',
    category: 'settings',
  },
  {
    id: AP_ITEMS.UNLOCK_HINTS,
    name: 'Hint Reveal',
    description: 'Reveals 1 additional random row or column hint per puzzle',
    category: 'consumable',
  },
  {
    id: AP_ITEMS.EXTRA_LIFE,
    name: 'Extra Life',
    description: 'Permanently increases your maximum lives by 1',
    category: 'consumable',
  },
  {
    id: AP_ITEMS.COINS_BUNDLE,
    name: 'Coin Bundle',
    description: 'Grants 10 coins to spend in the shop',
    category: 'consumable',
  },
  {
    id: AP_ITEMS.SOLVE_RANDOM_CELL,
    name: 'Random Cell Solve',
    description: 'Automatically solves one random unsolved cell',
    category: 'consumable',
  },
];

// ============================================
// COMPOSABLE
// ============================================
export function useArchipelagoItems() {
  // Unlock states - these determine what features are available
  // In "locked" mode (Archipelago run), these start as false
  // In "free play" mode, these are all true
  const unlocks = reactive({
    placeX: false,
    autoX: false,
    greyHints: false,
    dragPaint: false,
    checkMistakes: false,
  });

  // Whether we're in Archipelago mode (locked) or free play (unlocked)
  const archipelagoMode = ref(false);

  // Hint reveal system - tracks how many row/col hints to reveal per puzzle
  const hintReveals = ref(0); // Number of hints revealed (permanent, stackable)
  const revealedRows = ref<Set<number>>(new Set()); // Which row hints are revealed for current puzzle
  const revealedCols = ref<Set<number>>(new Set()); // Which col hints are revealed for current puzzle
  const allHintsRevealed = computed(() => !archipelagoMode.value); // In free play, all hints shown
  const currentPuzzleRows = ref(0); // Track current puzzle dimensions for re-selecting hints
  const currentPuzzleCols = ref(0);

  // Lives system
  const baseLives = ref(3); // Default starting lives per puzzle (configurable)
  const extraLives = ref(0); // Permanent extra lives from AP rewards
  const currentLives = ref(baseLives.value); // Current lives for the puzzle
  const maxLives = computed(() => baseLives.value + extraLives.value);
  const unlimitedLives = ref(false); // Setting for unlimited lives (independent of AP mode)

  // Coins system
  const startingCoins = ref(5); // Starting coins (configurable)
  const coins = ref(0); // Current coins
  const coinsPerBundle = ref(5); // Coins received from AP bundle (configurable)
  const unlimitedCoins = ref(false); // Setting for unlimited coins (independent of AP mode)

  // Random cell solve tokens
  const randomCellSolves = ref(0); // Number of random cell solves available

  // Track received items for the UI
  const receivedItems = ref<number[]>([]);

  // Get item definition by ID
  function getItemDefinition(itemId: number): ItemDefinition | undefined {
    return ITEM_REGISTRY.find((item) => item.id === itemId);
  }

  // Check if an item has been received
  function hasItem(itemId: number): boolean {
    return receivedItems.value.includes(itemId);
  }

  // Receive an item from Archipelago
  function receiveItem(itemId: number): string | null {
    // Don't process duplicates (except for stackable items)
    const isStackable =
      itemId === AP_ITEMS.EXTRA_LIFE || itemId === AP_ITEMS.UNLOCK_HINTS || itemId === AP_ITEMS.COINS_BUNDLE || itemId === AP_ITEMS.SOLVE_RANDOM_CELL;
    if (!isStackable && receivedItems.value.includes(itemId)) {
      return null;
    }

    receivedItems.value.push(itemId);
    const itemDef = getItemDefinition(itemId);

    // Apply the unlock
    switch (itemId) {
      case AP_ITEMS.UNLOCK_PLACE_X:
        unlocks.placeX = true;
        break;
      case AP_ITEMS.UNLOCK_AUTO_X:
        unlocks.autoX = true;
        break;
      case AP_ITEMS.UNLOCK_GREY_HINTS:
        unlocks.greyHints = true;
        break;
      case AP_ITEMS.UNLOCK_DRAG_PAINT:
        unlocks.dragPaint = true;
        break;
      case AP_ITEMS.UNLOCK_CHECK_MISTAKES:
        unlocks.checkMistakes = true;
        break;
      case AP_ITEMS.UNLOCK_HINTS:
        hintReveals.value += 1;
        addRandomHintReveal(); // Immediately reveal a new hint on current puzzle
        break;
      case AP_ITEMS.EXTRA_LIFE:
        extraLives.value += 1;
        currentLives.value = Math.min(currentLives.value + 1, maxLives.value);
        break;
      case AP_ITEMS.COINS_BUNDLE:
        coins.value += coinsPerBundle.value;
        break;
      case AP_ITEMS.SOLVE_RANDOM_CELL:
        randomCellSolves.value += 1;
        break;
      default:
        console.warn(`Unknown item received: ${itemId}`);
        return null;
    }

    return itemDef?.name ?? `Item #${itemId}`;
  }

  // Enable Archipelago mode (lock everything)
  function enableArchipelagoMode() {
    archipelagoMode.value = true;
    unlocks.placeX = false;
    unlocks.autoX = false;
    unlocks.greyHints = false;
    unlocks.dragPaint = false;
    unlocks.checkMistakes = false;
    receivedItems.value = [];
    extraLives.value = 0;
    currentLives.value = baseLives.value;
    coins.value = startingCoins.value;
    hintReveals.value = 0;
    revealedRows.value = new Set();
    revealedCols.value = new Set();
    randomCellSolves.value = 0;
  }

  // Disable Archipelago mode (unlock everything for free play)
  function disableArchipelagoMode() {
    archipelagoMode.value = false;
    unlocks.placeX = true;
    unlocks.autoX = true;
    unlocks.greyHints = true;
    unlocks.dragPaint = true;
    unlocks.checkMistakes = true;
    // Reset resources (unlimited settings handle display)
    currentLives.value = baseLives.value;
    coins.value = startingCoins.value;
  }

  // Reset lives for a new puzzle (keeps extra lives from AP)
  function resetLivesForNewPuzzle() {
    currentLives.value = maxLives.value;
  }

  // Lose a life (returns true if still alive, false if game over)
  function loseLife(): boolean {
    if (unlimitedLives.value) return true; // Unlimited lives enabled
    if (currentLives.value > 0) {
      currentLives.value -= 1;
    }
    return currentLives.value > 0;
  }

  // Add coins (for completing rows/columns)
  function addCoins(amount: number) {
    coins.value += amount;
  }

  // Spend coins (returns true if successful, false if not enough)
  function spendCoins(amount: number): boolean {
    if (unlimitedCoins.value || coins.value >= amount) {
      if (!unlimitedCoins.value) {
        coins.value -= amount;
      }
      return true;
    }
    return false;
  }

  // Reset all unlocks (for new game)
  function resetUnlocks() {
    if (archipelagoMode.value) {
      enableArchipelagoMode();
    }
  }

  // Select which hints to reveal for a new puzzle
  function selectRevealedHints(totalRows: number, totalCols: number) {
    // Store dimensions for re-selection when receiving new hints
    currentPuzzleRows.value = totalRows;
    currentPuzzleCols.value = totalCols;

    revealedRows.value = new Set();
    revealedCols.value = new Set();

    if (!archipelagoMode.value) return; // In free play, all hints shown via allHintsRevealed

    const totalHints = totalRows + totalCols;
    const hintsToReveal = Math.min(hintReveals.value, totalHints);

    // Create array of all possible hint indices (0 to totalRows-1 for rows, totalRows to totalRows+totalCols-1 for cols)
    const allIndices: Array<{ type: 'row' | 'col'; index: number }> = [];
    for (let i = 0; i < totalRows; i++) {
      allIndices.push({ type: 'row', index: i });
    }
    for (let i = 0; i < totalCols; i++) {
      allIndices.push({ type: 'col', index: i });
    }

    // Shuffle using Fisher-Yates
    for (let i = allIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = allIndices[i]!;
      allIndices[i] = allIndices[j]!;
      allIndices[j] = temp;
    }

    for (let i = 0; i < hintsToReveal; i++) {
      const hint = allIndices[i];
      if (hint) {
        if (hint.type === 'row') {
          revealedRows.value.add(hint.index);
        } else {
          revealedCols.value.add(hint.index);
        }
      }
    }
  }

  // Add a single new random hint reveal (called when receiving hint item mid-puzzle)
  function addRandomHintReveal() {
    if (!archipelagoMode.value) return; // Free play shows all anyway

    const totalRows = currentPuzzleRows.value;
    const totalCols = currentPuzzleCols.value;
    if (totalRows === 0 || totalCols === 0) return; // No puzzle loaded yet

    // Find all unrevealed hints
    const unrevealedHints: Array<{ type: 'row' | 'col'; index: number }> = [];
    for (let i = 0; i < totalRows; i++) {
      if (!revealedRows.value.has(i)) {
        unrevealedHints.push({ type: 'row', index: i });
      }
    }
    for (let i = 0; i < totalCols; i++) {
      if (!revealedCols.value.has(i)) {
        unrevealedHints.push({ type: 'col', index: i });
      }
    }

    if (unrevealedHints.length === 0) return; // All hints already revealed

    // Pick a random unrevealed hint
    const randomIndex = Math.floor(Math.random() * unrevealedHints.length);
    const hint = unrevealedHints[randomIndex];
    if (hint) {
      if (hint.type === 'row') {
        revealedRows.value.add(hint.index);
      } else {
        revealedCols.value.add(hint.index);
      }
    }
  }

  // Check if a specific row hint is revealed
  function isRowHintRevealed(rowIndex: number): boolean {
    if (!archipelagoMode.value) return true; // Free play shows all
    return revealedRows.value.has(rowIndex);
  }

  // Check if a specific col hint is revealed
  function isColHintRevealed(colIndex: number): boolean {
    if (!archipelagoMode.value) return true; // Free play shows all
    return revealedCols.value.has(colIndex);
  }

  // Use a random cell solve token (returns true if had tokens)
  function useRandomCellSolve(): boolean {
    if (randomCellSolves.value > 0) {
      randomCellSolves.value -= 1;
      return true;
    }
    return false;
  }

  // Buy a random cell solve from the shop
  const RANDOM_CELL_SOLVE_COST = 5;
  function buyRandomCellSolve(): boolean {
    if (spendCoins(RANDOM_CELL_SOLVE_COST)) {
      return true;
    }
    return false;
  }

  // Get list of locked items (for UI display)
  const lockedItems = computed(() => {
    return ITEM_REGISTRY.filter((item) => !receivedItems.value.includes(item.id));
  });

  // Get list of unlocked items (for UI display)
  const unlockedItems = computed(() => {
    return ITEM_REGISTRY.filter((item) => receivedItems.value.includes(item.id));
  });

  // Start in free play mode by default
  disableArchipelagoMode();

  return {
    // State
    unlocks,
    archipelagoMode,
    receivedItems,

    // Lives
    currentLives,
    maxLives,
    extraLives,
    baseLives,
    unlimitedLives,

    // Coins
    coins,
    startingCoins,
    coinsPerBundle,
    unlimitedCoins,

    // Hints
    hintReveals,
    revealedRows,
    revealedCols,
    allHintsRevealed,

    // Random Cell Solves
    randomCellSolves,
    RANDOM_CELL_SOLVE_COST,

    // Item registry
    ITEM_REGISTRY,
    AP_ITEMS,
    AP_LOCATIONS,

    // Methods
    receiveItem,
    hasItem,
    getItemDefinition,
    enableArchipelagoMode,
    disableArchipelagoMode,
    resetUnlocks,
    resetLivesForNewPuzzle,
    loseLife,
    addCoins,
    spendCoins,
    selectRevealedHints,
    isRowHintRevealed,
    isColHintRevealed,
    useRandomCellSolve,
    buyRandomCellSolve,

    // Computed
    lockedItems,
    unlockedItems,
  };
}
