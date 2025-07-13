import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { FileBrowser } from './FileBrowser';
import { FileBrowserController } from '../controllers/file-browser.controller';
import { FileTreeService } from '../../filesystem/file-tree.service';
import type { FilePanelProps, FileTreeNode } from '../../../types/tui.types';

export const EnhancedFilePanel: React.FC<FilePanelProps> = ({ 
  session, 
  isActive, 
  onActivate 
}) => {
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize services
  const [fileTreeService] = useState(() => new FileTreeService());
  const [controller] = useState(() => new FileBrowserController(fileTreeService));

  // Load initial file tree
  useEffect(() => {
    const loadFileTree = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const tree = await controller.loadDirectory(process.cwd(), {
          showHidden,
          respectGitignore: true
        });
        
        // Update context status based on session files
        const contextFiles = session.context.map(file => file.path);
        fileTreeService.updateContextStatus(tree, contextFiles);
        
        setFileTree(tree);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file tree');
      } finally {
        setIsLoading(false);
      }
    };

    loadFileTree();
  }, [controller, fileTreeService, session.context, showHidden]);

  // Set up controller event listeners
  useEffect(() => {
    const handleTreeLoaded = (tree: FileTreeNode[]) => {
      setFileTree(tree);
    };

    const handleFileSelected = (path: string) => {
      setSelectedPath(path);
    };

    const handleFileAddedToContext = (path: string, node: FileTreeNode) => {
      // Add file to session context
      const fileContext = {
        path: node.path,
        content: '', // Will be loaded when needed
        language: getLanguageFromExtension(node.extension || ''),
        size: node.size || 0,
        lastModified: node.modifiedAt || new Date()
      };
      
      if (!session.context.find(f => f.path === path)) {
        session.context.push(fileContext);
      }
    };

    const handleFileRemovedFromContext = (path: string) => {
      const index = session.context.findIndex(f => f.path === path);
      if (index !== -1) {
        session.context.splice(index, 1);
      }
    };

    const handleMultiSelectionChanged = (paths: string[]) => {
      setSelectedFiles(paths);
    };

    const handleSearchCompleted = (query: string, results: FileTreeNode[]) => {
      if (query) {
        setFileTree(results);
      }
    };

    // Register event listeners
    controller.on('treeLoaded', handleTreeLoaded);
    controller.on('fileSelected', handleFileSelected);
    controller.on('fileAddedToContext', handleFileAddedToContext);
    controller.on('fileRemovedFromContext', handleFileRemovedFromContext);
    controller.on('multiSelectionChanged', handleMultiSelectionChanged);
    controller.on('searchCompleted', handleSearchCompleted);

    return () => {
      controller.off('treeLoaded', handleTreeLoaded);
      controller.off('fileSelected', handleFileSelected);
      controller.off('fileAddedToContext', handleFileAddedToContext);
      controller.off('fileRemovedFromContext', handleFileRemovedFromContext);
      controller.off('multiSelectionChanged', handleMultiSelectionChanged);
      controller.off('searchCompleted', handleSearchCompleted);
    };
  }, [controller, session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controller.destroy();
    };
  }, [controller]);

  // Callback handlers for FileBrowser
  const handleFileSelect = useCallback((path: string) => {
    controller.selectFile(path);
  }, [controller]);

  const handleFileToggleContext = useCallback(async (path: string) => {
    await controller.toggleFileContext(path);
  }, [controller]);

  const handleDirectoryToggle = useCallback(async (path: string) => {
    await controller.toggleDirectory(path);
  }, [controller]);

  const handleSearch = useCallback(async (query: string, options: Partial<import('../../../types/tui.types').FileTreeSearchOptions> = {}) => {
    setSearchQuery(query);
    if (query) {
      await controller.searchFiles(query, { query, ...options });
    } else {
      // Clear search - reload original tree
      const tree = await controller.loadDirectory(process.cwd(), {
        showHidden,
        respectGitignore: true
      });
      setFileTree(tree);
    }
  }, [controller, showHidden]);

  const handleMultiSelect = useCallback(async (paths: string[]) => {
    if (paths.length === 0) {
      controller.clearMultiSelection();
    } else {
      for (const path of paths) {
        await controller.toggleMultiSelect(path);
      }
    }
  }, [controller]);

  // Toggle hidden files
  const toggleHiddenFiles = useCallback(() => {
    setShowHidden(!showHidden);
    controller.toggleHiddenFiles();
  }, [controller, showHidden]);

  // Toggle multi-select mode
  const toggleMultiSelectMode = useCallback(() => {
    if (multiSelectMode) {
      controller.disableMultiSelectMode();
    } else {
      controller.enableMultiSelectMode();
    }
    setMultiSelectMode(!multiSelectMode);
  }, [controller, multiSelectMode]);

  if (isLoading) {
    return (
      <Box flexDirection="column" height="100%">
        <Box paddingX={1}>
          <Text color="green" bold>📁 Files</Text>
        </Box>
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="yellow">Loading file tree...</Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" height="100%">
        <Box paddingX={1}>
          <Text color="green" bold>📁 Files</Text>
        </Box>
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
        <Box paddingX={1}>
          <Text color="gray" dimColor>Press F5 to retry</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <FileBrowser
        fileTree={fileTree}
        selectedPath={selectedPath}
        isActive={isActive}
        onFileSelect={handleFileSelect}
        onFileToggleContext={handleFileToggleContext}
        onDirectoryToggle={handleDirectoryToggle}
        onSearch={handleSearch}
        onMultiSelect={handleMultiSelect}
        searchQuery={searchQuery}
        showHidden={showHidden}
        multiSelectMode={multiSelectMode}
        selectedFiles={selectedFiles}
      />

      {/* Additional controls when active */}
      {isActive && (
        <Box paddingX={1} borderTop>
          <Text color="gray" dimColor>
            F5: Refresh | Ctrl+H: Toggle hidden | Ctrl+M: Multi-select
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Helper function to determine language from file extension
function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.html': 'html',
    '.htm': 'html',
    '.xml': 'xml',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.ini': 'ini',
    '.cfg': 'ini',
    '.conf': 'ini',
    '.md': 'markdown',
    '.txt': 'text',
    '.sql': 'sql',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'zsh',
    '.fish': 'fish',
    '.ps1': 'powershell',
    '.bat': 'batch',
    '.cmd': 'batch',
    '.dockerfile': 'dockerfile',
    '.dockerignore': 'text',
    '.gitignore': 'text',
    '.gitattributes': 'text',
    '.editorconfig': 'text',
    '.env': 'text',
    '.log': 'text'
  };

  return languageMap[extension.toLowerCase()] || 'text';
}