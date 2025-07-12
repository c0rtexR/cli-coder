import { strict as assert } from 'assert';
import { test } from 'node:test';
import { TestRig } from '../helpers/test-rig.js';

/**
 * End-to-End CLI Command Tests
 * 
 * These tests use TestRig to create isolated environments and test
 * the complete CLI workflow as a user would experience it.
 */

test('CLI Commands E2E Test Suite', async (t) => {
  const rig = new TestRig();
  await rig.setup(t.name);

  await t.test('Version and Help Commands', async (subTest) => {
    await subTest.test('version command displays correct information', () => {
      const output = rig.run(['--version']);
      
      // Should display version number
      assert.match(output, /\d+\.\d+\.\d+/);
      assert.ok(rig.lastExitCode === 0, 'Version command should exit successfully');
    });

    await subTest.test('detailed version command shows all information', () => {
      const output = rig.run(['version']);
      
      assert.ok(output.includes('cli-coder'), 'Should display package name');
      assert.ok(output.includes('0.1.0'), 'Should display version');
      assert.ok(output.includes('AI-powered CLI coding assistant'), 'Should display description');
      assert.ok(rig.lastExitCode === 0, 'Version command should exit successfully');
    });

    await subTest.test('version JSON output is valid', () => {
      const output = rig.run(['version', '--json']);
      
      let parsed;
      assert.doesNotThrow(() => {
        parsed = JSON.parse(output);
      }, 'JSON output should be valid');
      
      assert.equal(parsed.name, 'cli-coder');
      assert.equal(parsed.version, '0.1.0');
      assert.ok(parsed.node, 'Should include Node.js version');
      assert.ok(parsed.platform, 'Should include platform');
      assert.ok(parsed.arch, 'Should include architecture');
      assert.ok(rig.lastExitCode === 0, 'JSON version command should exit successfully');
    });

    await subTest.test('help command shows all available commands', () => {
      const output = rig.run(['--help']);
      
      assert.ok(output.includes('AI-powered CLI coding assistant'), 'Should show description');
      assert.ok(output.includes('Commands:'), 'Should show commands section');
      assert.ok(output.includes('chat'), 'Should list chat command');
      assert.ok(output.includes('config'), 'Should list config command');
      assert.ok(output.includes('init'), 'Should list init command');
      assert.ok(output.includes('version'), 'Should list version command');
      assert.ok(rig.lastExitCode === 0, 'Help command should exit successfully');
    });
  });

  await t.test('Chat Command E2E', async (subTest) => {
    await subTest.test('chat command shows placeholder message', () => {
      const output = rig.run(['chat']);
      
      assert.ok(output.includes('🚧'), 'Should show construction emoji');
      assert.ok(output.includes('Chat functionality will be implemented'), 'Should show placeholder message');
      assert.ok(rig.lastExitCode === 0, 'Chat command should exit successfully');
    });

    await subTest.test('chat command accepts model option', () => {
      const output = rig.run(['chat', '--model', 'gpt-4']);
      
      assert.ok(output.includes('Chat functionality will be implemented'), 'Should show placeholder');
      assert.ok(rig.lastExitCode === 0, 'Chat with model should exit successfully');
    });

    await subTest.test('chat command accepts provider option', () => {
      const output = rig.run(['chat', '--provider', 'openai']);
      
      assert.ok(output.includes('Chat functionality will be implemented'), 'Should show placeholder');
      assert.ok(rig.lastExitCode === 0, 'Chat with provider should exit successfully');
    });

    await subTest.test('chat command accepts no-git flag', () => {
      const output = rig.run(['chat', '--no-git']);
      
      assert.ok(output.includes('Chat functionality will be implemented'), 'Should show placeholder');
      assert.ok(rig.lastExitCode === 0, 'Chat with no-git should exit successfully');
    });

    await subTest.test('chat command combines multiple options', () => {
      const output = rig.run(['chat', '--model', 'gpt-4', '--provider', 'anthropic', '--no-git']);
      
      assert.ok(output.includes('Chat functionality will be implemented'), 'Should show placeholder');
      assert.ok(rig.lastExitCode === 0, 'Chat with multiple options should exit successfully');
    });

    await subTest.test('chat help shows all options', () => {
      const output = rig.run(['chat', '--help']);
      
      assert.ok(output.includes('Start interactive chat session'), 'Should show description');
      assert.ok(output.includes('--model'), 'Should show model option');
      assert.ok(output.includes('--provider'), 'Should show provider option');
      assert.ok(output.includes('--no-git'), 'Should show no-git option');
      assert.ok(rig.lastExitCode === 0, 'Chat help should exit successfully');
    });
  });

  await t.test('Config Command E2E', async (subTest) => {
    await subTest.test('config command shows placeholder message', () => {
      const output = rig.run(['config']);
      
      assert.ok(output.includes('🚧'), 'Should show construction emoji');
      assert.ok(output.includes('Configuration management will be implemented'), 'Should show placeholder');
      assert.ok(rig.lastExitCode === 0, 'Config command should exit successfully');
    });

    await subTest.test('config list option works', () => {
      const output = rig.run(['config', '--list']);
      
      assert.ok(output.includes('Configuration management will be implemented'), 'Should show placeholder');
      assert.ok(rig.lastExitCode === 0, 'Config list should exit successfully');
    });

    await subTest.test('config set option works', () => {
      const output = rig.run(['config', '--set', 'apiKey=test123']);
      
      assert.ok(output.includes('Configuration management will be implemented'), 'Should show placeholder');
      assert.ok(rig.lastExitCode === 0, 'Config set should exit successfully');
    });

    await subTest.test('config get option works', () => {
      const output = rig.run(['config', '--get', 'apiKey']);
      
      assert.ok(output.includes('Configuration management will be implemented'), 'Should show placeholder');
      assert.ok(rig.lastExitCode === 0, 'Config get should exit successfully');
    });

    await subTest.test('config help shows all options', () => {
      const output = rig.run(['config', '--help']);
      
      assert.ok(output.includes('Manage configuration'), 'Should show description');
      assert.ok(output.includes('--list'), 'Should show list option');
      assert.ok(output.includes('--set'), 'Should show set option');
      assert.ok(output.includes('--get'), 'Should show get option');
      assert.ok(rig.lastExitCode === 0, 'Config help should exit successfully');
    });
  });

  await t.test('Init Command E2E', async (subTest) => {
    await subTest.test('init command shows placeholder message', () => {
      const output = rig.run(['init']);
      
      assert.ok(output.includes('🚧'), 'Should show construction emoji');
      assert.ok(output.includes('Project initialization will be implemented'), 'Should show placeholder');
      assert.ok(rig.lastExitCode === 0, 'Init command should exit successfully');
    });

    await subTest.test('init force option works', () => {
      const output = rig.run(['init', '--force']);
      
      assert.ok(output.includes('Project initialization will be implemented'), 'Should show placeholder');
      assert.ok(rig.lastExitCode === 0, 'Init force should exit successfully');
    });

    await subTest.test('init help shows all options', () => {
      const output = rig.run(['init', '--help']);
      
      assert.ok(output.includes('Initialize CLI coder in current directory'), 'Should show description');
      assert.ok(output.includes('--force'), 'Should show force option');
      assert.ok(rig.lastExitCode === 0, 'Init help should exit successfully');
    });
  });

  await t.test('Error Handling E2E', async (subTest) => {
    await subTest.test('unknown command shows helpful error', () => {
      const output = rig.run(['unknown-command']);
      
      assert.ok(rig.lastExitCode !== 0, 'Unknown command should exit with error');
      assert.ok(output.includes('unknown command') || output.includes('Unknown command'), 'Should show unknown command error');
    });

    await subTest.test('unknown option shows helpful error', () => {
      const output = rig.run(['version', '--unknown-option']);
      
      assert.ok(rig.lastExitCode !== 0, 'Unknown option should exit with error');
      assert.ok(output.includes('unknown option') || output.includes('Unknown option'), 'Should show unknown option error');
    });

    await subTest.test('malformed commands handled gracefully', () => {
      const malformedCommands = [
        ['chat', '--model'], // Missing value
        ['config', '--set'], // Missing value
        ['config', '--get'], // Missing value
      ];

      malformedCommands.forEach(([command, ...args]) => {
        const output = rig.run([command, ...args]);
        assert.ok(rig.lastExitCode !== 0, `Malformed command ${command} ${args.join(' ')} should exit with error`);
      });
    });
  });

  await t.test('Default Command Behavior', async (subTest) => {
    await subTest.test('no arguments shows help or runs default command', () => {
      const output = rig.run([]);
      
      // Should either show help or run chat command (default)
      assert.ok(rig.lastExitCode === 0, 'No arguments should not cause error');
      assert.ok(output.length > 0, 'Should produce some output');
    });

    await subTest.test('default command execution works', () => {
      // When no command specified, should run chat (default)
      const output = rig.run([]);
      
      // Should show either help or chat placeholder
      const isHelp = output.includes('Commands:');
      const isChat = output.includes('Chat functionality will be implemented');
      
      assert.ok(isHelp || isChat, 'Should show either help or chat default');
      assert.ok(rig.lastExitCode === 0, 'Default execution should succeed');
    });
  });

  await t.test('Command Performance E2E', async (subTest) => {
    await subTest.test('commands execute within reasonable time', () => {
      const commands = [
        ['--version'],
        ['--help'],
        ['chat'],
        ['config'],
        ['init']
      ];

      commands.forEach(args => {
        const startTime = Date.now();
        rig.run(args);
        const endTime = Date.now();
        
        const executionTime = endTime - startTime;
        assert.ok(executionTime < 5000, `Command ${args.join(' ')} should execute within 5 seconds (took ${executionTime}ms)`);
      });
    });

    await subTest.test('repeated command executions are consistent', () => {
      // Run version command multiple times
      const results = [];
      for (let i = 0; i < 3; i++) {
        const output = rig.run(['--version']);
        results.push(output);
        assert.ok(rig.lastExitCode === 0, `Version command run ${i + 1} should succeed`);
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result, index) => {
        assert.equal(result, firstResult, `Version command run ${index + 1} should match first run`);
      });
    });
  });

  await rig.cleanup();
});

test('CLI Workflow Integration E2E', async (t) => {
  const rig = new TestRig();
  await rig.setup(t.name);

  await t.test('complete user workflow simulation', () => {
    // Simulate a user discovering the CLI
    
    // 1. User checks version
    let output = rig.run(['--version']);
    assert.ok(rig.lastExitCode === 0, 'Version check should succeed');
    assert.match(output, /\d+\.\d+\.\d+/, 'Should show version number');

    // 2. User checks help
    output = rig.run(['--help']);
    assert.ok(rig.lastExitCode === 0, 'Help should succeed');
    assert.ok(output.includes('Commands:'), 'Should show available commands');

    // 3. User tries init command
    output = rig.run(['init']);
    assert.ok(rig.lastExitCode === 0, 'Init should succeed');
    assert.ok(output.includes('will be implemented'), 'Should show placeholder');

    // 4. User tries config command
    output = rig.run(['config', '--help']);
    assert.ok(rig.lastExitCode === 0, 'Config help should succeed');

    // 5. User tries chat command
    output = rig.run(['chat']);
    assert.ok(rig.lastExitCode === 0, 'Chat should succeed');
    assert.ok(output.includes('will be implemented'), 'Should show placeholder');
  });

  await t.test('error recovery workflow', () => {
    // Simulate user making mistakes and recovering
    
    // 1. User makes typo in command
    let output = rig.run(['chta']); // typo
    assert.ok(rig.lastExitCode !== 0, 'Typo should cause error');
    
    // 2. User checks help to see correct commands
    output = rig.run(['--help']);
    assert.ok(rig.lastExitCode === 0, 'Help after error should work');
    
    // 3. User runs correct command
    output = rig.run(['chat']);
    assert.ok(rig.lastExitCode === 0, 'Correct command should work');
  });

  await rig.cleanup();
});