#!/usr/bin/env node

export interface CLICoderOptions {
  version?: boolean;
  help?: boolean;
}

export function main(): void {
  console.log('CLI Coder - AI-powered CLI coding assistant');
}

if (require.main === module) {
  main();
}