import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base.provider';
import { LLMConfig, LLMResponse, ChatContext } from '@/types';
import { CLIErrorClass } from '@/utils/errors';

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  get name(): string {
    return 'Anthropic';
  }

  async generateResponse(prompt: string, context: ChatContext): Promise<LLMResponse> {
    try {
      // Convert messages to Anthropic format
      const messages = this.buildAnthropicMessages(prompt, context);
      
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4000,
        temperature: this.config.temperature || 0.7,
        system: context.systemPrompt,
        messages: messages,
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new CLIErrorClass('ANTHROPIC_INVALID_RESPONSE', 'Expected text response');
      }

      return {
        content: content.text,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model: response.model,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'constructor' in error && error.constructor.name === 'APIError') {
        throw new CLIErrorClass('ANTHROPIC_API_ERROR', (error as any).message, error);
      }
      throw error;
    }
  }

  private buildAnthropicMessages(prompt: string, context: ChatContext): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    // Add conversation history (skip system messages as they're handled separately)
    context.messages.forEach(msg => {
      if (msg.role !== 'system') {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    });

    // Add current prompt with file context
    let currentPrompt = prompt;
    if (context.files.length > 0) {
      currentPrompt += this.formatFileContext(context);
    }

    messages.push({
      role: 'user',
      content: currentPrompt
    });

    return messages;
  }

  validateConfig(config: LLMConfig): boolean {
    if (!config.apiKey || !config.apiKey.startsWith('sk-ant-')) {
      return false;
    }
    
    const validModels = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
    return validModels.includes(config.model);
  }
}