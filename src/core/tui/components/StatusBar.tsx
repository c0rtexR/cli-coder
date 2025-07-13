import React from 'react';
import { Box, Text } from 'ink';
import type { StatusBarProps } from '../../../types/tui.types';

export const StatusBar: React.FC<StatusBarProps> = ({ 
  provider, 
  model, 
  fileCount, 
  activePanel 
}) => {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box>
        <Text color="blue" bold>🤖 CLI Coder</Text>
        <Text color="blue"> | {provider} ({model})</Text>
      </Box>
      
      <Box>
        <Text color="blue">Files: {fileCount}</Text>
        <Text color="blue"> | Active: {activePanel}</Text>
        <Text color="blue"> | Ctrl+H: Help</Text>
      </Box>
    </Box>
  );
};