import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['scripts/balance.sim.ts'], testTimeout: 600000 } });
