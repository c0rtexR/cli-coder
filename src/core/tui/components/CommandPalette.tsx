import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface Command {
  name: string;
  description: string;
  usage: string;
  category: 'chat' | 'files' | 'shell' | 'help';
  execute: (args?: string[]) => Promise<void> | void;
}

interface CommandPaletteProps {
  commands: Command[];
  onSelect: (command: Command) => void;
  onCancel: () => void;
  isVisible: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  commands,
  onSelect,
  onCancel,
  isVisible,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');

  // Filter commands based on search text
  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(filter.toLowerCase()) ||
    cmd.description.toLowerCase().includes(filter.toLowerCase())
  );

  useInput((input, key) => {
    if (!isVisible) return;

    if (key.escape) {
      onCancel();
    } else if (key.return) {
      if (filteredCommands[selectedIndex]) {
        onSelect(filteredCommands[selectedIndex]);
      }
    } else if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(filteredCommands.length - 1, selectedIndex + 1));
    } else if (key.backspace) {
      setFilter(filter.slice(0, -1));
      setSelectedIndex(0);
    } else if (input && !key.ctrl && !key.meta) {
      setFilter(filter + input);
      setSelectedIndex(0);
    }
  }, { isActive: isVisible });

  if (!isVisible) return null;

  return (
    <Box
      position="absolute"
      top={2}
      left={2}
      right={2}
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      backgroundColor="black"
    >
      <Box paddingX={1} backgroundColor="cyan">
        <Text color="black" bold>🔍 Command Palette</Text>
      </Box>

      <Box paddingX={1} paddingY={1}>
        <Text color="cyan">Search: /{filter}</Text>
        {filter && (
          <Text color="gray"> ({filteredCommands.length} matches)</Text>
        )}
      </Box>

      <Box flexDirection="column" maxHeight={10} overflow="hidden">
        {filteredCommands.length === 0 ? (
          <Box paddingX={1}>
            <Text color="red">No commands found</Text>
          </Box>
        ) : (
          filteredCommands.map((command, index) => (
            <CommandItem
              key={command.name}
              command={command}
              isSelected={index === selectedIndex}
            />
          ))
        )}
      </Box>

      <Box paddingX={1} borderStyle="single" borderTop borderColor="gray">
        <Text color="gray" dimColor>
          ↑↓: Navigate | Enter: Select | Esc: Cancel | Type to filter
        </Text>
      </Box>
    </Box>
  );
};

const CommandItem: React.FC<{
  command: Command;
  isSelected: boolean;
}> = ({ command, isSelected }) => {
  const getCategoryIcon = (category: Command['category']) => {
    switch (category) {
      case 'chat': return '💬';
      case 'files': return '📁';
      case 'shell': return '🔧';
      case 'help': return '❓';
      default: return '⚡';
    }
  };

  const getCategoryColor = (category: Command['category']) => {
    switch (category) {
      case 'chat': return 'blue';
      case 'files': return 'green';
      case 'shell': return 'yellow';
      case 'help': return 'magenta';
      default: return 'white';
    }
  };

  return (
    <Box
      paddingX={1}
      backgroundColor={isSelected ? getCategoryColor(command.category) : undefined}
    >
      <Text color={isSelected ? 'black' : getCategoryColor(command.category)}>
        {getCategoryIcon(command.category)} /{command.name}
      </Text>
      <Text color={isSelected ? 'black' : 'gray'} dimColor={!isSelected}>
        {' '}- {command.description}
      </Text>
    </Box>
  );
};