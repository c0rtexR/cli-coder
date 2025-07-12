/**
 * E2E Test: Basic Setup Scenario
 * Tests the complete setup and basic functionality
 */

import { TestRig } from '../run-tests.js';
import { execSync } from 'child_process';

export async function testBasicSetup() {
  const testRig = new TestRig();
  
  try {
    console.log('🧪 Testing basic setup scenario...');
    
    const testDir = testRig.setup('basic-setup');
    console.log(`📁 Test directory: ${testDir}`);
    
    // Test 1: CLI should show help when called with --help
    console.log('📋 Testing CLI help command...');
    
    // First ensure the project is built
    execSync('npm run build', { 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    const helpOutput = testRig.run('--help');
    
    if (!helpOutput.includes('cli-coder')) {
      throw new Error('Help output should contain cli-coder');
    }
    
    if (!helpOutput.includes('AI-powered CLI coding assistant')) {
      throw new Error('Help output should contain description');
    }
    
    console.log('✅ CLI help command works correctly');
    
    // Test 2: CLI should show version
    console.log('📋 Testing CLI version command...');
    const versionOutput = testRig.run('--version');
    
    if (!versionOutput.includes('0.1.0')) {
      throw new Error('Version output should contain 0.1.0');
    }
    
    console.log('✅ CLI version command works correctly');
    
    // Test 3: CLI should list available commands
    console.log('📋 Testing available commands...');
    const commandsOutput = testRig.run('--help');
    
    if (!commandsOutput.includes('init')) {
      throw new Error('Should have init command');
    }
    
    if (!commandsOutput.includes('chat')) {
      throw new Error('Should have chat command');
    }
    
    console.log('✅ CLI commands are properly listed');
    
    console.log('🎉 Basic setup scenario completed successfully!');
    
  } catch (error) {
    console.error('❌ Basic setup scenario failed:', error.message);
    throw error;
  } finally {
    testRig.cleanup();
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBasicSetup()
    .then(() => {
      console.log('✅ All E2E tests passed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ E2E tests failed:', error.message);
      process.exit(1);
    });
}