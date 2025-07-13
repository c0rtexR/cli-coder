import { FileTreeService } from '../../filesystem/file-tree.service';
import { 
  FileTreeNode, 
  FileTreeOptions, 
  FileTreeSearchOptions,
  FileBrowserState,
  FileBrowserControllerInterface,
  FileSystemWatcher,
  FileSystemEvent
} from '../../../types/tui.types';
import { CLIErrorClass } from '../../../utils/errors';
import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'fs';

export class FileBrowserController extends EventEmitter implements FileBrowserControllerInterface {
  private state: FileBrowserState = {
    currentPath: process.cwd(),
    selectedPath: null,
    expandedPaths: new Set(),
    selectedFiles: new Set(),
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    multiSelectMode: false,
    showHidden: false,
    sortBy: 'name',
    sortOrder: 'asc',
    scrollOffset: 0,
    contextFiles: new Set()
  };

  private currentTree: FileTreeNode[] = [];
  private fileWatcher: FSWatcher | null = null;
  private watchingEnabled = false;

  constructor(private fileTreeService: FileTreeService) {
    super();
  }

  async loadDirectory(path: string, options: FileTreeOptions = {}): Promise<FileTreeNode[]> {
    try {
      this.state.currentPath = path;
      
      const treeOptions = {
        ...options,
        showHidden: this.state.showHidden
      };

      const tree = await this.fileTreeService.buildFileTree(path, treeOptions);
      
      // Update context status
      this.fileTreeService.updateContextStatus(tree, Array.from(this.state.contextFiles));
      
      // Apply current expansion state
      this.applyExpansionState(tree);
      
      // Sort the tree
      const sortedTree = this.fileTreeService.sortTree(tree, this.state.sortBy, this.state.sortOrder);
      
      this.currentTree = sortedTree;
      
      // Reset selection if current selection is not in the new tree
      if (this.state.selectedPath && !this.findNodeByPath(this.state.selectedPath)) {
        this.state.selectedPath = null;
      }

      this.emit('treeLoaded', this.currentTree);
      return this.currentTree;
    } catch (error) {
      throw new CLIErrorClass(
        'LOAD_DIRECTORY_ERROR',
        `Failed to load directory: ${path}`,
        error
      );
    }
  }

  selectFile(path: string): void {
    // Clear previous selection
    if (this.state.selectedPath) {
      const prevNode = this.findNodeByPath(this.state.selectedPath);
      if (prevNode) {
        prevNode.isSelected = false;
      }
    }

    // Set new selection
    this.state.selectedPath = path;
    const node = this.findNodeByPath(path);
    if (node) {
      node.isSelected = true;
      this.emit('fileSelected', path, node);
    }
  }

  async toggleDirectory(path: string): Promise<void> {
    const node = this.findNodeByPath(path);
    if (!node || node.type !== 'directory') {
      return;
    }

    if (node.isExpanded) {
      this.collapseDirectory(path);
    } else {
      await this.expandDirectory(path);
    }
  }

  async expandDirectory(path: string): Promise<void> {
    const node = this.findNodeByPath(path);
    if (!node || node.type !== 'directory') {
      return;
    }

    try {
      // Load children if not already loaded
      if (!node.children || node.children.length === 0) {
        const fullPath = this.resolveFullPath(path);
        const childOptions: FileTreeOptions = {
          showHidden: this.state.showHidden,
          maxDepth: 1 // Only load immediate children
        };
        
        const children = await this.fileTreeService.buildFileTree(fullPath, childOptions);
        node.children = children;
        
        // Update context status for children
        this.fileTreeService.updateContextStatus(children, Array.from(this.state.contextFiles));
      }

      node.isExpanded = true;
      this.state.expandedPaths.add(path);
      
      this.emit('directoryExpanded', path, node);
    } catch (error) {
      throw new CLIErrorClass(
        'EXPAND_DIRECTORY_ERROR',
        `Failed to expand directory: ${path}`,
        error
      );
    }
  }

  collapseDirectory(path: string): void {
    const node = this.findNodeByPath(path);
    if (!node || node.type !== 'directory') {
      return;
    }

    node.isExpanded = false;
    this.state.expandedPaths.delete(path);
    
    this.emit('directoryCollapsed', path, node);
  }

  async toggleFileContext(path: string): Promise<void> {
    const node = this.findNodeByPath(path);
    if (!node || node.type !== 'file') {
      return;
    }

    if (this.state.contextFiles.has(path)) {
      this.state.contextFiles.delete(path);
      node.isInContext = false;
      this.emit('fileRemovedFromContext', path, node);
    } else {
      this.state.contextFiles.add(path);
      node.isInContext = true;
      this.emit('fileAddedToContext', path, node);
    }

    this.emit('contextChanged', Array.from(this.state.contextFiles));
  }

  async searchFiles(query: string, options: Partial<FileTreeSearchOptions> = {}): Promise<FileTreeNode[]> {
    this.state.searchQuery = query;
    this.state.isSearching = query.length > 0;

    if (!query) {
      this.state.searchResults = [];
      this.emit('searchCleared');
      return [];
    }

    const searchOptions: FileTreeSearchOptions = {
      query,
      ...options
    };

    const results = this.fileTreeService.searchFiles(this.currentTree, searchOptions);
    this.state.searchResults = results;
    
    this.emit('searchCompleted', query, results);
    return results;
  }

  navigateUp(): void {
    const visibleNodes = this.getVisibleNodes();
    if (visibleNodes.length === 0) return;

    const currentIndex = this.state.selectedPath 
      ? visibleNodes.findIndex(node => node.path === this.state.selectedPath)
      : -1;

    const newIndex = Math.max(0, currentIndex - 1);
    this.selectFile(visibleNodes[newIndex].path);
  }

  navigateDown(): void {
    const visibleNodes = this.getVisibleNodes();
    if (visibleNodes.length === 0) return;

    const currentIndex = this.state.selectedPath 
      ? visibleNodes.findIndex(node => node.path === this.state.selectedPath)
      : -1;

    const newIndex = Math.min(visibleNodes.length - 1, currentIndex + 1);
    this.selectFile(visibleNodes[newIndex].path);
  }

  navigateToParent(): void {
    if (this.state.selectedPath) {
      const parentPath = this.state.selectedPath.split('/').slice(0, -1).join('/');
      if (parentPath && this.findNodeByPath(parentPath)) {
        this.selectFile(parentPath);
      }
    }
  }

  async toggleMultiSelect(path: string): Promise<void> {
    if (!this.state.multiSelectMode) {
      return;
    }

    const node = this.findNodeByPath(path);
    if (!node) return;

    if (this.state.selectedFiles.has(path)) {
      this.state.selectedFiles.delete(path);
    } else {
      this.state.selectedFiles.add(path);
    }

    this.emit('multiSelectionChanged', Array.from(this.state.selectedFiles));
  }

  enableMultiSelectMode(): void {
    this.state.multiSelectMode = true;
    this.emit('multiSelectModeEnabled');
  }

  disableMultiSelectMode(): void {
    this.state.multiSelectMode = false;
    this.clearMultiSelection();
    this.emit('multiSelectModeDisabled');
  }

  clearMultiSelection(): void {
    this.state.selectedFiles.clear();
    this.emit('multiSelectionCleared');
  }

  selectAll(): void {
    if (!this.state.multiSelectMode) return;

    const visibleNodes = this.getVisibleNodes();
    this.state.selectedFiles.clear();
    
    for (const node of visibleNodes) {
      this.state.selectedFiles.add(node.path);
    }

    this.emit('allFilesSelected', Array.from(this.state.selectedFiles));
  }

  getSelectedPath(): string | null {
    return this.state.selectedPath;
  }

  getSelectedFiles(): string[] {
    return Array.from(this.state.selectedFiles);
  }

  getContextFiles(): string[] {
    return Array.from(this.state.contextFiles);
  }

  getCurrentTree(): FileTreeNode[] {
    return this.currentTree;
  }

  isMultiSelectMode(): boolean {
    return this.state.multiSelectMode;
  }

  enableFileSystemWatching(): void {
    if (this.watchingEnabled || this.fileWatcher) {
      return;
    }

    try {
      this.fileWatcher = watch(this.state.currentPath, { recursive: false }, (eventType, filename) => {
        if (filename) {
          const event: FileSystemEvent = {
            type: eventType === 'rename' ? 'created' : 'modified',
            path: filename.toString(),
            isDirectory: false // We'll determine this when we reload
          };
          
          this.handleFileSystemEvent(event);
        }
      });

      this.watchingEnabled = true;
      this.emit('fileSystemWatchingEnabled');
    } catch (error) {
      throw new CLIErrorClass(
        'FILE_WATCHER_ERROR',
        'Failed to enable file system watching',
        error
      );
    }
  }

  disableFileSystemWatching(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    
    this.watchingEnabled = false;
    this.emit('fileSystemWatchingDisabled');
  }

  // Additional utility methods

  toggleHiddenFiles(): void {
    this.state.showHidden = !this.state.showHidden;
    this.emit('hiddenFilesToggled', this.state.showHidden);
    
    // Reload current directory to apply new settings
    this.loadDirectory(this.state.currentPath);
  }

  setSortOrder(sortBy: 'name' | 'size' | 'modified' | 'type', order: 'asc' | 'desc'): void {
    this.state.sortBy = sortBy;
    this.state.sortOrder = order;
    
    this.currentTree = this.fileTreeService.sortTree(this.currentTree, sortBy, order);
    this.emit('sortOrderChanged', sortBy, order);
  }

  getCurrentState(): FileBrowserState {
    return { ...this.state };
  }

  // Private helper methods

  private findNodeByPath(path: string): FileTreeNode | null {
    const searchNode = (nodes: FileTreeNode[]): FileTreeNode | null => {
      for (const node of nodes) {
        if (node.path === path) {
          return node;
        }
        if (node.children) {
          const found = searchNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    return searchNode(this.currentTree);
  }

  private getVisibleNodes(): FileTreeNode[] {
    const visibleNodes: FileTreeNode[] = [];

    const collectVisible = (nodes: FileTreeNode[]) => {
      for (const node of nodes) {
        visibleNodes.push(node);
        if (node.isExpanded && node.children) {
          collectVisible(node.children);
        }
      }
    };

    const nodesToShow = this.state.isSearching ? this.state.searchResults : this.currentTree;
    collectVisible(nodesToShow);
    
    return visibleNodes;
  }

  private applyExpansionState(tree: FileTreeNode[]): void {
    const applyToNode = (node: FileTreeNode) => {
      if (node.type === 'directory' && this.state.expandedPaths.has(node.path)) {
        node.isExpanded = true;
      }
      
      if (node.children) {
        for (const child of node.children) {
          applyToNode(child);
        }
      }
    };

    for (const node of tree) {
      applyToNode(node);
    }
  }

  private resolveFullPath(relativePath: string): string {
    return relativePath.startsWith('/') 
      ? relativePath 
      : `${this.state.currentPath}/${relativePath}`;
  }

  private async handleFileSystemEvent(event: FileSystemEvent): Promise<void> {
    // Reload the current directory to reflect changes
    try {
      await this.loadDirectory(this.state.currentPath);
      this.emit('fileSystemChanged', event);
    } catch (error) {
      this.emit('fileSystemError', error);
    }
  }

  // Cleanup
  destroy(): void {
    this.disableFileSystemWatching();
    this.removeAllListeners();
  }
}