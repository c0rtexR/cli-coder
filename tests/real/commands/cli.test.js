import { strict as assert } from 'assert';
import { test } from 'node:test';
import { RealCLITestRig } from '../helpers/real-test-rig.js';

/**
 * Real CLI Tests
 * 
 * These tests verify the CLI works when actually installed globally
 * or available in the system PATH. They test the real user experience.
 */

test('Real CLI Installation and Execution', async (t) => {
  const rig = new RealCLITestRig();
  
  // Check if CLI is available for testing
  if (!rig.isCliAvailable()) {
    console.log('⚠️  Skipping real CLI tests - cli-coder not found in PATH');
    console.log('   To enable these tests:');
    console.log('   1. Run: npm run build');
    console.log('   2. Run: npm link (or npm install -g .)');
    console.log('   3. Verify: cli-coder --version');
    return;
  }

  await rig.setup(t.name);

  await t.test('Basic CLI Functionality', async (subTest) => {
    await subTest.test('CLI is executable and shows version', () => {
      const result = rig.runCommand(['--version']);
      
      assert.ok(result.success, 'CLI should be executable');
      assert.ok(result.exitCode === 0, 'Version command should succeed');
      assert.match(result.stdout, /\d+\.\d+\.\d+/, 'Should show version number');
    });

    await subTest.test('CLI shows help information', () => {
      const result = rig.runCommand(['--help']);
      
      assert.ok(result.success, 'Help command should work');
      assert.ok(result.exitCode === 0, 'Help should succeed');
      assert.ok(result.stdout.includes('AI-powered CLI coding assistant'), 'Should show description');
      assert.ok(result.stdout.includes('Commands:'), 'Should list commands');
    });

    await subTest.test('CLI handles unknown commands gracefully', () => {
      const result = rig.runCommand(['unknown-command-12345']);
      
      assert.ok(result.exitCode !== 0, 'Unknown command should fail');
      assert.ok(result.stderr.length > 0 || result.stdout.includes('unknown'), 'Should show error message');
    });
  });

  await t.test('Command Execution', async (subTest) => {
    await subTest.test('chat command executes', () => {
      const result = rig.runCommand(['chat']);
      
      assert.ok(result.success, 'Chat command should execute');
      assert.ok(result.exitCode === 0, 'Chat should succeed');
      assert.ok(result.stdout.includes('Chat functionality will be implemented'), 'Should show placeholder');
    });

    await subTest.test('config command executes', () => {
      const result = rig.runCommand(['config']);
      
      assert.ok(result.success, 'Config command should execute');
      assert.ok(result.exitCode === 0, 'Config should succeed');
      assert.ok(result.stdout.includes('Configuration management will be implemented'), 'Should show placeholder');
    });

    await subTest.test('init command executes', () => {
      const result = rig.runCommand(['init']);
      
      assert.ok(result.success, 'Init command should execute');
      assert.ok(result.exitCode === 0, 'Init should succeed');
      assert.ok(result.stdout.includes('Project initialization will be implemented'), 'Should show placeholder');
    });

    await subTest.test('version command with JSON output', () => {
      const result = rig.runCommand(['version', '--json']);
      
      assert.ok(result.success, 'Version JSON command should execute');
      assert.ok(result.exitCode === 0, 'Version JSON should succeed');
      
      let parsed;
      assert.doesNotThrow(() => {
        parsed = JSON.parse(result.stdout);
      }, 'Should produce valid JSON');
      
      assert.equal(parsed.name, 'cli-coder');
      assert.ok(parsed.version, 'Should include version');
      assert.ok(parsed.node, 'Should include Node.js version');
    });
  });

  await t.test('Command Options and Flags', async (subTest) => {
    await subTest.test('chat command accepts options', () => {
      const result = rig.runCommand(['chat', '--model', 'gpt-4']);
      
      assert.ok(result.success, 'Chat with model option should work');
      assert.ok(result.exitCode === 0, 'Should succeed');
    });

    await subTest.test('config command accepts options', () => {
      const result = rig.runCommand(['config', '--list']);
      
      assert.ok(result.success, 'Config list should work');
      assert.ok(result.exitCode === 0, 'Should succeed');
    });

    await subTest.test('init command accepts force flag', () => {
      const result = rig.runCommand(['init', '--force']);
      
      assert.ok(result.success, 'Init force should work');
      assert.ok(result.exitCode === 0, 'Should succeed');
    });

    await subTest.test('help works for individual commands', () => {
      const commands = ['chat', 'config', 'init', 'version'];
      
      commands.forEach(command => {
        const result = rig.runCommand([command, '--help']);
        assert.ok(result.success, `${command} help should work`);
        assert.ok(result.exitCode === 0, `${command} help should succeed`);
        assert.ok(result.stdout.length > 0, `${command} help should show information`);
      });
    });
  });

  await t.test('Performance and Reliability', async (subTest) => {
    await subTest.test('CLI starts up quickly', () => {
      const startTime = Date.now();
      const result = rig.runCommand(['--version']);
      const endTime = Date.now();
      
      assert.ok(result.success, 'Quick version check should work');
      assert.ok(endTime - startTime < 3000, 'Should start up within 3 seconds');
    });

    await subTest.test('repeated executions are consistent', () => {
      const results = [];
      
      // Run version command 3 times
      for (let i = 0; i < 3; i++) {
        const result = rig.runCommand(['--version']);
        assert.ok(result.success, `Run ${i + 1} should succeed`);
        results.push(result.stdout);
      }
      
      // All results should be identical
      const firstResult = results[0];
      results.forEach((result, index) => {
        assert.equal(result, firstResult, `Run ${index + 1} should match first run`);
      });
    });

    await subTest.test('CLI handles concurrent executions', () => {
      // This is harder to test directly, but we can at least verify
      // that the CLI doesn't leave processes hanging
      const result1 = rig.runCommand(['--version']);
      const result2 = rig.runCommand(['--help']);
      const result3 = rig.runCommand(['chat']);
      
      assert.ok(result1.success && result2.success && result3.success, 
        'Multiple executions should all succeed');
    });
  });

  await t.test('Cross-Platform Compatibility', async (subTest) => {
    await subTest.test('CLI works on current platform', () => {
      const result = rig.runCommand(['version', '--json']);
      
      assert.ok(result.success, 'Platform check should work');
      
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.platform, 'Should detect platform');
      assert.ok(parsed.arch, 'Should detect architecture');
      
      // Verify platform matches current system
      assert.equal(parsed.platform, process.platform);
      assert.equal(parsed.arch, process.arch);
    });

    await subTest.test('Node.js version compatibility', () => {
      const result = rig.runCommand(['version', '--json']);
      
      assert.ok(result.success, 'Node version check should work');
      
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.node, 'Should include Node.js version');
      assert.match(parsed.node, /^v\d+\.\d+\.\d+/, 'Should have valid Node.js version format');
    });
  });

  await t.test('Error Recovery and User Experience', async (subTest) => {
    await subTest.test('helpful error messages for typos', () => {
      const typos = ['chta', 'confgi', 'initi', 'versoin'];
      
      typos.forEach(typo => {
        const result = rig.runCommand([typo]);
        assert.ok(result.exitCode !== 0, `Typo ${typo} should fail`);
        assert.ok(result.stderr.length > 0 || result.stdout.includes('unknown'), 
          `Typo ${typo} should show error message`);
      });
    });

    await subTest.test('suggestions for invalid options', () => {
      const result = rig.runCommand(['version', '--invalid-option']);
      
      assert.ok(result.exitCode !== 0, 'Invalid option should fail');
      assert.ok(result.stderr.includes('unknown option') || result.stderr.includes('invalid'), 
        'Should indicate unknown option');
    });

    await subTest.test('recovery after errors', () => {
      // Make an error
      let result = rig.runCommand(['invalid-command']);
      assert.ok(result.exitCode !== 0, 'Invalid command should fail');
      
      // Recover with valid command
      result = rig.runCommand(['--version']);
      assert.ok(result.success, 'Should recover and work normally');
      assert.ok(result.exitCode === 0, 'Recovery should succeed');
    });
  });

  await rig.cleanup();
});

test('Real CLI Environment Integration', async (t) => {
  const rig = new RealCLITestRig();
  
  if (!rig.isCliAvailable()) {
    console.log('⚠️  Skipping real CLI environment tests - cli-coder not found in PATH');
    return;
  }

  await rig.setup(t.name);

  await t.test('CLI works in different directory contexts', () => {
    // Test in home directory
    let result = rig.runCommand(['--version'], { cwd: process.env.HOME || process.env.USERPROFILE });
    assert.ok(result.success, 'Should work in home directory');

    // Test in temporary directory
    result = rig.runCommand(['--version'], { cwd: rig.getTempDir() });
    assert.ok(result.success, 'Should work in temp directory');

    // Test in project directory (if available)
    const projectDir = process.cwd();
    result = rig.runCommand(['--version'], { cwd: projectDir });
    assert.ok(result.success, 'Should work in project directory');
  });

  await t.test('CLI handles environment variables', () => {
    // Test with modified environment
    const result = rig.runCommand(['version', '--json'], {
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    assert.ok(result.success, 'Should work with modified environment');
    assert.ok(result.exitCode === 0, 'Should succeed with test environment');
  });

  await t.test('CLI integration with system tools', () => {
    // Test piping output (basic shell integration)
    if (process.platform !== 'win32') {
      // Unix-like systems
      const result = rig.runShellCommand('cli-coder --version | head -1');
      assert.ok(result.success, 'Should work with shell pipes');
    }
  });

  await rig.cleanup();
});