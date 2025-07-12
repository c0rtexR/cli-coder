import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * RealCLITestRig for testing actually installed CLI
 * 
 * Tests the CLI as it would be used by real users when installed
 * globally or available in the system PATH.
 */
export class RealCLITestRig {
  constructor(cliCommand = 'cli-coder') {
    this.cliCommand = cliCommand;
    this.testDir = null;
    this.lastResult = null;
  }

  /**
   * Setup test environment
   */
  async setup(testName) {
    // Create temporary directory for test files
    this.testDir = mkdtempSync(join(tmpdir(), `real-cli-test-${testName}-`));
  }

  /**
   * Check if CLI command is available in PATH
   */
  isCliAvailable() {
    try {
      const result = spawnSync(this.cliCommand, ['--version'], {
        timeout: 5000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      return result.status === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Run CLI command using global installation
   */
  runCommand(args = [], options = {}) {
    const {
      cwd = this.testDir,
      timeout = 10000,
      env = process.env,
      input = null
    } = options;

    try {
      const result = spawnSync(this.cliCommand, args, {
        cwd,
        timeout,
        env,
        input,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.lastResult = {
        success: !result.error && result.status !== null,
        exitCode: result.status || 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        error: result.error,
        signal: result.signal
      };

      return this.lastResult;
    } catch (error) {
      this.lastResult = {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: error.message,
        error: error,
        signal: null
      };

      return this.lastResult;
    }
  }

  /**
   * Run shell command that includes CLI
   */
  runShellCommand(command, options = {}) {
    const {
      cwd = this.testDir,
      timeout = 10000,
      env = process.env
    } = options;

    const shell = process.platform === 'win32' ? 'cmd.exe' : 'sh';
    const shellFlag = process.platform === 'win32' ? '/c' : '-c';

    try {
      const result = spawnSync(shell, [shellFlag, command], {
        cwd,
        timeout,
        env,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.lastResult = {
        success: !result.error && result.status === 0,
        exitCode: result.status || 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        error: result.error,
        signal: result.signal
      };

      return this.lastResult;
    } catch (error) {
      this.lastResult = {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: error.message,
        error: error,
        signal: null
      };

      return this.lastResult;
    }
  }

  /**
   * Get the last command result
   */
  getLastResult() {
    return this.lastResult;
  }

  /**
   * Get temporary directory path
   */
  getTempDir() {
    return this.testDir;
  }

  /**
   * Check which CLI command is being used
   */
  getCliCommand() {
    return this.cliCommand;
  }

  /**
   * Get CLI installation path
   */
  getCliPath() {
    try {
      const result = spawnSync('which', [this.cliCommand], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (result.status === 0) {
        return result.stdout.trim();
      }

      // Try Windows where command
      const winResult = spawnSync('where', [this.cliCommand], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (winResult.status === 0) {
        return winResult.stdout.trim().split('\n')[0];
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get CLI version information
   */
  getCliVersion() {
    const result = this.runCommand(['version', '--json']);
    
    if (result.success) {
      try {
        return JSON.parse(result.stdout);
      } catch (error) {
        return null;
      }
    }
    
    return null;
  }

  /**
   * Verify CLI installation is working
   */
  verifyInstallation() {
    const checks = {
      available: this.isCliAvailable(),
      path: this.getCliPath(),
      version: this.getCliVersion(),
      help: null
    };

    // Test help command
    const helpResult = this.runCommand(['--help']);
    checks.help = helpResult.success;

    return checks;
  }

  /**
   * Create test file in temp directory
   */
  createTestFile(filename, content) {
    const fullPath = join(this.testDir, filename);
    const { writeFileSync } = require('fs');
    writeFileSync(fullPath, content, 'utf8');
    return fullPath;
  }

  /**
   * Check if test file exists
   */
  testFileExists(filename) {
    const fullPath = join(this.testDir, filename);
    const { existsSync } = require('fs');
    return existsSync(fullPath);
  }

  /**
   * Read test file content
   */
  readTestFile(filename) {
    const fullPath = join(this.testDir, filename);
    const { readFileSync } = require('fs');
    return readFileSync(fullPath, 'utf8');
  }

  /**
   * Initialize git repository in test directory
   */
  initGitInTestDir() {
    spawnSync('git', ['init'], { cwd: this.testDir });
    spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: this.testDir });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: this.testDir });
  }

  /**
   * Check if test directory is git repository
   */
  isGitRepo() {
    const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: this.testDir,
      encoding: 'utf8'
    });
    
    return result.status === 0 && result.stdout.trim() === 'true';
  }

  /**
   * Test CLI performance
   */
  measurePerformance(args = ['--version'], iterations = 3) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const result = this.runCommand(args);
      const endTime = Date.now();
      
      if (result.success) {
        times.push(endTime - startTime);
      }
    }

    if (times.length === 0) {
      return null;
    }

    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      times: times
    };
  }

  /**
   * Get system information for CLI testing
   */
  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
      path: process.env.PATH,
      home: process.env.HOME || process.env.USERPROFILE,
      testDir: this.testDir
    };
  }

  /**
   * Assert command succeeded
   */
  assertSuccess(result, message = '') {
    if (!result.success) {
      throw new Error(`${message}\nCommand failed.\nExit code: ${result.exitCode}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`);
    }
  }

  /**
   * Assert command failed
   */
  assertFailure(result, message = '') {
    if (result.success) {
      throw new Error(`${message}\nExpected command to fail but it succeeded.\nStdout: ${result.stdout}`);
    }
  }

  /**
   * Assert output contains text
   */
  assertOutputContains(result, expectedText, message = '') {
    if (!result.stdout.includes(expectedText)) {
      throw new Error(`${message}\nExpected output to contain: ${expectedText}\nActual output: ${result.stdout}`);
    }
  }

  /**
   * Assert error contains text
   */
  assertErrorContains(result, expectedText, message = '') {
    if (!result.stderr.includes(expectedText)) {
      throw new Error(`${message}\nExpected error to contain: ${expectedText}\nActual error: ${result.stderr}`);
    }
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
}