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
  UNLOCK_SHOW_MISTAKES: 8000001,
  UNLOCK_AUTO_X: 8000002,
  UNLOCK_GREY_HINTS: 8000003,
  UNLOCK_DRAG_PAINT: 8000004,
  UNLOCK_CHECK_MISTAKES: 8000005,

  // Hint Visibility (8001xxx range)
  UNLOCK_HINTS: 8001001,

  // Future items can be added here
  // UNLOCK_LARGER_PUZZLES: 8002001,
  // HINT_TOKEN: 8003001,
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
    id: AP_ITEMS.UNLOCK_SHOW_MISTAKES,
    name: 'Show Mistakes',
    description: 'Unlock the ability to see mistakes in real-time',
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
    id: AP_ITEMS.UNLOCK_CHECK_MISTAKES,
    name: 'Check for Mistakes',
    description: 'Unlock the Check for Mistakes button',
    category: 'settings',
  },
  {
    id: AP_ITEMS.UNLOCK_HINTS,
    name: 'Reveal Hints',
    description: 'Unlock visibility of hint numbers (no more question marks)',
    category: 'hints',
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
    showMistakes: false,
    autoX: false,
    greyHints: false,
    dragPaint: false,
    checkMistakes: false,
    hints: false,
  });

  // Whether we're in Archipelago mode (locked) or free play (unlocked)
  const archipelagoMode = ref(false);

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
    // Don't process duplicates
    if (receivedItems.value.includes(itemId)) {
      return null;
    }

    receivedItems.value.push(itemId);
    const itemDef = getItemDefinition(itemId);

    // Apply the unlock
    switch (itemId) {
      case AP_ITEMS.UNLOCK_SHOW_MISTAKES:
        unlocks.showMistakes = true;
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
        unlocks.hints = true;
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
    unlocks.showMistakes = false;
    unlocks.autoX = false;
    unlocks.greyHints = false;
    unlocks.dragPaint = false;
    unlocks.checkMistakes = false;
    unlocks.hints = false;
    receivedItems.value = [];
  }

  // Disable Archipelago mode (unlock everything for free play)
  function disableArchipelagoMode() {
    archipelagoMode.value = false;
    unlocks.showMistakes = true;
    unlocks.autoX = true;
    unlocks.greyHints = true;
    unlocks.dragPaint = true;
    unlocks.checkMistakes = true;
    unlocks.hints = true;
  }

  // Reset all unlocks (for new game)
  function resetUnlocks() {
    if (archipelagoMode.value) {
      enableArchipelagoMode();
    }
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

    // Computed
    lockedItems,
    unlockedItems,
  };
}
