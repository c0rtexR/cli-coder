/**
 * Real CLI Test Runner
 * Tests actual CLI commands in real environments
 */

import { execSync } from 'child_process';
import { TestRig } from '../e2e/run-tests.js';

export class RealCLITestRig extends TestRig {
  constructor() {
    super();
    this.cliCommand = 'cli-coder'; // Assumes global install
  }

  runRealCommand(command, options = {}) {
    const execOptions = {
      cwd: this.testDir,
      encoding: 'utf-8',
      ...options,
    };

    return execSync(`${this.cliCommand} ${command}`, execOptions);
  }

  testCommandExists() {
    try {
      execSync('which cli-coder', { encoding: 'utf-8' });
      return true;
    } catch {
      return false;
    }
  }
}

// Basic test runner
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running Real CLI tests...');
  
  const testRig = new RealCLITestRig();
  
  try {
    if (!testRig.testCommandExists()) {
      console.log('⚠ CLI not installed globally, skipping real CLI tests');
      process.exit(0);
    }
    
    console.log('✓ Real CLI test infrastructure ready');
  } catch (error) {
    console.error('✗ Real CLI tests failed:', error.message);
    process.exit(1);
  } finally {
    testRig.cleanup();
  }
}