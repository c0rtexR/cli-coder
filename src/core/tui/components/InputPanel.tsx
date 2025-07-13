import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { InputPanelProps, ChatSession } from '../../../types';
import { llmService } from '../../../integrations/llm';

export const InputPanel: React.FC<InputPanelProps> = ({ 
  session, 
  isActive, 
  onActivate 
}) => {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  useInput((inputChar: string, key: any) => {
    if (!isActive) return;

    if (key.ctrl && key.return) {
      handleSendMessage();
    } else if (key.upArrow) {
      // Navigate command history
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (key.downArrow) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (key.backspace) {
      setInput(input.slice(0, -1));
    } else if (key.delete) {
      // Delete character at cursor (simplified)
      setInput(input.slice(0, -1));
    } else if (inputChar && !key.ctrl && !key.meta) {
      setInput(input + inputChar);
    }
  }, { isActive });

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    setCommandHistory(prev => [...prev, message]);
    setHistoryIndex(-1);

    // Add user message
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    try {
      setIsLoading(true);
      
      // Handle slash commands
      if (message.startsWith('/')) {
        await handleSlashCommand(message);
      } else {
        // Send to LLM
        const response = await llmService.generateResponse(message, {
          messages: session.messages,
          files: session.context,
        });

        session.messages.push({
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      session.messages.push({
        role: 'assistant',
        content: `Error: ${(error as Error).message}`,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlashCommand = async (command: string) => {
    const parts = command.slice(1).split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'clear':
        session.messages = [];
        break;
      case 'help':
        session.messages.push({
          role: 'assistant',
          content: getHelpMessage(),
          timestamp: new Date(),
        });
        break;
      // Add other commands as needed
      default:
        session.messages.push({
          role: 'assistant',
          content: `Unknown command: /${cmd}. Type /help for available commands.`,
          timestamp: new Date(),
        });
    }
  };

  const handleClick = () => {
    onActivate();
  };

  return (
    <Box 
      flexDirection="column" 
      height="100%"
    >
      <Box paddingX={1}>
        <Text color={isActive ? "black" : "yellow"} bold>⌨️  Input</Text>
        {isLoading && (
          <Text color={isActive ? "black" : "gray"}> (Thinking...)</Text>
        )}
      </Box>
      
      <Box paddingX={1} flexGrow={1}>
        <Text color="cyan">{">"} </Text>
        <Text>{input}</Text>
        {isActive && <Text color="black" inverse> </Text>}
      </Box>
      
      {isActive && (
        <Box paddingX={1}>
          <Text color="gray" dimColor>
            Ctrl+Enter: Send | ↑↓: History | Type /help for commands
          </Text>
        </Box>
      )}
    </Box>
  );
};

function getHelpMessage(): string {
  return `Available commands:
/help - Show this help
/clear - Clear chat history
/add <file> - Add files to context
/remove <file> - Remove files from context
/context - Show files in context

Use Ctrl+Enter to send messages.`;
}