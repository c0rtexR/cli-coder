import OpenAI from 'openai';
import { BaseLLMProvider } from './base.provider';
import { LLMConfig, LLMResponse, ChatContext } from '../../types';
import { CLIErrorClass } from '../../utils/errors';

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  get name(): string {
    return 'OpenAI';
  }

  async generateResponse(prompt: string, context: ChatContext): Promise<LLMResponse> {
    try {
      const messages = this.buildMessages(prompt, context);
      
      // Add file context to the last user message if files are present
      if (context.files.length > 0) {
        const lastMessage = messages[messages.length - 1];
        lastMessage.content += this.formatFileContext(context);
      }

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 4000,
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new CLIErrorClass('LLM_NO_RESPONSE', 'No response from OpenAI');
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model: response.model,
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new CLIErrorClass('OPENAI_API_ERROR', error.message, error);
      }
      throw error;
    }
  }

  validateConfig(config: LLMConfig): boolean {
    if (!config.apiKey || !config.apiKey.startsWith('sk-')) {
      return false;
    }
    
    const validModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    return validModels.includes(config.model);
  }
}