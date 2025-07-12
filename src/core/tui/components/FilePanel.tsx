import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ChatSession } from '../../../types';

interface FilePanelProps {
  session: ChatSession;
  isActive: boolean;
  onActivate: () => void;
}

export const FilePanel: React.FC<FilePanelProps> = ({ 
  session, 
  isActive, 
  onActivate 
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  useInput((input, key) => {
    if (!isActive) return;

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < session.context.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (key.return) {
      // Toggle file in context (remove since it's already there)
      handleRemoveFile(selectedIndex);
    } else if (input === ' ') {
      setShowPreview(!showPreview);
    }
  }, { isActive });

  const handleRemoveFile = (index: number) => {
    session.context.splice(index, 1);
    if (selectedIndex >= session.context.length && session.context.length > 0) {
      setSelectedIndex(session.context.length - 1);
    }
  };

  const handleClick = () => {
    onActivate();
  };

  const renderFileList = () => {
    if (session.context.length === 0) {
      return (
        <Box justifyContent="center" alignItems="center" height="100%">
          <Box flexDirection="column" alignItems="center">
            <Text color="gray" italic>No files in context</Text>
            <Text color="gray" dimColor>Use /add command to add files</Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        {session.context.map((file, index) => (
          <FileItem 
            key={file.path}
            file={file}
            isSelected={index === selectedIndex && isActive}
            index={index}
          />
        ))}
      </Box>
    );
  };

  const selectedFile = session.context[selectedIndex];

  return (
    <Box 
      flexDirection="column" 
      height="100%" 
      onClick={handleClick}
      borderColor={isActive ? "green" : "gray"}
    >
      <Box paddingX={1} backgroundColor={isActive ? "green" : undefined}>
        <Text color={isActive ? "white" : "green"} bold>📁 Files</Text>
        {session.context.length > 0 && (
          <Text color={isActive ? "white" : "gray"}>
            {" "}({session.context.length} files)
          </Text>
        )}
      </Box>
      
      <Box flexGrow={1} paddingX={1} overflow="hidden">
        {showPreview && selectedFile ? (
          <FilePreview file={selectedFile} onClose={() => setShowPreview(false)} />
        ) : (
          renderFileList()
        )}
      </Box>
      
      {isActive && session.context.length > 0 && (
        <Box paddingX={1}>
          <Text color="gray" dimColor>
            ↑↓: Navigate | Enter: Remove | Space: Preview
          </Text>
        </Box>
      )}
    </Box>
  );
};

const FileItem: React.FC<{ 
  file: any; 
  isSelected: boolean; 
  index: number;
}> = ({ file, isSelected, index }) => {
  const sizeKB = Math.round(file.size / 1024);
  
  return (
    <Box backgroundColor={isSelected ? "green" : undefined}>
      <Text color={isSelected ? "white" : "green"}>
        {isSelected ? "▶ " : "  "}
        {getFileIcon(file.language)} {file.path}
      </Text>
      <Text color={isSelected ? "white" : "gray"} dimColor>
        {" "}({sizeKB}KB)
      </Text>
    </Box>
  );
};

const FilePreview: React.FC<{ 
  file: any; 
  onClose: () => void;
}> = ({ file, onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose();
    }
  });

  const lines = file.content.split('\n').slice(0, 15); // Show first 15 lines

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingBottom={1}>
        <Text bold>{file.path}</Text>
        <Text color="gray"> ({file.language})</Text>
      </Box>
      
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {lines.map((line: string, index: number) => (
          <Text key={index}>
            <Text color="gray">{(index + 1).toString().padStart(3)}: </Text>
            {line}
          </Text>
        ))}
        
        {file.content.split('\n').length > 15 && (
          <Text color="gray" italic>... and more lines</Text>
        )}
      </Box>
      
      <Box paddingTop={1}>
        <Text color="gray" dimColor>Press Esc or 'q' to close preview</Text>
      </Box>
    </Box>
  );
};

function getFileIcon(language: string): string {
  const icons: Record<string, string> = {
    javascript: "📜",
    typescript: "📘",
    python: "🐍",
    json: "📋",
    markdown: "📝",
    html: "🌐",
    css: "🎨",
    text: "📄",
  };
  
  return icons[language] || "📄";
}