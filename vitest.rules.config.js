import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Every rules test file clears the same emulator database, so files must run one at a time.
  test: { environment: 'node', include: ['tests/rules/**/*.test.js'], testTimeout: 20000, fileParallelism: false },
})
