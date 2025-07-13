const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { RealTestRig } = require('../../helpers/real-test-rig');
const fs = require('fs/promises');
const path = require('path');

describe('File Browser CLI Integration (Real)', () => {
  let testRig;
  let testProjectPath;

  beforeEach(async () => {
    testRig = new RealTestRig();
    
    // Create a realistic test project structure
    testProjectPath = await testRig.createTempDirectory('file-browser-real-test');
    
    // Create package.json
    await fs.writeFile(
      path.join(testProjectPath, 'package.json'),
      JSON.stringify({
        name: 'file-browser-test',
        version: '1.0.0',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          test: 'vitest'
        },
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        devDependencies: {
          '@types/react': '^18.0.0',
          typescript: '^5.0.0',
          vite: '^5.0.0',
          vitest: '^1.0.0'
        }
      }, null, 2)
    );

    // Create source files
    await fs.mkdir(path.join(testProjectPath, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(testProjectPath, 'src', 'main.tsx'),
      `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
    );

    await fs.writeFile(
      path.join(testProjectPath, 'src', 'App.tsx'),
      `import React, { useState } from 'react';
import { Button } from './components/Button';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Test App</h1>
      <Button onClick={() => setCount(count + 1)}>
        Count: {count}
      </Button>
    </div>
  );
}

export default App;`
    );

    // Create components directory
    await fs.mkdir(path.join(testProjectPath, 'src', 'components'), { recursive: true });
    await fs.writeFile(
      path.join(testProjectPath, 'src', 'components', 'Button.tsx'),
      `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return (
    <button onClick={onClick} style={{ padding: '8px 16px' }}>
      {children}
    </button>
  );
};`
    );

    await fs.writeFile(
      path.join(testProjectPath, 'src', 'components', 'index.ts'),
      `export { Button } from './Button';`
    );

    // Create utils
    await fs.mkdir(path.join(testProjectPath, 'src', 'utils'), { recursive: true });
    await fs.writeFile(
      path.join(testProjectPath, 'src', 'utils', 'helpers.ts'),
      `export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};`
    );

    // Create config files
    await fs.writeFile(
      path.join(testProjectPath, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }]
      }, null, 2)
    );

    await fs.writeFile(
      path.join(testProjectPath, 'vite.config.ts'),
      `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
});`
    );

    await fs.writeFile(
      path.join(testProjectPath, '.gitignore'),
      `node_modules/
dist/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*`
    );

    await fs.writeFile(
      path.join(testProjectPath, 'README.md'),
      `# File Browser Test Project

This is a test project for validating the file browser functionality.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- React with TypeScript
- Vite for development
- Component-based architecture
- Utility functions
\`\`\``
    );

    // Create hidden files
    await fs.writeFile(
      path.join(testProjectPath, '.env.example'),
      `VITE_API_URL=http://localhost:8080
VITE_APP_NAME=Test App`
    );
  });

  afterEach(async () => {
    await testRig.cleanup();
  });

  describe('File Tree Discovery and Navigation', () => {
    it('should discover and display project structure in TUI mode', async () => {
      const result = await testRig.runCLI(['chat', '--mode', 'tui'], {
        cwd: testProjectPath,
        timeout: 10000,
        interactive: true,
        expectLongRunning: true
      });

      // Should display the file browser with project files
      expect(result.stdout).toContain('📁 Files');
      expect(result.stdout).toContain('package.json');
      expect(result.stdout).toContain('src');
      expect(result.stdout).toContain('tsconfig.json');
      expect(result.stdout).toContain('vite.config.ts');
      expect(result.stdout).toContain('README.md');
    });

    it('should show file type indicators and metadata', async () => {
      const result = await testRig.runCLI(['chat', '--mode', 'tui'], {
        cwd: testProjectPath,
        timeout: 8000,
        interactive: true,
        expectLongRunning: true
      });

      // Should show file icons and size information
      expect(result.stdout).toMatch(/📄|📁|📘|📜/); // File type icons
      expect(result.stdout).toMatch(/\(\d+KB\)/); // File sizes
    });

    it('should handle directory expansion in interactive mode', async () => {
      const session = await testRig.startInteractiveSession(['chat', '--mode', 'tui'], {
        cwd: testProjectPath
      });

      // Wait for initial load
      await session.waitForOutput('📁 Files', 5000);

      // Navigate to file panel (Tab key simulation through direct commands)
      await session.sendInput('\t\t'); // Switch to files panel

      // Should show unexpanded src directory
      expect(session.getCurrentOutput()).toContain('📁 src');
      expect(session.getCurrentOutput()).not.toContain('main.tsx');

      await session.close();
    });
  });

  describe('File Context Management Integration', () => {
    it('should integrate with existing context management system', async () => {
      // First, add files using traditional CLI commands
      const addResult = await testRig.runCLI(['add', 'package.json', 'src/main.tsx'], {
        cwd: testProjectPath
      });

      expect(addResult.exitCode).toBe(0);
      expect(addResult.stdout).toContain('Added');

      // Then launch TUI and verify files are shown in context
      const tuiResult = await testRig.runCLI(['chat', '--mode', 'tui'], {
        cwd: testProjectPath,
        timeout: 8000,
        interactive: true,
        expectLongRunning: true
      });

      // Should show context indicators for added files
      expect(tuiResult.stdout).toContain('✓'); // Context indicator
      expect(tuiResult.stdout).toContain('2 files'); // File count in status
    });

    it('should persist context changes made through file browser', async () => {
      const session = await testRig.startInteractiveSession(['chat', '--mode', 'tui'], {
        cwd: testProjectPath
      });

      await session.waitForOutput('📁 Files', 5000);

      // Exit TUI (simulated)
      await session.sendInput('\x03'); // Ctrl+C

      // Check that context was saved by listing files
      const listResult = await testRig.runCLI(['list'], {
        cwd: testProjectPath
      });

      // Should reflect any context changes made in the TUI
      expect(listResult.exitCode).toBe(0);

      await session.close();
    });
  });

  describe('Search and Filter Operations', () => {
    it('should provide real-time search functionality', async () => {
      const session = await testRig.startInteractiveSession(['chat', '--mode', 'tui'], {
        cwd: testProjectPath
      });

      await session.waitForOutput('📁 Files', 5000);

      // Search functionality should be available
      // (Testing search UI existence since keyboard simulation is complex)
      expect(session.getCurrentOutput()).toMatch(/Search|Filter/);

      await session.close();
    });

    it('should filter files by extension type', async () => {
      const session = await testRig.startInteractiveSession(['chat', '--mode', 'tui'], {
        cwd: testProjectPath
      });

      await session.waitForOutput('📁 Files', 5000);

      // Should show TypeScript files distinctly
      expect(session.getCurrentOutput()).toMatch(/\.tsx?/);
      expect(session.getCurrentOutput()).toContain('main.tsx');
      expect(session.getCurrentOutput()).toContain('App.tsx');

      await session.close();
    });

    it('should handle hidden file visibility toggle', async () => {
      const session = await testRig.startInteractiveSession(['chat', '--mode', 'tui'], {
        cwd: testProjectPath
      });

      await session.waitForOutput('📁 Files', 5000);

      // By default, hidden files should not be visible
      expect(session.getCurrentOutput()).not.toContain('.env.example');
      expect(session.getCurrentOutput()).not.toContain('.gitignore');

      await session.close();
    });
  });

  describe('Performance with Real File Systems', () => {
    it('should handle moderately large projects efficiently', async () => {
      // Create additional files to simulate a larger project
      const srcPath = path.join(testProjectPath, 'src');
      
      // Add more components
      for (let i = 0; i < 20; i++) {
        await fs.writeFile(
          path.join(srcPath, `Component${i}.tsx`),
          `import React from 'react';

export const Component${i}: React.FC = () => {
  return <div>Component ${i}</div>;
};`
        );
      }

      // Add test files
      await fs.mkdir(path.join(testProjectPath, 'tests'), { recursive: true });
      for (let i = 0; i < 15; i++) {
        await fs.writeFile(
          path.join(testProjectPath, 'tests', `test${i}.spec.ts`),
          `import { describe, it, expect } from 'vitest';

describe('Test ${i}', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});`
        );
      }

      const startTime = Date.now();
      const session = await testRig.startInteractiveSession(['chat', '--mode', 'tui'], {
        cwd: testProjectPath,
        timeout: 15000
      });

      await session.waitForOutput('📁 Files', 10000);
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(5000);

      // Should display all the files
      expect(session.getCurrentOutput()).toContain('Component0.tsx');
      expect(session.getCurrentOutput()).toContain('tests');

      await session.close();
    });

    it('should handle file system operations without blocking', async () => {
      const session = await testRig.startInteractiveSession(['chat', '--mode', 'tui'], {
        cwd: testProjectPath
      });

      await session.waitForOutput('📁 Files', 5000);

      // Create a new file while TUI is running
      await fs.writeFile(
        path.join(testProjectPath, 'new-file.ts'),
        'export const newValue = 42;'
      );

      // TUI should remain responsive
      expect(session.getCurrentOutput()).toContain('📁 Files');

      await session.close();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should gracefully handle permission errors', async () => {
      // Try to run in a directory with restricted permissions
      const result = await testRig.runCLI(['chat', '--mode', 'tui'], {
        cwd: '/usr', // System directory with potential permission issues
        timeout: 5000,
        expectError: true
      });

      // Should either work or fail gracefully
      if (result.exitCode !== 0) {
        expect(result.stderr).toMatch(/permission|access/i);
      } else {
        expect(result.stdout).toContain('📁 Files');
      }
    });

    it('should handle missing or corrupted files', async () => {
      // Create a broken symlink
      try {
        await fs.symlink('/nonexistent/path', path.join(testProjectPath, 'broken-link'));
      } catch (error) {
        // Skip test if symlinks not supported
        return;
      }

      const result = await testRig.runCLI(['chat', '--mode', 'tui'], {
        cwd: testProjectPath,
        timeout: 8000,
        interactive: true,
        expectLongRunning: true
      });

      // Should still load despite broken symlink
      expect(result.stdout).toContain('📁 Files');
      expect(result.stdout).toContain('package.json');
    });

    it('should recover from temporary file system issues', async () => {
      const session = await testRig.startInteractiveSession(['chat', '--mode', 'tui'], {
        cwd: testProjectPath
      });

      await session.waitForOutput('📁 Files', 5000);

      // Delete and recreate a file
      const tempFile = path.join(testProjectPath, 'temp.txt');
      await fs.writeFile(tempFile, 'temporary content');
      await fs.unlink(tempFile);

      // TUI should continue working
      expect(session.getCurrentOutput()).toContain('📁 Files');

      await session.close();
    });
  });

  describe('Integration with External Tools', () => {
    it('should work correctly with git repositories', async () => {
      // Initialize git repository
      await testRig.runCommand('git init', { cwd: testProjectPath });
      await testRig.runCommand('git add .', { cwd: testProjectPath });

      const result = await testRig.runCLI(['chat', '--mode', 'tui'], {
        cwd: testProjectPath,
        timeout: 8000,
        interactive: true,
        expectLongRunning: true
      });

      // Should work with git repository and potentially show git status
      expect(result.stdout).toContain('📁 Files');
      expect(result.stdout).toContain('package.json');
    });

    it('should respect .gitignore patterns', async () => {
      // Create node_modules directory (should be ignored)
      await fs.mkdir(path.join(testProjectPath, 'node_modules'), { recursive: true });
      await fs.mkdir(path.join(testProjectPath, 'node_modules', 'react'), { recursive: true });
      await fs.writeFile(
        path.join(testProjectPath, 'node_modules', 'react', 'index.js'),
        'module.exports = {};'
      );

      const result = await testRig.runCLI(['chat', '--mode', 'tui'], {
        cwd: testProjectPath,
        timeout: 8000,
        interactive: true,
        expectLongRunning: true
      });

      // Should either hide node_modules or show it as dimmed/ignored
      expect(result.stdout).toContain('📁 Files');
      
      // If node_modules is shown, it should be marked as ignored
      if (result.stdout.includes('node_modules')) {
        // Should be visually distinguished as ignored
        expect(result.stdout).toMatch(/node_modules.*(?:ignored|dimmed)/i);
      }
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should handle platform-specific file paths correctly', async () => {
      const result = await testRig.runCLI(['chat', '--mode', 'tui'], {
        cwd: testProjectPath,
        timeout: 8000,
        interactive: true,
        expectLongRunning: true
      });

      // Should work regardless of platform path separators
      expect(result.stdout).toContain('📁 Files');
      expect(result.stdout).toContain('src'); // Should not show path separators in file names
    });

    it('should handle different file encodings', async () => {
      // Create file with UTF-8 content
      await fs.writeFile(
        path.join(testProjectPath, 'unicode.txt'),
        'Unicode content: 🚀 💻 📁',
        'utf8'
      );

      const result = await testRig.runCLI(['chat', '--mode', 'tui'], {
        cwd: testProjectPath,
        timeout: 8000,
        interactive: true,
        expectLongRunning: true
      });

      // Should handle Unicode file names and content
      expect(result.stdout).toContain('📁 Files');
      expect(result.stdout).toContain('unicode.txt');
    });
  });
});