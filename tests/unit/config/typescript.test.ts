import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('TypeScript Configuration', () => {
  it('should have valid tsconfig.json', () => {
    const tsconfig = JSON.parse(
      readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8')
    );
    
    expect(tsconfig.compilerOptions.target).toBe('ES2022');
    expect(tsconfig.compilerOptions.module).toBe('ESNext');
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.esModuleInterop).toBe(true);
    expect(tsconfig.compilerOptions.jsx).toBe('react-jsx');
    expect(tsconfig.include).toContain('src/**/*');
    expect(tsconfig.exclude).toContain('node_modules');
    expect(tsconfig.exclude).toContain('dist');
    expect(tsconfig.exclude).toContain('tests');
  });

  it('should have proper output configuration', () => {
    const tsconfig = JSON.parse(
      readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8')
    );
    
    expect(tsconfig.compilerOptions.outDir).toBe('./dist');
    expect(tsconfig.compilerOptions.rootDir).toBe('./src');
    expect(tsconfig.compilerOptions.declaration).toBe(true);
  });

  it('should have path mapping configured', () => {
    const tsconfig = JSON.parse(
      readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8')
    );
    
    expect(tsconfig.compilerOptions.baseUrl).toBe('.');
    expect(tsconfig.compilerOptions.paths).toHaveProperty('@/*');
    expect(tsconfig.compilerOptions.paths['@/*']).toContain('src/*');
  });
});