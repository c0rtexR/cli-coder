import { homedir } from 'os';
import { join, dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { AppConfigSchema, type ValidatedAppConfig } from './schema';
import { CLIErrorClass } from '../utils/errors';
import type { AppConfig } from '../types/config.types';

export class ConfigManager {
  private globalConfigPath: string;
  private localConfigPath: string;

  constructor() {
    this.globalConfigPath = join(homedir(), '.cli-coder', 'config.json');
    this.localConfigPath = join(process.cwd(), '.cli-coder', 'config.json');
  }

  public async loadConfig(): Promise<ValidatedAppConfig> {
    const config: Partial<AppConfig> = {};

    // Load global config first
    try {
      const globalConfig = this.loadConfigFile(this.globalConfigPath);
      Object.assign(config, globalConfig);
    } catch (_error) {
      // Global config not found - use defaults
    }

    // Load local config (overrides global)
    try {
      const localConfig = this.loadConfigFile(this.localConfigPath);
      Object.assign(config, localConfig);
    } catch (_error) {
      // Local config not found
    }

    // Apply environment overrides
    this.applyEnvironmentOverrides(config);

    // Validate and return
    return AppConfigSchema.parse(config);
  }

  public async saveConfig(config: Partial<AppConfig>, global = false): Promise<void> {
    const configPath = global ? this.globalConfigPath : this.localConfigPath;
    
    // Ensure directory exists
    const configDir = dirname(configPath);
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Validate before saving
    const validatedConfig = AppConfigSchema.parse(config);
    
    // Save to file
    writeFileSync(configPath, JSON.stringify(validatedConfig, null, 2));
  }

  private loadConfigFile(filePath: string): Partial<AppConfig> {
    if (!existsSync(filePath)) {
      throw new CLIErrorClass('CONFIG_NOT_FOUND', `Config not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  private applyEnvironmentOverrides(config: Partial<AppConfig>): void {
    // LLM overrides
    if (process.env.OPENAI_API_KEY) {
      config.llm = { 
        ...config.llm as any, 
        apiKey: process.env.OPENAI_API_KEY 
      };
    }
    if (process.env.ANTHROPIC_API_KEY) {
      config.llm = { 
        ...config.llm as any, 
        apiKey: process.env.ANTHROPIC_API_KEY 
      };
    }
    
    // Shell overrides
    if (process.env.CLI_CODER_SHELL_TIMEOUT) {
      const timeout = parseInt(process.env.CLI_CODER_SHELL_TIMEOUT);
      if (!isNaN(timeout)) {
        config.shell = { 
          ...config.shell as any, 
          defaultTimeout: timeout 
        };
      }
    }
    
    if (process.env.CLI_CODER_ALLOW_DANGEROUS === 'true') {
      config.shell = { 
        ...config.shell as any, 
        allowDangerousCommands: true 
      };
    }
  }
}