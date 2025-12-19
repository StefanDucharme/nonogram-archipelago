import type { Client, Item } from 'archipelago.js';
import { itemsHandlingFlags } from 'archipelago.js';
import { useArchipelagoItems, AP_LOCATIONS } from './useArchipelagoItems';

type Status = 'disconnected' | 'connecting' | 'connected' | 'error';

// Track if event handlers have been set up (to avoid duplicates)
let eventHandlersInitialized = false;

export function useArchipelago() {
  const nuxt = useNuxtApp();
  const client = nuxt.$apClient as Client;

  const host = useState('ap_host', () => 'archipelago.gg');
  const port = useState('ap_port', () => 38281);
  const slot = useState('ap_slot', () => '');
  const password = useState('ap_password', () => '');

  const status = useState<Status>('ap_status', () => 'disconnected');
  const lastMessage = useState<string>('ap_lastMessage', () => '');

  // Chat/event log
  const messageLog = useState<Array<{ time: Date; text: string; type: 'info' | 'item' | 'chat' | 'error' }>>('ap_messageLog', () => []);

  // Get items composable
  const items = useArchipelagoItems();

  function addLogMessage(text: string, type: 'info' | 'item' | 'chat' | 'error' = 'info') {
    messageLog.value.push({ time: new Date(), text, type });
    // Keep log limited to last 100 messages
    if (messageLog.value.length > 100) {
      messageLog.value = messageLog.value.slice(-100);
    }
  }

  // Set up event handlers once
  function setupEventHandlers() {
    if (eventHandlersInitialized) return;
    eventHandlersInitialized = true;

    // Handle received items
    client.items.on('itemsReceived', (receivedItems: Item[], startingIndex: number) => {
      for (const item of receivedItems) {
        // item.id is the item ID from the AP world
        const itemName = handleItemReceived(item.id);
        if (itemName) {
          addLogMessage(`Received: ${itemName} from ${item.sender.name}`, 'item');
        }
      }
    });

    // Handle chat messages
    client.messages.on('message', (content: string) => {
      addLogMessage(content, 'chat');
    });

    // Handle disconnection
    client.socket.on('disconnected', () => {
      status.value = 'disconnected';
      lastMessage.value = 'Disconnected from server.';
      addLogMessage('Connection lost.', 'error');
    });
  }

  async function connect() {
    try {
      status.value = 'connecting';
      lastMessage.value = '';

      // Enable Archipelago mode when connecting
      items.enableArchipelagoMode();
      addLogMessage('Connecting to Archipelago...', 'info');

      // Set up event handlers before connecting
      setupEventHandlers();

      // Build the connection URL
      // archipelago.js v2 uses: client.login(url, name, game, options)
      const url = `wss://${host.value}:${port.value}`;

      await client.login(url, slot.value, 'Nonogram', {
        password: password.value || '',
        // Request all items (own, starting, others)
        items: itemsHandlingFlags.all,
        slotData: true,
      });

      status.value = 'connected';
      lastMessage.value = 'Connected!';
      addLogMessage(`Connected to Archipelago server as ${slot.value}!`, 'info');
    } catch (e: any) {
      status.value = 'error';
      const errorMsg = e?.message ?? String(e);
      lastMessage.value = errorMsg;
      addLogMessage(`Connection error: ${errorMsg}`, 'error');
      // Disable Archipelago mode on connection failure
      items.disableArchipelagoMode();
    }
  }

  function disconnect() {
    try {
      client.socket.disconnect();
      addLogMessage('Disconnected from server.', 'info');
    } finally {
      status.value = 'disconnected';
      lastMessage.value = 'Disconnected.';
      // Keep Archipelago mode active after disconnect to preserve state
      // User can manually switch to free play if desired
    }
  }

  function handleItemReceived(itemId: number): string | null {
    const itemName = items.receiveItem(itemId);
    if (itemName) {
      lastMessage.value = `Received: ${itemName}`;
    }
    return itemName;
  }

  // Send a location check to the server
  function checkLocation(locationId: number) {
    if (status.value !== 'connected') return;
    try {
      client.check(locationId);
      addLogMessage(`Location ${locationId} checked.`, 'info');
    } catch (e: any) {
      const errorMsg = e?.message ?? String(e);
      lastMessage.value = errorMsg;
      addLogMessage(`Error checking location: ${errorMsg}`, 'error');
    }
  }

  // Check multiple locations at once
  function checkLocations(locationIds: number[]) {
    if (status.value !== 'connected') return;
    try {
      client.check(...locationIds);
      addLogMessage(`Checked ${locationIds.length} location(s).`, 'info');
    } catch (e: any) {
      const errorMsg = e?.message ?? String(e);
      lastMessage.value = errorMsg;
      addLogMessage(`Error checking locations: ${errorMsg}`, 'error');
    }
  }

  // Legacy function name for compatibility
  function checkPuzzleSolved() {
    // This should be called when a puzzle is completed
    // The actual location to check depends on how many puzzles have been completed
    addLogMessage('Puzzle completed! Checking for milestone locations...', 'info');
  }

  // Debug function to simulate receiving an item (for testing)
  function debugReceiveItem(itemId: number) {
    const itemName = handleItemReceived(itemId);
    if (itemName) {
      addLogMessage(`[DEBUG] Received: ${itemName}`, 'item');
    }
  }

  // Send a chat message
  async function say(message: string) {
    if (status.value !== 'connected') return;
    try {
      await client.messages.say(message);
    } catch (e: any) {
      addLogMessage(`Error sending message: ${e?.message ?? String(e)}`, 'error');
    }
  }

  return {
    host,
    port,
    slot,
    password,
    status,
    lastMessage,
    messageLog,
    connect,
    disconnect,
    checkLocation,
    checkLocations,
    checkPuzzleSolved,
    debugReceiveItem,
    say,
    // Expose items composable
    items,
  };
}
