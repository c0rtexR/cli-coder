/**
 * End-to-End Test Runner
 * Inspired by google-gemini/gemini-cli testing approach
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from 'process';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class TestRig {
  constructor() {
    this.bundlePath = join(__dirname, '../../dist/index.js');
    this.testDir = null;
    this.testName = null;
  }

  setup(testName) {
    this.testName = testName;
    const sanitizedName = testName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    this.testDir = join(env.TEST_DIR || '/tmp', 'cli-coder-e2e', sanitizedName);
    mkdirSync(this.testDir, { recursive: true });
    return this.testDir;
  }

  createFile(fileName, content) {
    const filePath = join(this.testDir, fileName);
    writeFileSync(filePath, content);
    return filePath;
  }

  run(command, options = {}) {
    const execOptions = {
      cwd: this.testDir,
      encoding: 'utf-8',
      ...options,
    };

    return execSync(`node ${this.bundlePath} ${command}`, execOptions);
  }

  cleanup() {
    if (this.testDir && !env.KEEP_OUTPUT) {
      try {
        rmSync(this.testDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup test directory: ${error.message}`);
      }
    }
  }
}

// Basic test runner
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running E2E tests...');
  
  // Add basic test scenarios here
  const testRig = new TestRig();
  
  try {
    console.log('✓ E2E test infrastructure ready');
  } catch (error) {
    console.error('✗ E2E tests failed:', error.message);
    process.exit(1);
  } finally {
    testRig.cleanup();
  }
}