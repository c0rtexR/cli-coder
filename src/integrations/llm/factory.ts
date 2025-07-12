import { LLMProvider, LLMConfig } from '@/types';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { CLIErrorClass } from '@/utils/errors';

export class LLMProviderFactory {
  static createProvider(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'gemini':
        // TODO: Implement in future iteration
        throw new CLIErrorClass('PROVIDER_NOT_IMPLEMENTED', 'Gemini provider not yet implemented');
      default:
        throw new CLIErrorClass('INVALID_PROVIDER', `Unknown provider: ${config.provider}`);
    }
  }

  static getSupportedProviders(): string[] {
    return ['openai', 'anthropic']; // 'gemini' will be added later
  }

  static validateProviderConfig(config: LLMConfig): boolean {
    try {
      const provider = this.createProvider(config);
      return provider.validateConfig(config);
    } catch {
      return false;
    }
  }
}