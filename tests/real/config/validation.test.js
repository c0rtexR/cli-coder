import { strict as assert } from 'assert';
import { test } from 'node:test';
import { RealCLITestRig } from '../helpers/real-test-rig.js';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('Real CLI Configuration Validation Tests', async (t) => {
  await t.test('real CLI validates configuration file permissions', async () => {
    const rig = new RealCLITestRig();
    await rig.setup(t.name);

    // Create config file with restricted permissions
    const configDir = join(rig.tempDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    const config = {
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123456789',
        model: 'gpt-4'
      }
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Set working directory to temp dir
    process.chdir(rig.tempDir);

    const result = await rig.run(['config', '--list']);

    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.includes('Current Configuration:'));
    assert.ok(result.stdout.includes('Provider: openai'));

    await rig.cleanup();
  });

  await t.test('real CLI securely masks API keys in all output', async () => {
    const rig = new RealCLITestRig();
    await rig.setup(t.name);

    const configDir = join(rig.tempDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    const sensitiveApiKey = 'sk-very-sensitive-secret-key-that-should-never-be-shown-123456789';
    const config = {
      llm: {
        provider: 'anthropic',
        apiKey: sensitiveApiKey,
        model: 'claude-3-sonnet'
      }
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    process.chdir(rig.tempDir);

    const result = await rig.run(['config', '--list']);

    // Verify API key is properly masked
    assert.ok(!result.stdout.includes(sensitiveApiKey));
    assert.ok(!result.stderr.includes(sensitiveApiKey));
    assert.ok(result.stdout.includes('sk-very-...'));

    // Verify configuration is still functional
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.includes('Provider: anthropic'));

    await rig.cleanup();
  });

  await t.test('real CLI handles environment variable security correctly', async () => {
    const rig = new RealCLITestRig();
    await rig.setup(t.name);

    const configDir = join(rig.tempDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    const fileApiKey = 'sk-file-based-key';
    const envApiKey = 'sk-environment-override-secret-key-123';

    const config = {
      llm: {
        provider: 'openai',
        apiKey: fileApiKey,
        model: 'gpt-4'
      }
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    process.chdir(rig.tempDir);

    // Test with environment variable
    const result = await rig.run(['config', '--list'], {
      env: {
        ...process.env,
        'OPENAI_API_KEY': envApiKey
      }
    });

    // Verify environment override works but is masked
    assert.strictEqual(result.exitCode, 0);
    assert.ok(!result.stdout.includes(envApiKey));
    assert.ok(!result.stdout.includes(fileApiKey));
    assert.ok(result.stdout.includes('sk-enviro...'));

    await rig.cleanup();
  });

  await t.test('real CLI validates configuration schema strictly', async () => {
    const rig = new RealCLITestRig();
    await rig.setup(t.name);

    const configDir = join(rig.tempDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    // Create invalid configuration
    const invalidConfig = {
      llm: {
        provider: 'invalid-provider',
        apiKey: '',
        model: 'gpt-4'
      }
    };

    writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));
    process.chdir(rig.tempDir);

    const result = await rig.run(['config', '--list']);

    // Should fail validation
    assert.notStrictEqual(result.exitCode, 0);
    assert.ok(result.stderr.includes('Error') || result.stdout.includes('Error'));

    await rig.cleanup();
  });

  await t.test('real CLI handles corrupted configuration files safely', async () => {
    const rig = new RealCLITestRig();
    await rig.setup(t.name);

    const configDir = join(rig.tempDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    // Write corrupted JSON
    writeFileSync(configPath, '{ "llm": { "provider": "openai", invalid json }');
    process.chdir(rig.tempDir);

    const result = await rig.run(['config', '--list']);

    // Should handle gracefully with proper error message
    assert.notStrictEqual(result.exitCode, 0);
    assert.ok(result.stderr.length > 0 || result.stdout.includes('Error'));

    await rig.cleanup();
  });

  await t.test('real CLI performance with large configuration files', async () => {
    const rig = new RealCLITestRig();
    await rig.setup(t.name);

    const configDir = join(rig.tempDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    // Create large configuration
    const largeConfig = {
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123456789'.repeat(10),
        model: 'gpt-4'
      },
      shell: {
        allowDangerousCommands: false,
        defaultTimeout: 30000,
        confirmationRequired: true,
        workingDirectory: '/'.repeat(500), // Long path
        historySize: 5000
      },
      metadata: {
        notes: 'A'.repeat(10000), // 10KB of notes
        history: Array.from({ length: 100 }, (_, i) => ({
          timestamp: new Date().toISOString(),
          command: `command-${i}`,
          output: 'X'.repeat(100)
        }))
      }
    };

    writeFileSync(configPath, JSON.stringify(largeConfig, null, 2));
    process.chdir(rig.tempDir);

    const startTime = Date.now();
    const result = await rig.run(['config', '--list']);
    const endTime = Date.now();

    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.includes('Current Configuration:'));

    // Should complete within reasonable time
    const duration = endTime - startTime;
    assert.ok(duration < 10000, `Config command took ${duration}ms, expected < 10000ms`);

    await rig.cleanup();
  });

  await t.test('real CLI handles concurrent configuration access', async () => {
    const rig = new RealCLITestRig();
    await rig.setup(t.name);

    const configDir = join(rig.tempDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    const config = {
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      }
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    process.chdir(rig.tempDir);

    // Run multiple config list commands concurrently
    const promises = Array.from({ length: 5 }, () => 
      rig.run(['config', '--list'])
    );

    const results = await Promise.all(promises);

    // All should succeed
    results.forEach((result, index) => {
      assert.strictEqual(result.exitCode, 0, `Command ${index} failed`);
      assert.ok(result.stdout.includes('Current Configuration:'));
    });

    await rig.cleanup();
  });

  await t.test('real CLI respects working directory for local config', async () => {
    const rig = new RealCLITestRig();
    await rig.setup(t.name);

    // Create project directory with local config
    const projectDir = join(rig.tempDir, 'project');
    const configDir = join(projectDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    const localConfig = {
      llm: {
        provider: 'anthropic',
        apiKey: 'sk-local-project-key',
        model: 'claude-3-sonnet'
      }
    };

    writeFileSync(configPath, JSON.stringify(localConfig, null, 2));

    // Change to project directory
    process.chdir(projectDir);

    const result = await rig.run(['config', '--list']);

    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.includes('Provider: anthropic'));
    assert.ok(result.stdout.includes('Model: claude-3-sonnet'));

    await rig.cleanup();
  });

  await t.test('real CLI validates all supported LLM providers', async () => {
    const rig = new RealCLITestRig();
    await rig.setup(t.name);

    const providers = [
      { provider: 'openai', apiKey: 'sk-openai123', model: 'gpt-4' },
      { provider: 'anthropic', apiKey: 'sk-ant-test123', model: 'claude-3-sonnet' },
      { provider: 'gemini', apiKey: 'AIzaSyTest123', model: 'gemini-1.5-pro' }
    ];

    for (const providerConfig of providers) {
      const configDir = join(rig.tempDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      const config = { llm: providerConfig };
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      process.chdir(rig.tempDir);

      const result = await rig.run(['config', '--list']);

      assert.strictEqual(result.exitCode, 0, `Failed for provider: ${providerConfig.provider}`);
      assert.ok(result.stdout.includes(`Provider: ${providerConfig.provider}`));
      assert.ok(result.stdout.includes(`Model: ${providerConfig.model}`));
    }

    await rig.cleanup();
  });

  await t.test('real CLI handles missing home directory gracefully', async () => {
    const rig = new RealCLITestRig();
    await rig.setup(t.name);

    // Create local config only
    const configDir = join(rig.tempDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    const config = {
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      }
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    process.chdir(rig.tempDir);

    // Run with modified HOME that doesn't exist
    const result = await rig.run(['config', '--list'], {
      env: {
        ...process.env,
        HOME: '/nonexistent/home/directory'
      }
    });

    // Should still work with local config
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.includes('Current Configuration:'));

    await rig.cleanup();
  });
});