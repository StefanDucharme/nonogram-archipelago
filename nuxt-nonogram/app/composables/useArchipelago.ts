import type { Client } from 'archipelago.js';

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

  // Example: your AP “world” should define a numeric location id for “Solve a nonogram”.
  // Replace with real ids from your AP game data package later.
  const solveLocationId = 9000001;

  async function connect() {
    try {
      status.value = 'connecting';
      lastMessage.value = '';

      // archipelago.js: connect + login style API (see docs)
      // If the exact signatures differ with version bumps, follow the library docs.
      await client.connect({
        hostname: host.value,
        port: port.value,
        name: slot.value,
        password: password.value || undefined,
        // game is important for AP; when you build a proper AP “world” for Nonogram,
        // this should match that game name in the data package.
        game: 'Nonogram',
        // optional tags/versioning can go here
      } as any);

      status.value = 'connected';
      lastMessage.value = 'Connected.';
    } catch (e: any) {
      status.value = 'error';
      lastMessage.value = e?.message ?? String(e);
    }
  }

  async function disconnect() {
    try {
      client.disconnect();
    } finally {
      status.value = 'disconnected';
      lastMessage.value = 'Disconnected.';
    }
  }

  function checkPuzzleSolved() {
    if (status.value !== 'connected') return;
    try {
      // In AP protocol terms this corresponds to “LocationChecks” with numeric ids.
      // Your AP world must define these ids, otherwise the server will ignore/complain.
      client.locations.check([solveLocationId] as any);
      lastMessage.value = `Reported solve (location ${solveLocationId}).`;
    } catch (e: any) {
      lastMessage.value = e?.message ?? String(e);
    }
  }

  return {
    host,
    port,
    slot,
    password,
    status,
    lastMessage,
    connect,
    disconnect,
    checkPuzzleSolved,
  };
}
