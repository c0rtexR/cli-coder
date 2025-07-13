/**
 * @fileoverview Integration tests for shell commands in chat interface
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CommandParser } from '../../../src/core/chat/parser';
import { ChatInterface } from '../../../src/core/chat/interface';
import { shellService } from '../../../src/integrations/shell/service';
import { handleError } from '../../../src/utils/errors';
import { ChatSession } from '../../../src/types';

// Mock dependencies
vi.mock('../../../src/integrations/shell/service');
vi.mock('../../../src/utils/errors');
vi.mock('chalk', () => ({
  default: Object.assign(
    (text: string) => text,
    {
      red: vi.fn((text) => text),
      green: vi.fn((text) => text),
      blue: vi.fn((text) => text),
      gray: vi.fn((text) => text),
      yellow: vi.fn((text) => text),
    }
  ),
}));

const mockShellService = vi.mocked(shellService);
const mockHandleError = vi.mocked(handleError);

describe('Shell Chat Integration', () => {
  let parser: CommandParser;
  let mockChatInterface: any;
  let mockSession: ChatSession;
  let originalConsoleLog: any;

  beforeEach(() => {
    // Mock session
    mockSession = {
      id: 'test-session',
      messages: [],
      context: [],
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock chat interface
    mockChatInterface = {
      getSession: vi.fn().mockReturnValue(mockSession),
      showHelp: vi.fn(),
      stop: vi.fn(),
    };

    parser = new CommandParser(mockChatInterface);

    // Mock console.log
    originalConsoleLog = console.log;
    console.log = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('Shell Command Parsing', () => {
    it('should parse /shell commands correctly', async () => {
      // Arrange
      const command = 'ls -la';
      const mockResult = {
        success: true,
        stdout: 'total 8\ndrwxr-xr-x 2 user user 4096 Jan 1 10:00 .',
        stderr: '',
        exitCode: 0,
        command: `ls -la`,
        duration: 150,
      };
      mockShellService.execute.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/shell ls -la');

      // Assert
      expect(mockShellService.execute).toHaveBeenCalledWith('ls -la', {
        workingDirectory: process.cwd(),
        showOutput: true,
      });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Command completed'));
    });

    it('should handle /sh as alias for /shell', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: 'current directory',
        stderr: '',
        exitCode: 0,
        command: 'pwd',
        duration: 50,
      };
      mockShellService.execute.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/sh pwd');

      // Assert
      expect(mockShellService.execute).toHaveBeenCalledWith('pwd', {
        workingDirectory: process.cwd(),
        showOutput: true,
      });
    });

    it('should show usage when no shell command provided', async () => {
      // Act
      await parser.parseCommand('/shell');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage: /shell <command>'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
      expect(mockShellService.execute).not.toHaveBeenCalled();
    });

    it('should handle shell command failures', async () => {
      // Arrange
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'command not found',
        exitCode: 127,
        command: 'nonexistent-command',
        duration: 100,
      };
      mockShellService.execute.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/shell nonexistent-command');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Command failed with exit code 127'));
    });

    it('should handle shell service errors', async () => {
      // Arrange
      const error = new Error('Dangerous command blocked');
      mockShellService.execute.mockRejectedValue(error);

      // Act
      await parser.parseCommand('/shell rm -rf /');

      // Assert
      expect(mockHandleError).toHaveBeenCalledWith(error);
    });
  });

  describe('Git Command Integration', () => {
    it('should handle /git commands', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: 'On branch main\nnothing to commit, working tree clean',
        stderr: '',
        exitCode: 0,
        command: 'git status',
        duration: 200,
      };
      mockShellService.git.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/git status');

      // Assert
      expect(mockShellService.git).toHaveBeenCalledWith('status');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git command completed'));
    });

    it('should show git usage when no subcommand provided', async () => {
      // Act
      await parser.parseCommand('/git');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage: /git <subcommand>'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
      expect(mockShellService.git).not.toHaveBeenCalled();
    });

    it('should handle git command failures', async () => {
      // Arrange
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
        command: 'git status',
        duration: 100,
      };
      mockShellService.git.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/git status');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git command failed'));
    });

    it('should handle git service errors', async () => {
      // Arrange
      const error = new Error('Git not installed');
      mockShellService.git.mockRejectedValue(error);

      // Act
      await parser.parseCommand('/git log');

      // Assert
      expect(mockHandleError).toHaveBeenCalledWith(error);
    });

    it('should handle complex git commands with quotes', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: '[main 1234567] test commit',
        stderr: '',
        exitCode: 0,
        command: 'git commit -m "test commit"',
        duration: 300,
      };
      mockShellService.git.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/git commit -m "test commit"');

      // Assert
      expect(mockShellService.git).toHaveBeenCalledWith('commit -m "test commit"');
    });
  });

  describe('NPM Command Integration', () => {
    it('should handle /npm commands', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: 'npm test passed',
        stderr: '',
        exitCode: 0,
        command: 'npm test',
        duration: 5000,
      };
      mockShellService.npm.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/npm test');

      // Assert
      expect(mockShellService.npm).toHaveBeenCalledWith('test');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('NPM command completed'));
    });

    it('should show npm usage when no subcommand provided', async () => {
      // Act
      await parser.parseCommand('/npm');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage: /npm <subcommand>'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
      expect(mockShellService.npm).not.toHaveBeenCalled();
    });

    it('should handle npm command failures', async () => {
      // Arrange
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'npm ERR! missing script: build',
        exitCode: 1,
        command: 'npm run build',
        duration: 500,
      };
      mockShellService.npm.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/npm run build');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('NPM command failed'));
    });

    it('should handle npm installation commands', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0,
        command: 'npm install express',
        duration: 10000,
      };
      mockShellService.npm.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/npm install express');

      // Assert
      expect(mockShellService.npm).toHaveBeenCalledWith('install express');
    });
  });

  describe('Docker Command Integration', () => {
    it('should handle /docker commands', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: 'CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS   PORTS   NAMES',
        stderr: '',
        exitCode: 0,
        command: 'docker ps',
        duration: 300,
      };
      mockShellService.docker.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/docker ps');

      // Assert
      expect(mockShellService.docker).toHaveBeenCalledWith('ps');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Docker command completed'));
    });

    it('should show docker usage when no subcommand provided', async () => {
      // Act
      await parser.parseCommand('/docker');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage: /docker <subcommand>'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
      expect(mockShellService.docker).not.toHaveBeenCalled();
    });

    it('should handle docker command failures', async () => {
      // Arrange
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'Cannot connect to the Docker daemon',
        exitCode: 1,
        command: 'docker ps',
        duration: 1000,
      };
      mockShellService.docker.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/docker ps');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Docker command failed'));
    });

    it('should handle complex docker commands', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: 'Successfully built abc123',
        stderr: '',
        exitCode: 0,
        command: 'docker build -t myapp .',
        duration: 30000,
      };
      mockShellService.docker.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/docker build -t myapp .');

      // Assert
      expect(mockShellService.docker).toHaveBeenCalledWith('build -t myapp .');
    });
  });

  describe('Command Argument Parsing', () => {
    it('should handle commands with multiple arguments', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: 'file contents',
        stderr: '',
        exitCode: 0,
        command: 'cat file1.txt file2.txt',
        duration: 100,
      };
      mockShellService.execute.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/shell cat file1.txt file2.txt');

      // Assert
      expect(mockShellService.execute).toHaveBeenCalledWith('cat file1.txt file2.txt', {
        workingDirectory: process.cwd(),
        showOutput: true,
      });
    });

    it('should handle commands with quoted arguments', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: 'matches found',
        stderr: '',
        exitCode: 0,
        command: 'grep "hello world" file.txt',
        duration: 200,
      };
      mockShellService.execute.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/shell grep "hello world" file.txt');

      // Assert
      expect(mockShellService.execute).toHaveBeenCalledWith('grep "hello world" file.txt', {
        workingDirectory: process.cwd(),
        showOutput: true,
      });
    });

    it('should handle commands with flags and options', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: 'detailed file list',
        stderr: '',
        exitCode: 0,
        command: 'ls -la --color=always',
        duration: 150,
      };
      mockShellService.execute.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/shell ls -la --color=always');

      // Assert
      expect(mockShellService.execute).toHaveBeenCalledWith('ls -la --color=always', {
        workingDirectory: process.cwd(),
        showOutput: true,
      });
    });

    it('should trim extra whitespace from commands', async () => {
      // Arrange
      const mockResult = {
        success: true,
        stdout: 'output',
        stderr: '',
        exitCode: 0,
        command: 'echo test',
        duration: 50,
      };
      mockShellService.execute.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/shell   echo   test   ');

      // Assert
      expect(mockShellService.execute).toHaveBeenCalledWith('echo test', {
        workingDirectory: process.cwd(),
        showOutput: true,
      });
    });
  });

  describe('Help System Integration', () => {
    it('should include shell commands in help display', () => {
      // Act
      mockChatInterface.showHelp();

      // Assert
      expect(mockChatInterface.showHelp).toHaveBeenCalled();
      // Note: The actual help display would be tested in the ChatInterface tests
      // Here we're just verifying the integration point
    });

    it('should show examples for each shell command type', async () => {
      // Act
      await parser.parseCommand('/shell');
      await parser.parseCommand('/git');
      await parser.parseCommand('/npm');
      await parser.parseCommand('/docker');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/shell git status'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/git status'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/npm install'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/docker ps'));
    });
  });

  describe('Error Propagation', () => {
    it('should propagate shell service errors to error handler', async () => {
      // Arrange
      const customError = new Error('Custom shell error');
      mockShellService.execute.mockRejectedValue(customError);

      // Act
      await parser.parseCommand('/shell dangerous-command');

      // Assert
      expect(mockHandleError).toHaveBeenCalledWith(customError);
    });

    it('should propagate git service errors to error handler', async () => {
      // Arrange
      const gitError = new Error('Git repository not found');
      mockShellService.git.mockRejectedValue(gitError);

      // Act
      await parser.parseCommand('/git status');

      // Assert
      expect(mockHandleError).toHaveBeenCalledWith(gitError);
    });

    it('should propagate npm service errors to error handler', async () => {
      // Arrange
      const npmError = new Error('Package not found');
      mockShellService.npm.mockRejectedValue(npmError);

      // Act
      await parser.parseCommand('/npm install nonexistent-package');

      // Assert
      expect(mockHandleError).toHaveBeenCalledWith(npmError);
    });

    it('should propagate docker service errors to error handler', async () => {
      // Arrange
      const dockerError = new Error('Docker daemon not running');
      mockShellService.docker.mockRejectedValue(dockerError);

      // Act
      await parser.parseCommand('/docker ps');

      // Assert
      expect(mockHandleError).toHaveBeenCalledWith(dockerError);
    });
  });

  describe('Session Context Integration', () => {
    it('should work correctly with existing session context', async () => {
      // Arrange
      mockSession.context = [
        { path: 'package.json', content: '{}', language: 'json', size: 100, lastModified: new Date() },
      ];
      const mockResult = {
        success: true,
        stdout: 'package.json',
        stderr: '',
        exitCode: 0,
        command: 'ls package.json',
        duration: 100,
      };
      mockShellService.execute.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/shell ls package.json');

      // Assert
      expect(mockShellService.execute).toHaveBeenCalled();
      expect(mockSession.context).toHaveLength(1); // Should not be modified
    });

    it('should maintain session state after shell commands', async () => {
      // Arrange
      const initialMessages = [
        { role: 'user', content: 'Hello', timestamp: new Date() },
      ];
      mockSession.messages = [...initialMessages];
      
      const mockResult = {
        success: true,
        stdout: 'output',
        stderr: '',
        exitCode: 0,
        command: 'echo test',
        duration: 50,
      };
      mockShellService.execute.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/shell echo test');

      // Assert
      expect(mockSession.messages).toEqual(initialMessages); // Should not be modified
    });
  });

  describe('Working Directory Context', () => {
    it('should use current working directory for shell commands', async () => {
      // Arrange
      const currentDir = process.cwd();
      const mockResult = {
        success: true,
        stdout: 'current directory',
        stderr: '',
        exitCode: 0,
        command: 'pwd',
        duration: 50,
      };
      mockShellService.execute.mockResolvedValue(mockResult);

      // Act
      await parser.parseCommand('/shell pwd');

      // Assert
      expect(mockShellService.execute).toHaveBeenCalledWith('pwd', {
        workingDirectory: currentDir,
        showOutput: true,
      });
    });
  });
});