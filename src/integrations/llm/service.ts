import { LLMProvider, LLMConfig, LLMResponse, ChatContext } from '@/types';
import { LLMProviderFactory } from './factory';
import { CLIErrorClass } from '@/utils/errors';

export class LLMService {
  private provider: LLMProvider | null = null;
  private config: LLMConfig | null = null;

  async initialize(config: LLMConfig): Promise<void> {
    // Validate configuration
    if (!LLMProviderFactory.validateProviderConfig(config)) {
      throw new CLIErrorClass('INVALID_LLM_CONFIG', 'Invalid LLM configuration');
    }

    // Create provider
    this.provider = LLMProviderFactory.createProvider(config);
    this.config = config;
  }

  async generateResponse(prompt: string, context: ChatContext = { messages: [], files: [] }): Promise<LLMResponse> {
    if (!this.provider) {
      throw new CLIErrorClass('LLM_NOT_INITIALIZED', 'LLM service not initialized');
    }

    return await this.provider.generateResponse(prompt, context);
  }

  getProviderName(): string {
    return this.provider?.name || 'None';
  }

  getModelName(): string {
    return this.config?.model || 'None';
  }

  isInitialized(): boolean {
    return this.provider !== null;
  }
}

// Singleton instance
export const llmService = new LLMService();