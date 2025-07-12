/**
 * @fileoverview Unit tests for Configuration type definitions
 */

import { describe, it, expect } from 'vitest';
import type { 
  AppConfig, 
  ShellConfig, 
  EditorConfig, 
  SessionConfig, 
  FileContext 
} from '../../../src/types/config.types';

describe('Configuration Types', () => {
  describe('AppConfig', () => {
    it('should validate AppConfig structure', () => {
      const config: AppConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          workingDirectory: '/home/user/projects',
          historySize: 100
        },
        editor: {
          defaultEditor: 'code',
          tempDir: '/tmp'
        },
        session: {
          saveHistory: true,
          maxHistorySize: 1000,
          historyPath: '/home/user/.cli-coder/history'
        }
      };

      expect(config.llm.provider).toBe('openai');
      expect(config.shell.allowDangerousCommands).toBe(false);
      expect(config.editor.defaultEditor).toBe('code');
      expect(config.session.saveHistory).toBe(true);
    });

    it('should validate nested configuration types', () => {
      const config: AppConfig = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-test',
          model: 'claude-3-sonnet'
        },
        shell: {
          allowDangerousCommands: true,
          defaultTimeout: 60000,
          confirmationRequired: false,
          historySize: 50
        },
        editor: {
          defaultEditor: 'vim',
          tempDir: '/var/tmp'
        },
        session: {
          saveHistory: false,
          maxHistorySize: 500,
          historyPath: '/tmp/cli-coder-history'
        }
      };

      // Test each nested config
      expect(typeof config.llm).toBe('object');
      expect(typeof config.shell).toBe('object');
      expect(typeof config.editor).toBe('object');
      expect(typeof config.session).toBe('object');
    });
  });

  describe('ShellConfig', () => {
    it('should validate ShellConfig safety settings', () => {
      const safeConfig: ShellConfig = {
        allowDangerousCommands: false,
        defaultTimeout: 30000,
        confirmationRequired: true,
        workingDirectory: '/safe/directory',
        historySize: 100
      };

      const dangerousConfig: ShellConfig = {
        allowDangerousCommands: true,
        defaultTimeout: 120000,
        confirmationRequired: false,
        historySize: 500
      };

      expect(safeConfig.allowDangerousCommands).toBe(false);
      expect(safeConfig.confirmationRequired).toBe(true);
      expect(safeConfig.workingDirectory).toBe('/safe/directory');

      expect(dangerousConfig.allowDangerousCommands).toBe(true);
      expect(dangerousConfig.confirmationRequired).toBe(false);
      expect(dangerousConfig.workingDirectory).toBeUndefined();
    });

    it('should validate timeout and history size are positive numbers', () => {
      const config: ShellConfig = {
        allowDangerousCommands: false,
        defaultTimeout: 45000,
        confirmationRequired: true,
        historySize: 250
      };

      expect(typeof config.defaultTimeout).toBe('number');
      expect(config.defaultTimeout).toBeGreaterThan(0);
      expect(typeof config.historySize).toBe('number');
      expect(config.historySize).toBeGreaterThan(0);
    });

    it('should allow optional workingDirectory', () => {
      const config: ShellConfig = {
        allowDangerousCommands: false,
        defaultTimeout: 30000,
        confirmationRequired: true,
        historySize: 100
      };

      expect(config.workingDirectory).toBeUndefined();
    });
  });

  describe('EditorConfig', () => {
    it('should validate EditorConfig structure', () => {
      const config: EditorConfig = {
        defaultEditor: 'nano',
        tempDir: '/tmp/cli-coder'
      };

      expect(config.defaultEditor).toBe('nano');
      expect(config.tempDir).toBe('/tmp/cli-coder');
      expect(typeof config.defaultEditor).toBe('string');
      expect(typeof config.tempDir).toBe('string');
    });

    it('should validate common editor commands', () => {
      const editors = ['vim', 'nano', 'code', 'emacs', 'subl'];
      
      editors.forEach(editor => {
        const config: EditorConfig = {
          defaultEditor: editor,
          tempDir: '/tmp'
        };
        
        expect(config.defaultEditor).toBe(editor);
      });
    });
  });

  describe('SessionConfig', () => {
    it('should validate SessionConfig with file paths', () => {
      const config: SessionConfig = {
        saveHistory: true,
        maxHistorySize: 1000,
        historyPath: '/home/user/.cli-coder/sessions.json'
      };

      expect(config.saveHistory).toBe(true);
      expect(config.maxHistorySize).toBe(1000);
      expect(config.historyPath).toBe('/home/user/.cli-coder/sessions.json');
    });

    it('should validate disabled history saving', () => {
      const config: SessionConfig = {
        saveHistory: false,
        maxHistorySize: 0,
        historyPath: ''
      };

      expect(config.saveHistory).toBe(false);
      expect(config.maxHistorySize).toBe(0);
      expect(config.historyPath).toBe('');
    });

    it('should validate maxHistorySize constraints', () => {
      const config: SessionConfig = {
        saveHistory: true,
        maxHistorySize: 5000,
        historyPath: '/large/history/file'
      };

      expect(typeof config.maxHistorySize).toBe('number');
      expect(config.maxHistorySize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('FileContext', () => {
    it('should validate FileContext with real file attributes', () => {
      const fileContext: FileContext = {
        path: '/project/src/main.ts',
        content: 'console.log("Hello, World!");',
        language: 'typescript',
        size: 1024,
        lastModified: new Date('2024-01-01T12:00:00Z')
      };

      expect(fileContext.path).toBe('/project/src/main.ts');
      expect(fileContext.content).toBe('console.log("Hello, World!");');
      expect(fileContext.language).toBe('typescript');
      expect(fileContext.size).toBe(1024);
      expect(fileContext.lastModified).toBeInstanceOf(Date);
    });

    it('should validate different programming languages', () => {
      const languages = ['javascript', 'typescript', 'python', 'rust', 'go', 'java'];
      
      languages.forEach(lang => {
        const fileContext: FileContext = {
          path: `/test/file.${lang}`,
          content: `// ${lang} code`,
          language: lang,
          size: 100,
          lastModified: new Date()
        };
        
        expect(fileContext.language).toBe(lang);
      });
    });

    it('should validate file size is non-negative', () => {
      const fileContext: FileContext = {
        path: '/empty/file.txt',
        content: '',
        language: 'text',
        size: 0,
        lastModified: new Date()
      };

      expect(typeof fileContext.size).toBe('number');
      expect(fileContext.size).toBeGreaterThanOrEqual(0);
    });

    it('should validate content matches size (logical consistency)', () => {
      const content = 'Hello World!';
      const fileContext: FileContext = {
        path: '/test.txt',
        content,
        language: 'text',
        size: content.length,
        lastModified: new Date()
      };

      // Business logic test: content length should match size
      expect(fileContext.content.length).toBe(fileContext.size);
    });

    it('should validate lastModified is valid Date', () => {
      const fileContext: FileContext = {
        path: '/test.js',
        content: 'const x = 1;',
        language: 'javascript',
        size: 12,
        lastModified: new Date('2024-01-15T14:30:00Z')
      };

      expect(fileContext.lastModified).toBeInstanceOf(Date);
      expect(typeof fileContext.lastModified.getTime()).toBe('number');
      expect(isNaN(fileContext.lastModified.getTime())).toBe(false);
    });

    it('should handle large files', () => {
      const largeContent = 'x'.repeat(1000000); // 1MB of content
      const fileContext: FileContext = {
        path: '/large/file.txt',
        content: largeContent,
        language: 'text',
        size: 1000000,
        lastModified: new Date()
      };

      expect(fileContext.size).toBe(1000000);
      expect(fileContext.content.length).toBe(1000000);
    });
  });
});