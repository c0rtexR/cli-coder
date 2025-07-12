import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { ChatSession, ChatMessage } from '../../../types';
import { formatDistanceToNow } from 'date-fns';

interface ChatPanelProps {
  session: ChatSession;
  isActive: boolean;
  onActivate: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  session, 
  isActive, 
  onActivate 
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [maxVisibleLines, setMaxVisibleLines] = useState(20);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const totalLines = calculateTotalLines(session.messages);
    if (totalLines > maxVisibleLines) {
      setScrollOffset(totalLines - maxVisibleLines);
    }
  }, [session.messages, maxVisibleLines]);

  useInput((input, key) => {
    if (!isActive) return;

    if (key.upArrow) {
      setScrollOffset(Math.max(0, scrollOffset - 1));
    } else if (key.downArrow) {
      const totalLines = calculateTotalLines(session.messages);
      setScrollOffset(Math.min(totalLines - maxVisibleLines, scrollOffset + 1));
    } else if (key.pageUp) {
      setScrollOffset(Math.max(0, scrollOffset - 10));
    } else if (key.pageDown) {
      const totalLines = calculateTotalLines(session.messages);
      setScrollOffset(Math.min(totalLines - maxVisibleLines, scrollOffset + 10));
    }
  }, { isActive });

  const handleClick = () => {
    onActivate();
  };

  const renderMessages = () => {
    if (session.messages.length === 0) {
      return (
        <Box justifyContent="center" alignItems="center" height="100%">
          <Text color="gray" italic>Start a conversation...</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        {session.messages.map((message, index) => (
          <MessageItem key={index} message={message} />
        ))}
      </Box>
    );
  };

  return (
    <Box 
      flexDirection="column" 
      height="100%" 
      onClick={handleClick}
      borderColor={isActive ? "blue" : "gray"}
    >
      <Box paddingX={1} backgroundColor={isActive ? "blue" : undefined}>
        <Text color={isActive ? "white" : "blue"} bold>💬 Chat</Text>
        {session.messages.length > 0 && (
          <Text color={isActive ? "white" : "gray"}>
            {" "}({session.messages.length} messages)
          </Text>
        )}
      </Box>
      
      <Box flexGrow={1} paddingX={1} overflow="hidden">
        {renderMessages()}
      </Box>
      
      {isActive && (
        <Box paddingX={1}>
          <Text color="gray" dimColor>↑↓: Scroll | PgUp/PgDn: Fast scroll</Text>
        </Box>
      )}
    </Box>
  );
};

const MessageItem: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const timestamp = formatDistanceToNow(message.timestamp, { addSuffix: true });
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={isUser ? "cyan" : "green"} bold>
          {isUser ? "👤 You" : "🤖 Assistant"}
        </Text>
        <Text color="gray" dimColor> • {timestamp}</Text>
      </Box>
      
      <Box paddingLeft={3}>
        <Text>{formatMessageContent(message.content)}</Text>
      </Box>
    </Box>
  );
};

function formatMessageContent(content: string): string {
  // Basic formatting - could be enhanced with syntax highlighting
  return content;
}

function calculateTotalLines(messages: ChatMessage[]): number {
  // Simplified calculation - could be more accurate
  return messages.reduce((total, message) => {
    const lines = message.content.split('\n').length;
    return total + lines + 2; // +2 for header and spacing
  }, 0);
}