/**
 * Real CLI Test: Basic Commands
 * Tests actual CLI installation and basic commands
 */

import { RealCLITestRig } from '../run-tests.js';

export async function testBasicCommands() {
  const testRig = new RealCLITestRig();
  
  try {
    console.log('🧪 Testing real CLI basic commands...');
    
    if (!testRig.testCommandExists()) {
      console.log('⚠️  CLI not installed globally, skipping real CLI tests');
      console.log('💡 To run real CLI tests, install globally: npm install -g .');
      return;
    }
    
    const testDir = testRig.setup('real-basic-commands');
    console.log(`📁 Test directory: ${testDir}`);
    
    // Test 1: Help command
    console.log('📋 Testing real CLI help...');
    const helpOutput = testRig.runRealCommand('--help');
    
    if (!helpOutput.includes('cli-coder')) {
      throw new Error('Real CLI help should contain cli-coder');
    }
    
    console.log('✅ Real CLI help works');
    
    // Test 2: Version command
    console.log('📋 Testing real CLI version...');
    const versionOutput = testRig.runRealCommand('--version');
    
    if (!versionOutput.includes('0.1.0')) {
      throw new Error('Real CLI version should be 0.1.0');
    }
    
    console.log('✅ Real CLI version works');
    
    console.log('🎉 Real CLI basic commands test completed successfully!');
    
  } catch (error) {
    console.error('❌ Real CLI basic commands test failed:', error.message);
    throw error;
  } finally {
    testRig.cleanup();
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBasicCommands()
    .then(() => {
      console.log('✅ All real CLI tests passed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Real CLI tests failed:', error.message);
      process.exit(1);
    });
}