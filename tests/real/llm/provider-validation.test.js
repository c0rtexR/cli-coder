import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, exec } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Real LLM Provider Validation', () => {
  let tempDir;
  let tempConfigPath;
  let originalCwd;

  beforeEach(async () => {
    originalCwd = process.cwd();
    
    // Setup temporary directory
    tempDir = join(tmpdir(), `cli-coder-real-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    tempConfigPath = join(tempDir, '.cli-coder');
    await fs.mkdir(tempConfigPath, { recursive: true });

    // Change to temp directory for tests
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('CLI Integration Tests', () => {
    it('should install and run CLI successfully', async () => {
      try {
        // Test that CLI binary exists and is executable
        const { stdout, stderr } = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' --help');
        
        expect(stderr).toBe('');
        expect(stdout).toContain('cli-coder');
        expect(stdout).toContain('AI-powered CLI coding assistant');
      } catch (error) {
        throw new Error(`CLI execution failed: ${error.message}`);
      }
    });

    it('should validate version command works', async () => {
      try {
        const { stdout } = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' version');
        
        expect(stdout).toContain('cli-coder');
        expect(stdout).toMatch(/\\d+\\.\\d+\\.\\d+/); // Version pattern
      } catch (error) {
        throw new Error(`Version command failed: ${error.message}`);
      }
    });
  });

  describe('Configuration Validation Tests', () => {
    it('should handle missing configuration gracefully', async () => {
      try {
        const result = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' config --list');
        // This should fail because no config exists
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        // Expected to fail
        expect(error.stderr || error.stdout).toContain('Config not found');
      }
    });

    it('should validate configuration with proper LLM settings', async () => {
      const config = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123456789abcdef',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000
        },
        shell: {
          confirmationRequired: true,
          defaultTimeout: 30000,
          allowDangerousCommands: false,
          historySize: 100
        },
        editor: {
          defaultEditor: 'code',
          tempDir: '/tmp'
        },
        session: {
          saveHistory: true,
          maxHistorySize: 100
        }
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const { stdout } = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' config --list');
      
      expect(stdout).toContain('Current Configuration');
      expect(stdout).toContain('Provider: openai');
      expect(stdout).toContain('Model: gpt-4');
      expect(stdout).toContain('Temperature: 0.7');
      expect(stdout).toContain('Max Tokens: 1000');
      
      // API key should be masked
      expect(stdout).toContain('API Key: sk-test1...');
      expect(stdout).not.toContain('sk-test123456789abcdef');
    });

    it('should handle malformed JSON configuration', async () => {
      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        'invalid json { content'
      );

      try {
        await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' config --list');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.stderr || error.stdout).toContain('Configuration error');
      }
    });

    it('should validate different provider configurations', async () => {
      // Test Anthropic configuration
      const anthropicConfig = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-test123456789abcdef',
          model: 'claude-3-sonnet-20240229',
          temperature: 0.5,
          maxTokens: 2000
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(anthropicConfig, null, 2)
      );

      const { stdout } = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' config --list');
      
      expect(stdout).toContain('Provider: anthropic');
      expect(stdout).toContain('Model: claude-3-sonnet-20240229');
      expect(stdout).toContain('Temperature: 0.5');
      expect(stdout).toContain('Max Tokens: 2000');
      expect(stdout).toContain('API Key: sk-ant-t...');
    });
  });

  describe('Environment Override Tests', () => {
    it('should respect OpenAI environment variable override', async () => {
      const config = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-config123',
          model: 'gpt-4'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const env = {
        ...process.env,
        OPENAI_API_KEY: 'sk-env-override123456'
      };

      const { stdout } = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' config --list', { env });
      
      expect(stdout).toContain('Provider: openai');
      // Should show masked environment key
      expect(stdout).toContain('API Key: sk-env-o...');
      expect(stdout).not.toContain('sk-config123');
    });

    it('should respect Anthropic environment variable override', async () => {
      const config = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-config123',
          model: 'claude-3-sonnet-20240229'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const env = {
        ...process.env,
        ANTHROPIC_API_KEY: 'sk-ant-env-override123456'
      };

      const { stdout } = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' config --list', { env });
      
      expect(stdout).toContain('Provider: anthropic');
      // Should show masked environment key
      expect(stdout).toContain('API Key: sk-ant-e...');
      expect(stdout).not.toContain('sk-ant-config123');
    });
  });

  describe('Performance Tests', () => {
    it('should start CLI within performance threshold', async () => {
      const startTime = Date.now();
      
      await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' --help');
      
      const duration = Date.now() - startTime;
      
      // CLI should start within 2 seconds for real-world usage
      expect(duration).toBeLessThan(2000);
    });

    it('should handle config loading within performance threshold', async () => {
      const config = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123456789',
          model: 'gpt-4'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const startTime = Date.now();
      
      await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' config --list');
      
      const duration = Date.now() - startTime;
      
      // Config loading should be fast
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Security Tests', () => {
    it('should mask API keys in all output', async () => {
      const sensitiveKey = 'sk-very-sensitive-api-key-123456789abcdef';
      
      const config = {
        llm: {
          provider: 'openai',
          apiKey: sensitiveKey,
          model: 'gpt-4'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const { stdout } = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' config --list');
      
      // Sensitive key should never appear in output
      expect(stdout).not.toContain(sensitiveKey);
      expect(stdout).not.toContain('sk-very-sensitive');
      
      // Should show masked version
      expect(stdout).toContain('API Key: sk-very-...');
    });

    it('should handle environment variables securely', async () => {
      const sensitiveEnvKey = 'sk-env-very-sensitive-123456789abcdef';
      
      const config = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-config123',
          model: 'gpt-4'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const env = {
        ...process.env,
        OPENAI_API_KEY: sensitiveEnvKey
      };

      const { stdout } = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' config --list', { env });
      
      // Sensitive environment key should never appear in output
      expect(stdout).not.toContain(sensitiveEnvKey);
      expect(stdout).not.toContain('sk-env-very-sensitive');
      
      // Should show masked version
      expect(stdout).toContain('API Key: sk-env-v...');
    });
  });

  describe('Cross-Platform Tests', () => {
    it('should work on current platform', async () => {
      const { stdout } = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' version --json');
      
      const versionInfo = JSON.parse(stdout);
      
      expect(versionInfo.platform).toBe(process.platform);
      expect(versionInfo.arch).toBe(process.arch);
      expect(versionInfo.node).toBe(process.version);
    });

    it('should handle file system operations correctly', async () => {
      const config = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4'
        },
        shell: {},
        editor: {},
        session: {}
      };

      // Test file creation and reading
      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const { stdout } = await execAsync('node ' + join(originalCwd, 'bin', 'cli-coder') + ' config --list');
      
      expect(stdout).toContain('Provider: openai');
      
      // Verify file was created properly
      const configContent = await fs.readFile(join(tempConfigPath, 'config.json'), 'utf8');
      const parsedConfig = JSON.parse(configContent);
      expect(parsedConfig.llm.provider).toBe('openai');
    });
  });
});