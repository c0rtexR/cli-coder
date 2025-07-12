import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * TestRig for E2E CLI Testing
 * 
 * Creates isolated environments for testing CLI commands
 * as they would be executed by real users.
 */
export class TestRig {
  constructor() {
    this.testDir = null;
    this.cliPath = null;
    this.lastExitCode = 0;
    this.lastOutput = '';
    this.lastError = '';
  }

  /**
   * Setup isolated test environment
   */
  async setup(testName) {
    // Create temporary directory for this test
    this.testDir = mkdtempSync(join(tmpdir(), `cli-coder-test-${testName}-`));
    
    // Set CLI path to built executable
    this.cliPath = resolve(__dirname, '../../../dist/index.js');
    
    // Verify CLI exists
    if (!this.cliPath) {
      throw new Error('CLI executable not found. Run `npm run build` first.');
    }
  }

  /**
   * Run CLI command in isolated environment
   */
  run(args = [], options = {}) {
    const {
      cwd = this.testDir,
      timeout = 10000,
      input = null
    } = options;

    try {
      const result = spawnSync('node', [this.cliPath, ...args], {
        cwd,
        timeout,
        input,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.lastExitCode = result.status || 0;
      this.lastOutput = result.stdout || '';
      this.lastError = result.stderr || '';

      // Return combined output for easier testing
      const output = this.lastOutput + (this.lastError ? '\n' + this.lastError : '');
      
      // If command failed, throw error with output
      if (result.error) {
        throw new Error(`Command failed: ${result.error.message}\nOutput: ${output}`);
      }

      return output.trim();
    } catch (error) {
      // Handle timeout and other errors
      this.lastExitCode = 1;
      this.lastError = error.message;
      throw error;
    }
  }

  /**
   * Run command and expect it to succeed
   */
  runExpectSuccess(args = [], options = {}) {
    const output = this.run(args, options);
    
    if (this.lastExitCode !== 0) {
      throw new Error(`Expected command to succeed but got exit code ${this.lastExitCode}.\nOutput: ${output}`);
    }
    
    return output;
  }

  /**
   * Run command and expect it to fail
   */
  runExpectFailure(args = [], options = {}) {
    try {
      const output = this.run(args, options);
      
      if (this.lastExitCode === 0) {
        throw new Error(`Expected command to fail but it succeeded.\nOutput: ${output}`);
      }
      
      return output;
    } catch (error) {
      // If it threw due to non-zero exit, that's expected
      if (this.lastExitCode !== 0) {
        return this.lastOutput + '\n' + this.lastError;
      }
      throw error;
    }
  }

  /**
   * Check if CLI executable exists and is executable
   */
  verifyCLIExists() {
    try {
      const result = spawnSync('node', [this.cliPath, '--version'], {
        timeout: 5000,
        encoding: 'utf8'
      });
      
      return result.status === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current working directory for tests
   */
  getTestDir() {
    return this.testDir;
  }

  /**
   * Get last command exit code
   */
  getLastExitCode() {
    return this.lastExitCode;
  }

  /**
   * Get last command output
   */
  getLastOutput() {
    return this.lastOutput;
  }

  /**
   * Get last command error output
   */
  getLastError() {
    return this.lastError;
  }

  /**
   * Create a file in test directory
   */
  createFile(relativePath, content) {
    const fullPath = join(this.testDir, relativePath);
    const dir = dirname(fullPath);
    
    // Create directory if it doesn't exist
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(fullPath, content, 'utf8');
    return fullPath;
  }

  /**
   * Check if file exists in test directory
   */
  fileExists(relativePath) {
    const fullPath = join(this.testDir, relativePath);
    return existsSync(fullPath);
  }

  /**
   * Read file from test directory
   */
  readFile(relativePath) {
    const fullPath = join(this.testDir, relativePath);
    return readFileSync(fullPath, 'utf8');
  }

  /**
   * Create git repository in test directory
   */
  initGitRepo() {
    spawnSync('git', ['init'], { cwd: this.testDir });
    spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: this.testDir });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: this.testDir });
  }

  /**
   * Check if test directory is a git repository
   */
  isGitRepo() {
    const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: this.testDir,
      encoding: 'utf8'
    });
    
    return result.status === 0 && result.stdout.trim() === 'true';
  }

  /**
   * Clean up test environment
   */
  async cleanup() {
    if (this.testDir) {
      try {
        rmSync(this.testDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup test directory ${this.testDir}:`, error.message);
      }
      this.testDir = null;
    }
  }

  /**
   * Assert that output contains expected text
   */
  assertOutputContains(expectedText, message = '') {
    if (!this.lastOutput.includes(expectedText)) {
      throw new Error(`${message}\nExpected output to contain: ${expectedText}\nActual output: ${this.lastOutput}`);
    }
  }

  /**
   * Assert that error output contains expected text
   */
  assertErrorContains(expectedText, message = '') {
    if (!this.lastError.includes(expectedText)) {
      throw new Error(`${message}\nExpected error to contain: ${expectedText}\nActual error: ${this.lastError}`);
    }
  }

  /**
   * Assert exit code matches expected
   */
  assertExitCode(expectedCode, message = '') {
    if (this.lastExitCode !== expectedCode) {
      throw new Error(`${message}\nExpected exit code: ${expectedCode}\nActual exit code: ${this.lastExitCode}\nOutput: ${this.lastOutput}\nError: ${this.lastError}`);
    }
  }
}

// Helper function to import fs functions
function importFs() {
  const fs = require('fs');
  return {
    existsSync: fs.existsSync,
    mkdirSync: fs.mkdirSync,
    writeFileSync: fs.writeFileSync,
    readFileSync: fs.readFileSync
  };
}

// Import fs functions
const { existsSync, mkdirSync, writeFileSync, readFileSync } = importFs();
const { dirname } = require('path');