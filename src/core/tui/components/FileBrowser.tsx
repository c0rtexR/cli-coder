import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, Spacer } from 'ink';
import { FileBrowserProps, FileTreeNode } from '../../../types/tui.types';

export const FileBrowser: React.FC<FileBrowserProps> = ({
  fileTree,
  selectedPath,
  isActive,
  onFileSelect,
  onFileToggleContext,
  onDirectoryToggle,
  onSearch,
  onMultiSelect,
  searchQuery,
  showHidden,
  multiSelectMode,
  selectedFiles
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(searchQuery);

  const visibleNodes = useMemo(() => {
    const flattenNodes = (nodes: FileTreeNode[], depth = 0): Array<FileTreeNode & { depth: number }> => {
      const result: Array<FileTreeNode & { depth: number }> = [];
      
      for (const node of nodes) {
        result.push({ ...node, depth });
        
        if (node.isExpanded && node.children && node.children.length > 0) {
          result.push(...flattenNodes(node.children, depth + 1));
        }
      }
      
      return result;
    };
    
    return flattenNodes(fileTree);
  }, [fileTree]);

  const selectedIndex = useMemo(() => {
    return visibleNodes.findIndex(node => node.path === selectedPath);
  }, [visibleNodes, selectedPath]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;

    // Handle search mode
    if (searchMode) {
      if (key.escape) {
        setSearchMode(false);
        setCurrentSearchQuery('');
        onSearch('');
        return;
      }
      
      if (key.return) {
        setSearchMode(false);
        onSearch(currentSearchQuery);
        return;
      }
      
      if (key.backspace && currentSearchQuery.length > 0) {
        const newQuery = currentSearchQuery.slice(0, -1);
        setCurrentSearchQuery(newQuery);
        onSearch(newQuery);
        return;
      }
      
      if (input && input.length === 1) {
        const newQuery = currentSearchQuery + input;
        setCurrentSearchQuery(newQuery);
        onSearch(newQuery);
        return;
      }
      
      return;
    }

    // Regular navigation mode
    if (input === '/') {
      setSearchMode(true);
      setCurrentSearchQuery('');
      return;
    }

    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      if (visibleNodes[newIndex]) {
        onFileSelect(visibleNodes[newIndex].path);
        adjustScroll(newIndex);
      }
      return;
    }

    if (key.downArrow) {
      const newIndex = Math.min(visibleNodes.length - 1, selectedIndex + 1);
      if (visibleNodes[newIndex]) {
        onFileSelect(visibleNodes[newIndex].path);
        adjustScroll(newIndex);
      }
      return;
    }

    if (key.leftArrow && selectedPath) {
      const node = visibleNodes.find(n => n.path === selectedPath);
      if (node && node.type === 'directory' && node.isExpanded) {
        onDirectoryToggle(selectedPath);
      }
      return;
    }

    if (key.rightArrow && selectedPath) {
      const node = visibleNodes.find(n => n.path === selectedPath);
      if (node && node.type === 'directory' && !node.isExpanded) {
        onDirectoryToggle(selectedPath);
      }
      return;
    }

    if (key.return && selectedPath) {
      const node = visibleNodes.find(n => n.path === selectedPath);
      if (node) {
        if (node.type === 'directory') {
          onDirectoryToggle(selectedPath);
        } else {
          if (multiSelectMode) {
            onMultiSelect([selectedPath]);
          } else {
            onFileToggleContext(selectedPath);
          }
        }
      }
      return;
    }

    if (input === ' ' && selectedPath) {
      if (multiSelectMode) {
        onMultiSelect([selectedPath]);
      } else {
        const node = visibleNodes.find(n => n.path === selectedPath);
        if (node && node.type === 'file') {
          onFileToggleContext(selectedPath);
        }
      }
      return;
    }

    if (key.pageUp) {
      const newIndex = Math.max(0, selectedIndex - 10);
      if (visibleNodes[newIndex]) {
        onFileSelect(visibleNodes[newIndex].path);
        adjustScroll(newIndex);
      }
      return;
    }

    if (key.pageDown) {
      const newIndex = Math.min(visibleNodes.length - 1, selectedIndex + 10);
      if (visibleNodes[newIndex]) {
        onFileSelect(visibleNodes[newIndex].path);
        adjustScroll(newIndex);
      }
      return;
    }

    if (key.ctrl && input === 'a' && multiSelectMode) {
      const allPaths = visibleNodes.map(node => node.path);
      onMultiSelect(allPaths);
      return;
    }

    if (key.ctrl && input === 'd' && multiSelectMode) {
      onMultiSelect([]);
      return;
    }
  }, { isActive });

  const adjustScroll = (targetIndex: number) => {
    const viewportHeight = 20; // Approximate viewport height
    
    if (targetIndex < scrollOffset) {
      setScrollOffset(targetIndex);
    } else if (targetIndex >= scrollOffset + viewportHeight) {
      setScrollOffset(targetIndex - viewportHeight + 1);
    }
  };

  const renderSearchBar = () => {
    if (!searchMode && !searchQuery) return null;

    return (
      <Box paddingX={1} borderStyle="single" borderColor="blue">
        <Text color="blue">Search: </Text>
        <Text>{searchMode ? currentSearchQuery : searchQuery}</Text>
        {searchMode && <Text color="gray">█</Text>}
      </Box>
    );
  };

  const renderFileTree = () => {
    if (visibleNodes.length === 0) {
      return (
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="gray" italic>
            {searchQuery ? 'No files found matching search' : 'No files found'}
          </Text>
        </Box>
      );
    }

    const viewportHeight = 20;
    const visibleSlice = visibleNodes.slice(scrollOffset, scrollOffset + viewportHeight);

    return (
      <Box flexDirection="column" flexGrow={1}>
        {visibleSlice.map((node, index) => (
          <FileTreeItem
            key={node.path}
            node={node}
            isSelected={node.path === selectedPath}
            isMultiSelected={selectedFiles.includes(node.path)}
            multiSelectMode={multiSelectMode}
            depth={node.depth}
          />
        ))}
      </Box>
    );
  };

  const renderStatusLine = () => {
    const statusItems = [];

    if (multiSelectMode) {
      statusItems.push(`${selectedFiles.length} selected`);
    }

    if (searchQuery) {
      statusItems.push(`Filtered: ${visibleNodes.length} items`);
    } else {
      statusItems.push(`${visibleNodes.length} items`);
    }

    if (showHidden) {
      statusItems.push('Hidden files shown');
    }

    return (
      <Box paddingX={1}>
        <Text color="gray" dimColor>
          {statusItems.join(' • ')}
        </Text>
      </Box>
    );
  };

  const renderShortcuts = () => {
    if (!isActive) return null;

    const shortcuts = [];

    if (searchMode) {
      shortcuts.push('Esc: Cancel', 'Enter: Search');
    } else {
      shortcuts.push('↑↓: Navigate', '←→: Expand/Collapse');
      
      if (multiSelectMode) {
        shortcuts.push('Space: Multi-select', 'Ctrl+A: Select all', 'Ctrl+D: Deselect all');
      } else {
        shortcuts.push('Enter: Select', 'Space: Toggle context');
      }
      
      shortcuts.push('/: Search', 'Tab: Switch panels');
    }

    return (
      <Box paddingX={1}>
        <Text color="gray" dimColor>
          {shortcuts.join(' | ')}
        </Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box paddingX={1}>
        <Text color={isActive ? "green" : "gray"} bold>
          📁 Files
        </Text>
        <Spacer />
        {multiSelectMode && (
          <Text color="yellow" bold>
            [MULTI-SELECT]
          </Text>
        )}
      </Box>

      {/* Search bar */}
      {renderSearchBar()}

      {/* File tree */}
      {renderFileTree()}

      {/* Status line */}
      {renderStatusLine()}

      {/* Shortcuts */}
      {renderShortcuts()}
    </Box>
  );
};

interface FileTreeItemProps {
  node: FileTreeNode & { depth: number };
  isSelected: boolean;
  isMultiSelected: boolean;
  multiSelectMode: boolean;
  depth: number;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  isSelected,
  isMultiSelected,
  multiSelectMode,
  depth
}) => {
  const indent = '  '.repeat(depth);
  const icon = getFileIcon(node);
  const selectionIndicator = isSelected ? '▶ ' : '  ';
  
  let prefix = '';
  if (multiSelectMode) {
    prefix = isMultiSelected ? '☑ ' : '☐ ';
  } else if (node.isInContext) {
    prefix = '✓ ';
  }

  const color = isSelected 
    ? "green" 
    : node.isIgnored 
      ? "gray" 
      : node.isInContext 
        ? "cyan" 
        : "white";

  const sizeText = node.size ? ` (${formatFileSize(node.size)})` : '';
  const modifiedText = node.modifiedAt ? ` - ${formatDate(node.modifiedAt)}` : '';

  return (
    <Box>
      <Text color={color}>
        {selectionIndicator}
        {prefix}
        {indent}
        {icon} {node.name}
        <Text color="gray" dimColor>
          {sizeText}
          {modifiedText}
        </Text>
      </Text>
    </Box>
  );
};

function getFileIcon(node: FileTreeNode): string {
  if (node.type === 'directory') {
    return node.isExpanded ? '📂' : '📁';
  }

  const iconMap: Record<string, string> = {
    '.ts': '📘',
    '.tsx': '📘',
    '.js': '📜',
    '.jsx': '📜',
    '.py': '🐍',
    '.json': '📋',
    '.md': '📝',
    '.html': '🌐',
    '.css': '🎨',
    '.scss': '🎨',
    '.less': '🎨',
    '.svg': '🎨',
    '.png': '🖼️',
    '.jpg': '🖼️',
    '.jpeg': '🖼️',
    '.gif': '🖼️',
    '.pdf': '📕',
    '.txt': '📄',
    '.log': '📊',
    '.yml': '⚙️',
    '.yaml': '⚙️',
    '.xml': '📰',
    '.csv': '📊',
    '.sql': '🗃️',
    '.sh': '⚡',
    '.bat': '⚡',
    '.exe': '⚡',
    '.zip': '📦',
    '.tar': '📦',
    '.gz': '📦',
    '.rar': '📦'
  };

  return iconMap[node.extension || ''] || '📄';
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${Math.round(size)}${units[unitIndex]}`;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}