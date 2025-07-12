import { strict as assert } from 'assert';
import { test } from 'node:test';
import { TestRig } from '../helpers/test-rig.js';

test('Configuration command E2E scenarios', async (t) => {
  await t.test('config help shows all available options', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    const output = rig.run('config --help');

    assert.ok(output.includes('Manage configuration'));
    assert.ok(output.includes('--list'));
    assert.ok(output.includes('--setup'));
    assert.ok(output.includes('--setup-shell'));
    assert.ok(output.includes('--global'));

    rig.cleanup();
  });

  await t.test('config list shows current configuration with defaults', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    // Create minimal valid config
    rig.createFile('.cli-coder/config.json', JSON.stringify({
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123456789',
        model: 'gpt-4'
      }
    }, null, 2));

    const output = rig.run('config --list');

    assert.ok(output.includes('Current Configuration:'));
    assert.ok(output.includes('LLM Settings:'));
    assert.ok(output.includes('Provider: openai'));
    assert.ok(output.includes('Model: gpt-4'));
    assert.ok(output.includes('Shell Settings:'));
    assert.ok(output.includes('Session Settings:'));

    rig.cleanup();
  });

  await t.test('config list masks API keys in output', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    const apiKey = 'sk-very-long-secret-api-key-123456789';
    rig.createFile('.cli-coder/config.json', JSON.stringify({
      llm: {
        provider: 'anthropic',
        apiKey: apiKey,
        model: 'claude-3-sonnet'
      }
    }, null, 2));

    const output = rig.run('config --list');

    // Should show masked version
    assert.ok(output.includes('sk-very-...'));
    // Should NOT show full API key
    assert.ok(!output.includes(apiKey));
    assert.ok(!output.includes('sk-very-long-secret-api-key-123456789'));

    rig.cleanup();
  });

  await t.test('config list shows shell configuration details', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    rig.createFile('.cli-coder/config.json', JSON.stringify({
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      },
      shell: {
        allowDangerousCommands: true,
        defaultTimeout: 45000,
        confirmationRequired: false,
        historySize: 200
      }
    }, null, 2));

    const output = rig.run('config --list');

    assert.ok(output.includes('Confirmation Required: false'));
    assert.ok(output.includes('Default Timeout: 45s'));
    assert.ok(output.includes('Allow Dangerous: true'));
    assert.ok(output.includes('History Size: 200'));

    rig.cleanup();
  });

  await t.test('config list handles missing configuration file', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    // No config file exists
    const result = rig.runWithExitCode('config --list');

    // Should exit with error when no valid config exists
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Error') || result.stdout.includes('Error'));

    rig.cleanup();
  });

  await t.test('config list shows editor and session settings', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    rig.createFile('.cli-coder/config.json', JSON.stringify({
      llm: {
        provider: 'gemini',
        apiKey: 'AIzaSyTest123',
        model: 'gemini-1.5-pro'
      },
      editor: {
        defaultEditor: 'vim',
        tempDir: '/tmp/custom'
      },
      session: {
        saveHistory: false,
        maxHistorySize: 500
      }
    }, null, 2));

    const output = rig.run('config --list');

    assert.ok(output.includes('Save History: false'));
    assert.ok(output.includes('Max History: 500'));

    rig.cleanup();
  });

  await t.test('config command without arguments shows help', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    const output = rig.run('config');

    assert.ok(output.includes('Usage:') || output.includes('help'));
    assert.ok(output.includes('config') || output.includes('Manage configuration'));

    rig.cleanup();
  });

  await t.test('config respects environment variable overrides in list', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    // Create base config
    rig.createFile('.cli-coder/config.json', JSON.stringify({
      llm: {
        provider: 'openai',
        apiKey: 'file-key',
        model: 'gpt-4'
      },
      shell: {
        defaultTimeout: 30000,
        allowDangerousCommands: false
      }
    }, null, 2));

    // Set environment variables
    const envVars = {
      'OPENAI_API_KEY': 'env-override-key',
      'CLI_CODER_SHELL_TIMEOUT': '60000',
      'CLI_CODER_ALLOW_DANGEROUS': 'true'
    };

    const output = rig.runWithEnv('config --list', envVars);

    // Should show environment overrides
    assert.ok(output.includes('env-overr...'));  // Masked env key
    assert.ok(output.includes('Default Timeout: 60s'));
    assert.ok(output.includes('Allow Dangerous: true'));

    rig.cleanup();
  });

  await t.test('config handles corrupted configuration file gracefully', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    // Create invalid JSON file
    rig.createFile('.cli-coder/config.json', '{ invalid json content ');

    const result = rig.runWithExitCode('config --list');

    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('Error') || result.stdout.includes('Error'));

    rig.cleanup();
  });

  await t.test('config setup command shows placeholder message', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    const output = rig.run('config --setup');

    // Since this is a placeholder implementation
    assert.ok(output.includes('🚧') || output.includes('will be implemented'));

    rig.cleanup();
  });

  await t.test('config setup-shell command shows placeholder message', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    const output = rig.run('config --setup-shell');

    // Since this is a placeholder implementation
    assert.ok(output.includes('🚧') || output.includes('will be implemented'));

    rig.cleanup();
  });

  await t.test('config global flag works with list command', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    // Create config file
    rig.createFile('.cli-coder/config.json', JSON.stringify({
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      }
    }, null, 2));

    const output = rig.run('config --global --list');

    assert.ok(output.includes('Current Configuration:'));
    assert.ok(output.includes('Provider: openai'));

    rig.cleanup();
  });

  await t.test('config handles multiple LLM providers correctly', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    const testCases = [
      {
        provider: 'openai',
        apiKey: 'sk-openai123',
        model: 'gpt-4'
      },
      {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet'
      },
      {
        provider: 'gemini',
        apiKey: 'AIzaSyTest123',
        model: 'gemini-1.5-pro'
      }
    ];

    for (const testCase of testCases) {
      rig.createFile('.cli-coder/config.json', JSON.stringify({
        llm: testCase
      }, null, 2));

      const output = rig.run('config --list');

      assert.ok(output.includes(`Provider: ${testCase.provider}`));
      assert.ok(output.includes(`Model: ${testCase.model}`));
      // API key should be masked
      assert.ok(output.includes('...'));
    }

    rig.cleanup();
  });

  await t.test('config validates required LLM configuration', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    // Create config missing required fields
    rig.createFile('.cli-coder/config.json', JSON.stringify({
      shell: {
        allowDangerousCommands: false
      }
    }, null, 2));

    const result = rig.runWithExitCode('config --list');

    assert.strictEqual(result.exitCode, 1);

    rig.cleanup();
  });

  await t.test('config shows default values when sections are missing', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    // Create minimal config
    rig.createFile('.cli-coder/config.json', JSON.stringify({
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      }
    }, null, 2));

    const output = rig.run('config --list');

    // Should show default values for missing sections
    assert.ok(output.includes('Confirmation Required: true'));
    assert.ok(output.includes('Default Timeout: 30s'));
    assert.ok(output.includes('Allow Dangerous: false'));
    assert.ok(output.includes('History Size: 100'));
    assert.ok(output.includes('Save History: true'));
    assert.ok(output.includes('Max History: 100'));

    rig.cleanup();
  });

  await t.test('config performance is acceptable', async () => {
    const rig = new TestRig();
    rig.setup(t.name);

    // Create config file
    rig.createFile('.cli-coder/config.json', JSON.stringify({
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      }
    }, null, 2));

    const startTime = Date.now();
    rig.run('config --list');
    const endTime = Date.now();

    // Should complete within reasonable time (5 seconds for E2E)
    const duration = endTime - startTime;
    assert.ok(duration < 5000, `Config command took ${duration}ms, expected < 5000ms`);

    rig.cleanup();
  });
});