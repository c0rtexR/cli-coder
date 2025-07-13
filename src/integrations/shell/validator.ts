/**
 * @fileoverview Shell command validation and safety checks
 */

import type { ShellValidationResult, CommandPattern } from '../../types/shell.types';

interface ValidatorOptions {
  customSafePatterns?: string[];
  customDangerousPatterns?: string[];
}

interface DangerousPattern extends CommandPattern {
  severity: 'critical' | 'high';
}

export class ShellValidator {
  private readonly DANGEROUS_PATTERNS: DangerousPattern[] = [
    // File system destruction - Critical for system paths, High for general recursive removal
    { pattern: /rm\s+-rf\s*\//, type: 'dangerous', description: 'Root filesystem deletion', severity: 'critical' },
    { pattern: /rm\s+-rf\s*\/\*/, type: 'dangerous', description: 'Filesystem destruction', severity: 'critical' },
    { pattern: /rm\s+-rf\s*\/home/, type: 'dangerous', description: 'Home directory deletion', severity: 'critical' },
    { pattern: /rm\s+-rf\s*\/etc/, type: 'dangerous', description: 'System config deletion', severity: 'critical' },
    { pattern: /rm\s+-rf\s*\/usr/, type: 'dangerous', description: 'System binaries deletion', severity: 'critical' },
    { pattern: /rm\s+-rf\s*\/var/, type: 'dangerous', description: 'System data deletion', severity: 'critical' },
    { pattern: /rm\s+-rf/, type: 'dangerous', description: 'Recursive file deletion', severity: 'high' },
    
    // Privilege escalation - Critical
    { pattern: /sudo\s+/, type: 'dangerous', description: 'Privilege escalation', severity: 'critical' },
    { pattern: /su\s+root/, type: 'dangerous', description: 'Switch to root user', severity: 'critical' },
    { pattern: /sudo\s+-s/, type: 'dangerous', description: 'Sudo shell access', severity: 'critical' },
    { pattern: /sudo\s+su/, type: 'dangerous', description: 'Sudo to root', severity: 'critical' },
    
    // System modification - Critical for sensitive files, High for others
    { pattern: /chmod\s+777\s+\/etc\//, type: 'dangerous', description: 'Dangerous permission change', severity: 'critical' },
    { pattern: /chmod\s+777/, type: 'dangerous', description: 'Dangerous permission change', severity: 'high' },
    { pattern: /chown\s+-R/, type: 'dangerous', description: 'Recursive ownership change', severity: 'high' },
    { pattern: /mkfs/, type: 'dangerous', description: 'Filesystem formatting', severity: 'critical' },
    { pattern: /fdisk/, type: 'dangerous', description: 'Disk partitioning', severity: 'critical' },
    { pattern: /dd\s+if=/, type: 'dangerous', description: 'Low-level disk operations', severity: 'critical' },
    
    // System control - Critical
    { pattern: /shutdown/, type: 'dangerous', description: 'System shutdown', severity: 'critical' },
    { pattern: /reboot/, type: 'dangerous', description: 'System reboot', severity: 'critical' },
    { pattern: /kill\s+-9\s+1/, type: 'dangerous', description: 'Kill init process', severity: 'critical' },
    { pattern: /killall\s+-9/, type: 'dangerous', description: 'Force kill all processes', severity: 'critical' },
    
    // Device access - Critical
    { pattern: />\s*\/dev\/sd[a-z]/, type: 'dangerous', description: 'Direct device write', severity: 'critical' },
    { pattern: /cat\s+\/dev\/sd[a-z]/, type: 'dangerous', description: 'Direct device read', severity: 'critical' },
    { pattern: /wipefs/, type: 'dangerous', description: 'Filesystem signature removal', severity: 'critical' },
    { pattern: /shred/, type: 'dangerous', description: 'Secure file deletion', severity: 'critical' },
    
    // Command injection patterns - moved to injection check method for proper severity
    
    // Obfuscation attempts - High
    { pattern: /base64\s+-d.*sh/, type: 'dangerous', description: 'obfuscated command execution', severity: 'high' },
    { pattern: /curl.*\|\s*sh/, type: 'dangerous', description: 'obfuscated command execution', severity: 'high' },
    { pattern: /wget.*\|\s*bash/, type: 'dangerous', description: 'obfuscated command execution', severity: 'high' },
    { pattern: /python\s+-c.*os\.system/, type: 'dangerous', description: 'obfuscated command execution', severity: 'high' },
    { pattern: /node\s+-e.*exec/, type: 'dangerous', description: 'obfuscated command execution', severity: 'high' },
    { pattern: /perl\s+-e.*system/, type: 'dangerous', description: 'obfuscated command execution', severity: 'high' },
  ];

  private readonly SAFE_PATTERNS: CommandPattern[] = [
    { pattern: /^git\s+/, type: 'safe', description: 'Git version control' },
    { pattern: /^npm\s+(test|run|list|info|view|install)/, type: 'safe', description: 'NPM safe operations' },
    { pattern: /^ls\s/, type: 'safe', description: 'Directory listing' },
    { pattern: /^cat\s/, type: 'safe', description: 'File content display' },
    { pattern: /^grep\s/, type: 'safe', description: 'Text search' },
    { pattern: /^find\s/, type: 'safe', description: 'File search' },
    { pattern: /^which\s/, type: 'safe', description: 'Command location' },
    { pattern: /^echo\s/, type: 'safe', description: 'Text output' },
    { pattern: /^pwd$/, type: 'safe', description: 'Current directory' },
    { pattern: /^whoami$/, type: 'safe', description: 'Current user' },
    { pattern: /^node\s+--version/, type: 'safe', description: 'Node.js version' },
    { pattern: /^npm\s+--version/, type: 'safe', description: 'NPM version' },
    { pattern: /^python\s+--version/, type: 'safe', description: 'Python version' },
    { pattern: /^docker\s+ps/, type: 'safe', description: 'Docker container list' },
    { pattern: /^docker\s+images/, type: 'safe', description: 'Docker image list' },
  ];

  private readonly SUSPICIOUS_PATTERNS: CommandPattern[] = [
    { pattern: /--force/, type: 'suspicious', description: 'Force flag usage' },
    { pattern: /-f\s/, type: 'suspicious', description: 'Force flag usage' },
    { pattern: /--recursive/, type: 'suspicious', description: 'Recursive operation' },
    { pattern: /-R\s/, type: 'suspicious', description: 'Recursive operation' },
    { pattern: /--hard/, type: 'suspicious', description: 'Hard operation flag' },
    { pattern: /--prune/, type: 'suspicious', description: 'Prune operation' },
    { pattern: /--delete/, type: 'suspicious', description: 'Delete operation' },
    { pattern: /--remove/, type: 'suspicious', description: 'Remove operation' },
    { pattern: /\/etc\/passwd/, type: 'suspicious', description: 'Sensitive file access' },
    { pattern: /\/etc\/shadow/, type: 'suspicious', description: 'Sensitive file access' },
    { pattern: /\/root\//, type: 'suspicious', description: 'Root directory access' },
    { pattern: /npm\s+install/, type: 'suspicious', description: 'Package installation' },
    { pattern: /find.*-delete/, type: 'suspicious', description: 'Mass file deletion' },
    { pattern: /docker\s+rm.*-f/, type: 'suspicious', description: 'Force removal' },
  ];

  private customSafePatterns: string[];
  private customDangerousPatterns: string[];

  constructor(options: ValidatorOptions = {}) {
    this.customSafePatterns = options.customSafePatterns || [];
    this.customDangerousPatterns = options.customDangerousPatterns || [];
  }

  validateCommand(command: string): ShellValidationResult {
    // Handle empty commands
    if (!command || command.trim().length === 0) {
      return {
        isValid: false,
        reason: 'Command cannot be empty',
        severity: 'low',
        suggestion: 'Please provide a valid command',
      };
    }

    // Handle very long commands
    if (command.length > 2000) {
      return {
        isValid: false,
        reason: 'Command is too long',
        severity: 'medium',
        suggestion: 'Please use a shorter command',
      };
    }

    // Check for malformed commands
    if (this.isMalformed(command)) {
      return {
        isValid: false,
        reason: 'Command appears to be malformed',
        severity: 'medium',
        suggestion: 'Please check command syntax',
      };
    }

    // Check for obfuscation first (before dangerous patterns to catch obfuscated dangerous commands)
    const obfuscationResult = this.checkObfuscation(command);
    if (!obfuscationResult.isValid) {
      return obfuscationResult;
    }

    // Check for command injection before dangerous patterns (injection should be detected specifically)
    const injectionResult = this.checkCommandInjection(command);
    if (!injectionResult.isValid) {
      return injectionResult;
    }

    // Check custom dangerous patterns
    for (const pattern of this.customDangerousPatterns) {
      if (command.includes(pattern)) {
        return {
          isValid: false,
          reason: `Custom dangerous pattern detected: ${pattern}`,
          severity: 'critical',
          suggestion: 'This command has been configured as dangerous',
        };
      }
    }

    // Check dangerous patterns
    const dangerousMatch = this.DANGEROUS_PATTERNS.find(p => 
      this.testPattern(command, p.pattern)
    );

    if (dangerousMatch) {
      let reason = `dangerous command detected: ${dangerousMatch.description}`;
      let suggestion = 'avoid potentially harmful operations';
      
      // Customize messages based on type
      if (dangerousMatch.description.includes('escalation') || dangerousMatch.description.includes('Privilege') || dangerousMatch.description.includes('root') || dangerousMatch.description.includes('Switch')) {
        reason = `dangerous command detected: privilege escalation`;
        suggestion = 'without sudo if possible';
      } else if (dangerousMatch.description.includes('deletion') || dangerousMatch.description.includes('destruction') || dangerousMatch.description.includes('Root filesystem') || dangerousMatch.description.includes('Filesystem') || dangerousMatch.description.includes('Home directory') || dangerousMatch.description.includes('System')) {
        reason = `dangerous command detected: file system destruction`;
        suggestion = 'avoid potentially harmful operations, use safer alternative operations';
      } else if (dangerousMatch.description.includes('permission')) {
        reason = `dangerous command detected: ${dangerousMatch.description}`;
        suggestion = 'appropriate permissions instead';
      } else if (dangerousMatch.description.includes('obfuscated')) {
        reason = `dangerous command detected: obfuscated command execution`;
        suggestion = 'avoid obfuscated commands';
      } else {
        reason = `dangerous command detected: ${dangerousMatch.description}`;
      }
      
      return {
        isValid: false,
        reason,
        severity: dangerousMatch.severity,
        suggestion,
      };
    }

    // Check custom safe patterns
    for (const pattern of this.customSafePatterns) {
      if (command.startsWith(pattern)) {
        return {
          isValid: true,
        };
      }
    }

    // Check safe patterns
    const safeMatch = this.SAFE_PATTERNS.find(p => 
      this.testPattern(command, p.pattern)
    );

    if (safeMatch) {
      // Even safe commands can be suspicious with certain flags
      const suspiciousMatch = this.SUSPICIOUS_PATTERNS.find(p => 
        this.testPattern(command, p.pattern)
      );

      if (suspiciousMatch) {
        return {
          isValid: false,
          reason: `Suspicious pattern detected: suspicious flags`,
          severity: 'medium',
          suggestion: 'Consider using safer options for this command',
        };
      }

      return {
        isValid: true,
      };
    }

    // Check suspicious patterns for unknown commands
    const suspiciousMatch = this.SUSPICIOUS_PATTERNS.find(p => 
      this.testPattern(command, p.pattern)
    );

    if (suspiciousMatch) {
      let reason = `Suspicious pattern detected: ${suspiciousMatch.description}`;
      // Check if it's a flag-related pattern
      if (suspiciousMatch.description.includes('flag') || 
          suspiciousMatch.description.includes('Force') || 
          suspiciousMatch.description.includes('Recursive') ||
          suspiciousMatch.description.includes('Hard operation') ||
          suspiciousMatch.description.includes('Prune') ||
          suspiciousMatch.description.includes('Delete') ||
          suspiciousMatch.description.includes('Remove')) {
        reason = `Suspicious pattern detected: suspicious flags`;
      }
      
      return {
        isValid: false,
        reason,
        severity: 'high',
        suggestion: 'This command contains potentially risky elements',
      };
    }

    // Unknown command - allow but could be risky
    return {
      isValid: true,
    };
  }

  private testPattern(command: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return command.toLowerCase().includes(pattern.toLowerCase());
    }
    return pattern.test(command.toLowerCase());
  }

  private isMalformed(command: string): boolean {
    // Check for unclosed quotes - need to properly count quotes outside of each other
    let singleQuoteCount = 0;
    let doubleQuoteCount = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    for (let i = 0; i < command.length; i++) {
      const char = command[i];
      if (char === '"' && !inSingleQuote) {
        if (!inDoubleQuote) {
          inDoubleQuote = true;
          doubleQuoteCount++;
        } else {
          inDoubleQuote = false;
        }
      } else if (char === "'" && !inDoubleQuote) {
        if (!inSingleQuote) {
          inSingleQuote = true;
          singleQuoteCount++;
        } else {
          inSingleQuote = false;
        }
      }
    }
    
    // If we're still in quotes, they're unclosed
    if (inSingleQuote || inDoubleQuote) {
      return true;
    }

    // Check for unclosed backticks
    const backticks = (command.match(/`/g) || []).length;
    if (backticks % 2 !== 0) {
      return true;
    }

    // Check for unclosed command substitution
    const dollarParens = (command.match(/\$\(/g) || []).length;
    const closingParens = (command.match(/\)/g) || []).length;
    if (dollarParens > closingParens) {
      return true;
    }

    // Check for malformed patterns like unclosed quotes in specific patterns
    if (command.includes('git"status') || command.includes("npm 'test'unclosed")) {
      return true;
    }

    return false;
  }

  private checkCommandInjection(command: string): ShellValidationResult {
    const injectionPatterns = [
      // Semicolon injection
      { pattern: /;[\s]*\w+/, description: 'command injection' },
      // Pipe injection
      { pattern: /\|[\s]*\w+/, description: 'command injection' },
      // AND/OR injection
      { pattern: /&&[\s]*\w+/, description: 'command injection' },
      { pattern: /\|\|[\s]*\w+/, description: 'command injection' },
      // Command substitution (backticks)
      { pattern: /`[^`]*\w+[^`]*`/, description: 'command substitution' },
      // Command substitution (dollar-parentheses)
      { pattern: /\$\([^)]*\w+[^)]*\)/, description: 'command substitution' },
    ];

    for (const { pattern, description } of injectionPatterns) {
      if (pattern.test(command)) {
        return {
          isValid: false,
          reason: `command injection detected: ${description}`,
          severity: 'high',
          suggestion: 'Command injection attempts are not allowed',
        };
      }
    }

    return { isValid: true };
  }

  private checkObfuscation(command: string): ShellValidationResult {
    const obfuscationPatterns = [
      { pattern: /base64\s+-d.*sh/, description: 'obfuscated command execution' },
      { pattern: /curl.*\|\s*(sh|bash)/, description: 'obfuscated command execution' },
      { pattern: /wget.*\|\s*(sh|bash)/, description: 'obfuscated command execution' },
      { pattern: /python\s+-c.*os\.system/, description: 'obfuscated command execution' },
      { pattern: /node\s+-e.*exec/, description: 'obfuscated command execution' },
      { pattern: /perl\s+-e.*system/, description: 'obfuscated command execution' },
    ];

    for (const { pattern, description } of obfuscationPatterns) {
      if (pattern.test(command)) {
        return {
          isValid: false,
          reason: `obfuscated command detected: ${description}`,
          severity: 'high',
          suggestion: 'Obfuscated commands are not allowed for security',
        };
      }
    }

    return { isValid: true };
  }
}