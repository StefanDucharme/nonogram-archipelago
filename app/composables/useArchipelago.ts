import type { Client } from 'archipelago.js';
import { useArchipelagoItems, AP_LOCATIONS } from './useArchipelagoItems';

type Status = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useArchipelago() {
  const nuxt = useNuxtApp();
  const client = nuxt.$apClient as Client;

  const host = useState('ap_host', () => 'localhost');
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

  async function connect() {
    try {
      status.value = 'connecting';
      lastMessage.value = '';

      // Enable Archipelago mode when connecting
      items.enableArchipelagoMode();
      addLogMessage('Connecting to Archipelago...', 'info');

      // archipelago.js: connect + login style API (see docs)
      await client.connect({
        hostname: host.value,
        port: port.value,
        name: slot.value,
        password: password.value || undefined,
        game: 'Nonogram',
      } as any);

      // Set up item received handler
      // Note: The exact API depends on archipelago.js version
      // This is the general pattern - adjust based on library docs
      if (client.items && typeof client.items.on === 'function') {
        client.items.on('itemsReceived', (receivedItems: any[]) => {
          for (const item of receivedItems) {
            const itemName = handleItemReceived(item.item);
            if (itemName) {
              addLogMessage(`Received: ${itemName}`, 'item');
            }
          }
        });
      }

      status.value = 'connected';
      lastMessage.value = 'Connected.';
      addLogMessage('Connected to Archipelago server!', 'info');
    } catch (e: any) {
      status.value = 'error';
      lastMessage.value = e?.message ?? String(e);
      addLogMessage(`Connection error: ${e?.message ?? String(e)}`, 'error');
      // Disable Archipelago mode on connection failure
      items.disableArchipelagoMode();
    }
  }

  async function disconnect() {
    try {
      client.disconnect();
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

  function checkPuzzleSolved() {
    if (status.value !== 'connected') return;
    try {
      client.locations.check([AP_LOCATIONS.SOLVE_PUZZLE] as any);
      lastMessage.value = `Reported solve (location ${AP_LOCATIONS.SOLVE_PUZZLE}).`;
      addLogMessage('Puzzle solved! Check sent to server.', 'info');
    } catch (e: any) {
      lastMessage.value = e?.message ?? String(e);
      addLogMessage(`Error reporting solve: ${e?.message ?? String(e)}`, 'error');
    }
  }

  // Debug function to simulate receiving an item (for testing)
  function debugReceiveItem(itemId: number) {
    const itemName = handleItemReceived(itemId);
    if (itemName) {
      addLogMessage(`[DEBUG] Received: ${itemName}`, 'item');
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
    checkPuzzleSolved,
    debugReceiveItem,
    // Expose items composable
    items,
  };
}
