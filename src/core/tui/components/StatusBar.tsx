import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  provider: string;
  model: string;
  fileCount: number;
  activePanel: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  provider, 
  model, 
  fileCount, 
  activePanel 
}) => {
  return (
    <Box justifyContent="space-between" paddingX={1} backgroundColor="blue">
      <Box>
        <Text color="white" bold>🤖 CLI Coder</Text>
        <Text color="white"> | {provider} ({model})</Text>
      </Box>
      
      <Box>
        <Text color="white">Files: {fileCount}</Text>
        <Text color="white"> | Active: {activePanel}</Text>
        <Text color="white"> | Ctrl+H: Help</Text>
      </Box>
    </Box>
  );
};