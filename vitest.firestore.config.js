import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Every Firestore rules test file clears the same emulator, so files run one at a time.
  test: { environment: 'node', include: ['tests/firestore/**/*.test.js'], testTimeout: 20000, fileParallelism: false },
})
