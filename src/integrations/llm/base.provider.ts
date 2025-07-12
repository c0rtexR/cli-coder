import { LLMProvider, LLMConfig, LLMResponse, ChatContext } from '../../types';

export abstract class BaseLLMProvider implements LLMProvider {
  protected config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract get name(): string;
  abstract generateResponse(prompt: string, context: ChatContext): Promise<LLMResponse>;
  abstract validateConfig(config: LLMConfig): boolean;

  protected buildMessages(prompt: string, context: ChatContext): Array<{ role: string; content: string }> {
    const messages = [];
    
    // Add system prompt if provided
    if (context.systemPrompt) {
      messages.push({
        role: 'system',
        content: context.systemPrompt
      });
    }

    // Add conversation history
    context.messages.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    return messages;
  }

  protected formatFileContext(context: ChatContext): string {
    if (context.files.length === 0) return '';
    
    let fileContext = '\n\n--- File Context ---\n';
    context.files.forEach(file => {
      fileContext += `\n=== ${file.path} ===\n`;
      fileContext += file.content;
      fileContext += '\n';
    });
    
    return fileContext;
  }
}