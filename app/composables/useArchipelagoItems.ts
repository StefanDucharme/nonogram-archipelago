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
  // Coin milestones
  OBTAIN_50_COINS: 9000001,
  OBTAIN_100_COINS: 9000002,

  // 5x5 milestones
  FIRST_LINE_5X5: 9000003,

  // Difficulty unlocks
  UNLOCK_10X10: 9000004,
  FIRST_LINE_10X10: 9000005,
  UNLOCK_15X15: 9000006,
  FIRST_LINE_15X15: 9000007,
  UNLOCK_20X20: 9000008,
  FIRST_LINE_20X20: 9000009,

  // Puzzle completion base IDs (add puzzle count to get location ID)
  PUZZLE_5X5_BASE: 9001000, // 9001001-9001026
  PUZZLE_10X10_BASE: 9002000, // 9002001-9002015
  PUZZLE_15X15_BASE: 9003000, // 9003001-9003010
  PUZZLE_20X20_BASE: 9004000, // 9004001-9004005
} as const;

// Puzzle completion counts per difficulty
export const PUZZLE_COUNTS = {
  '5x5': 26,
  '10x10': 15,
  '15x15': 10,
  '20x20': 5,
} as const;

// Helper to get location ID for puzzle completions by difficulty
export function getPuzzleLocationId(difficulty: '5x5' | '10x10' | '15x15' | '20x20', count: number): number {
  const baseIds = {
    '5x5': AP_LOCATIONS.PUZZLE_5X5_BASE,
    '10x10': AP_LOCATIONS.PUZZLE_10X10_BASE,
    '15x15': AP_LOCATIONS.PUZZLE_15X15_BASE,
    '20x20': AP_LOCATIONS.PUZZLE_20X20_BASE,
  };
  return baseIds[difficulty] + count;
}

// Location registry for UI display
export interface LocationDefinition {
  id: number;
  name: string;
  description: string;
  threshold?: number; // For puzzle checks
  difficulty?: string; // For puzzle checks
}

// Generate location registry dynamically
export const LOCATION_REGISTRY: LocationDefinition[] = [
  // Coin milestones
  { id: AP_LOCATIONS.OBTAIN_50_COINS, name: 'Obtain 50 Coins', description: 'Accumulate 50 total coins' },
  { id: AP_LOCATIONS.OBTAIN_100_COINS, name: 'Obtain 100 Coins', description: 'Accumulate 100 total coins' },

  // 5x5 checks
  { id: AP_LOCATIONS.FIRST_LINE_5X5, name: 'First Line (5x5)', description: 'Complete your first row or column in a 5x5 puzzle' },
  ...Array.from({ length: PUZZLE_COUNTS['5x5'] }, (_, i) => ({
    id: getPuzzleLocationId('5x5', i + 1),
    name: `Complete ${i + 1} 5x5 Puzzle${i > 0 ? 's' : ''}`,
    description: `Complete ${i + 1} 5x5 puzzle${i > 0 ? 's' : ''}`,
    threshold: i + 1,
    difficulty: '5x5',
  })),

  // 10x10 checks
  { id: AP_LOCATIONS.UNLOCK_10X10, name: 'Unlock 10x10', description: 'Increase difficulty to 10x10' },
  { id: AP_LOCATIONS.FIRST_LINE_10X10, name: 'First Line (10x10)', description: 'Complete your first row or column in a 10x10 puzzle' },
  ...Array.from({ length: PUZZLE_COUNTS['10x10'] }, (_, i) => ({
    id: getPuzzleLocationId('10x10', i + 1),
    name: `Complete ${i + 1} 10x10 Puzzle${i > 0 ? 's' : ''}`,
    description: `Complete ${i + 1} 10x10 puzzle${i > 0 ? 's' : ''}`,
    threshold: i + 1,
    difficulty: '10x10',
  })),

  // 15x15 checks
  { id: AP_LOCATIONS.UNLOCK_15X15, name: 'Unlock 15x15', description: 'Increase difficulty to 15x15' },
  { id: AP_LOCATIONS.FIRST_LINE_15X15, name: 'First Line (15x15)', description: 'Complete your first row or column in a 15x15 puzzle' },
  ...Array.from({ length: PUZZLE_COUNTS['15x15'] }, (_, i) => ({
    id: getPuzzleLocationId('15x15', i + 1),
    name: `Complete ${i + 1} 15x15 Puzzle${i > 0 ? 's' : ''}`,
    description: `Complete ${i + 1} 15x15 puzzle${i > 0 ? 's' : ''}`,
    threshold: i + 1,
    difficulty: '15x15',
  })),

  // 20x20 checks
  { id: AP_LOCATIONS.UNLOCK_20X20, name: 'Unlock 20x20', description: 'Increase difficulty to 20x20' },
  { id: AP_LOCATIONS.FIRST_LINE_20X20, name: 'First Line (20x20)', description: 'Complete your first row or column in a 20x20 puzzle' },
  ...Array.from({ length: PUZZLE_COUNTS['20x20'] }, (_, i) => ({
    id: getPuzzleLocationId('20x20', i + 1),
    name: `Complete ${i + 1} 20x20 Puzzle${i > 0 ? 's' : ''}`,
    description: `Complete ${i + 1} 20x20 puzzle${i > 0 ? 's' : ''}`,
    threshold: i + 1,
    difficulty: '20x20',
  })),
];

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
  const startingHintReveals = ref(1); // Starting hints revealed setting (configurable)
  const hintReveals = ref(0); // Number of hints revealed (permanent, stackable)
  const revealedRows = ref<Set<number>>(new Set()); // Which row hints are revealed for current puzzle
  const revealedCols = ref<Set<number>>(new Set()); // Which col hints are revealed for current puzzle
  const allHintsRevealed = computed(() => !archipelagoMode.value); // In free play, all hints shown
  const currentPuzzleRows = ref(0); // Track current puzzle dimensions for re-selecting hints
  const currentPuzzleCols = ref(0);
  const totalHintReveals = computed(() => startingHintReveals.value + hintReveals.value); // Total hints to reveal

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

  // Temporary hint reveals (only for current puzzle, purchased from shop)
  const tempHintReveals = ref(0); // Temporary hints for current puzzle
  const TEMP_HINT_COST = ref(5); // Cost to buy a temporary hint reveal

  // Difficulty system
  const currentDifficulty = ref(5); // Starting grid size (5x5)
  const DIFFICULTY_INCREASE_COST = ref(30); // Cost to increase difficulty
  const DIFFICULTY_STEP = 5; // How much to increase per purchase

  // Check/Location tracking
  const completedChecks = ref<Set<number>>(new Set()); // Location IDs that have been sent
  const puzzlesCompleted = reactive({
    '5x5': 0,
    '10x10': 0,
    '15x15': 0,
    '20x20': 0,
  }); // Puzzles completed per difficulty
  const firstLineCompleted = reactive({
    '5x5': false,
    '10x10': false,
    '15x15': false,
    '20x20': false,
  }); // First line completed per difficulty
  const totalCoinsEarned = ref(0); // Total coins ever earned (for milestone tracking)
  const coinMilestones = reactive({
    50: false,
    100: false,
  }); // Coin milestones reached

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
  // Returns item name and any location checks that should be sent as a result
  function receiveItem(itemId: number): { itemName: string | null; checks: number[] } {
    // Don't process duplicates (except for stackable items)
    const isStackable =
      itemId === AP_ITEMS.EXTRA_LIFE || itemId === AP_ITEMS.UNLOCK_HINTS || itemId === AP_ITEMS.COINS_BUNDLE || itemId === AP_ITEMS.SOLVE_RANDOM_CELL;
    if (!isStackable && receivedItems.value.includes(itemId)) {
      return { itemName: null, checks: [] };
    }

    receivedItems.value.push(itemId);
    const itemDef = getItemDefinition(itemId);
    let newChecks: number[] = [];

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
        // Use addCoins to track total earned and trigger milestones
        newChecks = addCoins(coinsPerBundle.value);
        break;
      case AP_ITEMS.SOLVE_RANDOM_CELL:
        randomCellSolves.value += 1;
        break;
      default:
        console.warn(`Unknown item received: ${itemId}`);
        return { itemName: null, checks: [] };
    }

    return { itemName: itemDef?.name ?? `Item #${itemId}`, checks: newChecks };
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
    hintReveals.value = 0; // Reset bonus hints, startingHintReveals will be used as base
    revealedRows.value = new Set();
    revealedCols.value = new Set();
    randomCellSolves.value = 0;
    tempHintReveals.value = 0;
    currentDifficulty.value = 5; // Reset to easy (5x5)
    completedChecks.value = new Set();
    puzzlesCompleted['5x5'] = 0;
    puzzlesCompleted['10x10'] = 0;
    puzzlesCompleted['15x15'] = 0;
    puzzlesCompleted['20x20'] = 0;
    firstLineCompleted['5x5'] = false;
    firstLineCompleted['10x10'] = false;
    firstLineCompleted['15x15'] = false;
    firstLineCompleted['20x20'] = false;
    totalCoinsEarned.value = 0;
    coinMilestones[50] = false;
    coinMilestones[100] = false;
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
  function addCoins(amount: number): number[] {
    coins.value += amount;
    totalCoinsEarned.value += amount;

    console.log('[DEBUG addCoins] amount:', amount, 'totalCoinsEarned:', totalCoinsEarned.value, 'archipelagoMode:', archipelagoMode.value);

    // Check for coin milestones
    const newChecks: number[] = [];
    if (!coinMilestones[50] && totalCoinsEarned.value >= 50) {
      console.log('[DEBUG addCoins] Hit 50 coin milestone!');
      coinMilestones[50] = true;
      if (archipelagoMode.value && !completedChecks.value.has(AP_LOCATIONS.OBTAIN_50_COINS)) {
        console.log('[DEBUG addCoins] Adding 50 coin check:', AP_LOCATIONS.OBTAIN_50_COINS);
        completedChecks.value.add(AP_LOCATIONS.OBTAIN_50_COINS);
        newChecks.push(AP_LOCATIONS.OBTAIN_50_COINS);
      }
    }
    if (!coinMilestones[100] && totalCoinsEarned.value >= 100) {
      console.log('[DEBUG addCoins] Hit 100 coin milestone!');
      coinMilestones[100] = true;
      if (archipelagoMode.value && !completedChecks.value.has(AP_LOCATIONS.OBTAIN_100_COINS)) {
        console.log('[DEBUG addCoins] Adding 100 coin check:', AP_LOCATIONS.OBTAIN_100_COINS);
        completedChecks.value.add(AP_LOCATIONS.OBTAIN_100_COINS);
        newChecks.push(AP_LOCATIONS.OBTAIN_100_COINS);
      }
    }
    console.log('[DEBUG addCoins] returning newChecks:', newChecks);
    return newChecks;
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
    const hintsToReveal = Math.min(totalHintReveals.value, totalHints);

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

  // Buy a temporary hint reveal (only for current puzzle)
  function buyTempHintReveal(): boolean {
    if (spendCoins(TEMP_HINT_COST.value)) {
      tempHintReveals.value += 1;
      addRandomHintReveal(); // Immediately reveal a new hint
      return true;
    }
    return false;
  }

  // Reset temporary hints for new puzzle
  function resetTempHintsForNewPuzzle() {
    tempHintReveals.value = 0;
  }

  // Buy difficulty increase
  function buyDifficultyIncrease(): { success: boolean; checks: number[] } {
    if (spendCoins(DIFFICULTY_INCREASE_COST.value)) {
      currentDifficulty.value += DIFFICULTY_STEP;

      const newChecks: number[] = [];
      if (archipelagoMode.value) {
        // Check which difficulty unlock this corresponds to
        if (currentDifficulty.value === 10 && !completedChecks.value.has(AP_LOCATIONS.UNLOCK_10X10)) {
          completedChecks.value.add(AP_LOCATIONS.UNLOCK_10X10);
          newChecks.push(AP_LOCATIONS.UNLOCK_10X10);
        } else if (currentDifficulty.value === 15 && !completedChecks.value.has(AP_LOCATIONS.UNLOCK_15X15)) {
          completedChecks.value.add(AP_LOCATIONS.UNLOCK_15X15);
          newChecks.push(AP_LOCATIONS.UNLOCK_15X15);
        } else if (currentDifficulty.value === 20 && !completedChecks.value.has(AP_LOCATIONS.UNLOCK_20X20)) {
          completedChecks.value.add(AP_LOCATIONS.UNLOCK_20X20);
          newChecks.push(AP_LOCATIONS.UNLOCK_20X20);
        }
      }

      return { success: true, checks: newChecks };
    }
    return { success: false, checks: [] };
  }

  // Mark first line as completed for a specific difficulty and return the location ID if it's a new check
  function markFirstLineCompleted(difficulty: '5x5' | '10x10' | '15x15' | '20x20'): number | null {
    if (!archipelagoMode.value) return null;
    if (firstLineCompleted[difficulty]) return null;

    firstLineCompleted[difficulty] = true;

    const locationIds = {
      '5x5': AP_LOCATIONS.FIRST_LINE_5X5,
      '10x10': AP_LOCATIONS.FIRST_LINE_10X10,
      '15x15': AP_LOCATIONS.FIRST_LINE_15X15,
      '20x20': AP_LOCATIONS.FIRST_LINE_20X20,
    };

    const locationId = locationIds[difficulty];
    if (!completedChecks.value.has(locationId)) {
      completedChecks.value.add(locationId);
      return locationId;
    }
    return null;
  }

  // Mark puzzle as completed and return any new location IDs that should be sent
  function markPuzzleCompleted(difficulty: '5x5' | '10x10' | '15x15' | '20x20'): number[] {
    if (!archipelagoMode.value) return [];

    puzzlesCompleted[difficulty] += 1;
    const newChecks: number[] = [];

    // Check if this completion unlocks a new check
    const count = puzzlesCompleted[difficulty];
    const maxCount = PUZZLE_COUNTS[difficulty];

    if (count <= maxCount) {
      const locationId = getPuzzleLocationId(difficulty, count);
      if (!completedChecks.value.has(locationId)) {
        completedChecks.value.add(locationId);
        newChecks.push(locationId);
      }
    }

    return newChecks;
  }

  // Get location definition by ID
  function getLocationDefinition(locationId: number): LocationDefinition | undefined {
    return LOCATION_REGISTRY.find((loc) => loc.id === locationId);
  }

  // Check if a location has been completed
  function isLocationCompleted(locationId: number): boolean {
    return completedChecks.value.has(locationId);
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
    totalCoinsEarned,
    coinMilestones,

    // Hints
    startingHintReveals,
    hintReveals,
    totalHintReveals,
    revealedRows,
    revealedCols,
    allHintsRevealed,
    tempHintReveals,
    TEMP_HINT_COST,

    // Random Cell Solves
    randomCellSolves,
    RANDOM_CELL_SOLVE_COST,

    // Difficulty
    currentDifficulty,
    DIFFICULTY_INCREASE_COST,
    DIFFICULTY_STEP,

    // Checks/Locations
    completedChecks,
    puzzlesCompleted,
    firstLineCompleted,
    LOCATION_REGISTRY,
    PUZZLE_COUNTS,

    // Item registry
    ITEM_REGISTRY,
    AP_ITEMS,
    AP_LOCATIONS,

    // Methods
    receiveItem,
    hasItem,
    getItemDefinition,
    getLocationDefinition,
    isLocationCompleted,
    enableArchipelagoMode,
    disableArchipelagoMode,
    resetUnlocks,
    resetLivesForNewPuzzle,
    resetTempHintsForNewPuzzle,
    loseLife,
    addCoins,
    spendCoins,
    selectRevealedHints,
    isRowHintRevealed,
    isColHintRevealed,
    useRandomCellSolve,
    buyRandomCellSolve,
    buyTempHintReveal,
    buyDifficultyIncrease,
    markFirstLineCompleted,
    markPuzzleCompleted,
    getPuzzleLocationId,

    // Computed
    lockedItems,
    unlockedItems,
  };
}
