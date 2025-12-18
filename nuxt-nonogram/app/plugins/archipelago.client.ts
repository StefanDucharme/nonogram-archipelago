import { Client } from 'archipelago.js';

export default defineNuxtPlugin(() => {
  const apClient = new Client();
  return { provide: { apClient } };
});
