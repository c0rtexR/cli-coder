import { promises as fs, Stats } from 'fs';
import * as path from 'path';
import { 
  FileTreeNode, 
  FileTreeOptions, 
  FileTreeSearchOptions,
  FileTreeServiceInterface 
} from '../../types/tui.types';
import { CLIErrorClass } from '../../utils/errors';

export class FileTreeService implements FileTreeServiceInterface {
  private cache = new Map<string, { tree: FileTreeNode[]; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 seconds cache
  
  private readonly DEFAULT_EXCLUDED_PATTERNS = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/.nyc_output/**',
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/*.log',
    '**/.env*',
    '**/.cli-coder-backups/**'
  ];

  private readonly GITIGNORE_PATTERNS = [
    'node_modules',
    'dist',
    'build',
    '.next',
    'coverage',
    '.nyc_output',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
    '.env',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local'
  ];

  async buildFileTree(rootPath: string, options: FileTreeOptions = {}): Promise<FileTreeNode[]> {
    const {
      showHidden = false,
      respectGitignore = true,
      maxDepth = 10,
      excludePatterns = []
    } = options;

    // Check cache first
    const cacheKey = `${rootPath}-${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.tree;
    }

    try {
      const allExcludePatterns = [
        ...this.DEFAULT_EXCLUDED_PATTERNS,
        ...excludePatterns
      ];

      const tree = await this.buildDirectoryTree(
        rootPath, 
        rootPath, 
        0, 
        maxDepth, 
        showHidden, 
        respectGitignore,
        allExcludePatterns
      );

      // Cache the result
      this.cache.set(cacheKey, { tree, timestamp: Date.now() });

      return tree;
    } catch (error) {
      throw new CLIErrorClass(
        'FILE_TREE_ERROR',
        `Failed to build file tree for ${rootPath}`,
        error
      );
    }
  }

  private async buildDirectoryTree(
    currentPath: string,
    rootPath: string,
    currentDepth: number,
    maxDepth: number,
    showHidden: boolean,
    respectGitignore: boolean,
    excludePatterns: string[]
  ): Promise<FileTreeNode[]> {
    if (currentDepth >= maxDepth) {
      return [];
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      const nodes: FileTreeNode[] = [];

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);

        // Skip hidden files if not showing them
        if (!showHidden && entry.name.startsWith('.')) {
          continue;
        }

        // Check exclude patterns
        if (this.isExcluded(relativePath, excludePatterns)) {
          continue;
        }

        const isIgnored = respectGitignore && this.isGitIgnored(entry.name, relativePath);

        let stats: Stats;
        try {
          stats = await fs.stat(fullPath);
        } catch (error) {
          // Skip files we can't stat (broken symlinks, permission issues)
          continue;
        }

        const node: FileTreeNode = {
          id: relativePath || entry.name,
          name: entry.name,
          path: relativePath || entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          isSelected: false,
          isInContext: false,
          isIgnored
        };

        if (entry.isFile()) {
          node.extension = path.extname(entry.name);
          node.size = stats.size;
          node.modifiedAt = stats.mtime;
        } else if (entry.isDirectory()) {
          node.isExpanded = false;
          node.children = [];
        }

        nodes.push(node);
      }

      // Sort nodes: directories first, then files, both alphabetically
      return this.sortTree(nodes, 'name', 'asc');
    } catch (error) {
      throw new CLIErrorClass(
        'DIRECTORY_READ_ERROR',
        `Failed to read directory ${currentPath}`,
        error
      );
    }
  }

  searchFiles(tree: FileTreeNode[], options: FileTreeSearchOptions): FileTreeNode[] {
    const {
      query,
      fileTypes = [],
      modifiedAfter,
      modifiedBefore,
      maxResults = 100
    } = options;

    const results: FileTreeNode[] = [];
    const queryLower = query.toLowerCase();

    const searchNode = (node: FileTreeNode) => {
      // Check name match (fuzzy search)
      const nameMatch = !query || this.fuzzyMatch(node.name.toLowerCase(), queryLower);
      
      // Check file type filter
      const typeMatch = fileTypes.length === 0 || 
        (node.extension && fileTypes.includes(node.extension));
      
      // Check date filters
      const dateMatch = this.checkDateFilters(node, modifiedAfter, modifiedBefore);

      if (nameMatch && typeMatch && dateMatch) {
        results.push({ ...node });
      }

      // Search in children
      if (node.children && results.length < maxResults) {
        for (const child of node.children) {
          if (results.length >= maxResults) break;
          searchNode(child);
        }
      }
    };

    for (const node of tree) {
      if (results.length >= maxResults) break;
      searchNode(node);
    }

    return results;
  }

  toggleDirectory(node: FileTreeNode): void {
    if (node.type === 'directory') {
      node.isExpanded = !node.isExpanded;
    }
  }

  updateContextStatus(tree: FileTreeNode[], contextFiles: string[]): void {
    const contextSet = new Set(contextFiles);

    const updateNode = (node: FileTreeNode) => {
      node.isInContext = contextSet.has(node.path);
      
      if (node.children) {
        for (const child of node.children) {
          updateNode(child);
        }
      }
    };

    for (const node of tree) {
      updateNode(node);
    }
  }

  filterTree(tree: FileTreeNode[], predicate: (node: FileTreeNode) => boolean): FileTreeNode[] {
    const filtered: FileTreeNode[] = [];

    for (const node of tree) {
      if (predicate(node)) {
        const filteredNode = { ...node };
        
        if (node.children) {
          filteredNode.children = this.filterTree(node.children, predicate);
        }
        
        filtered.push(filteredNode);
      } else if (node.children) {
        // Check if any children match
        const filteredChildren = this.filterTree(node.children, predicate);
        if (filteredChildren.length > 0) {
          filtered.push({
            ...node,
            children: filteredChildren
          });
        }
      }
    }

    return filtered;
  }

  sortTree(
    tree: FileTreeNode[], 
    sortBy: 'name' | 'size' | 'modified' | 'type', 
    order: 'asc' | 'desc'
  ): FileTreeNode[] {
    const multiplier = order === 'asc' ? 1 : -1;

    return tree.sort((a, b) => {
      // Always put directories first
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name) * multiplier;
        
        case 'size':
          const aSize = a.size || 0;
          const bSize = b.size || 0;
          return (aSize - bSize) * multiplier;
        
        case 'modified':
          const aTime = a.modifiedAt?.getTime() || 0;
          const bTime = b.modifiedAt?.getTime() || 0;
          return (aTime - bTime) * multiplier;
        
        case 'type':
          const aExt = a.extension || '';
          const bExt = b.extension || '';
          return aExt.localeCompare(bExt) * multiplier;
        
        default:
          return a.name.localeCompare(b.name) * multiplier;
      }
    });
  }

  private isExcluded(relativePath: string, excludePatterns: string[]): boolean {
    for (const pattern of excludePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  private isGitIgnored(fileName: string, relativePath: string): boolean {
    for (const pattern of this.GITIGNORE_PATTERNS) {
      if (fileName === pattern || relativePath.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Simple pattern matching - convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  private fuzzyMatch(text: string, query: string): boolean {
    if (!query) return true;
    
    let textIndex = 0;
    let queryIndex = 0;
    
    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex] === query[queryIndex]) {
        queryIndex++;
      }
      textIndex++;
    }
    
    return queryIndex === query.length;
  }

  private checkDateFilters(
    node: FileTreeNode, 
    modifiedAfter?: Date, 
    modifiedBefore?: Date
  ): boolean {
    if (!node.modifiedAt) return true;
    
    if (modifiedAfter && node.modifiedAt < modifiedAfter) {
      return false;
    }
    
    if (modifiedBefore && node.modifiedAt > modifiedBefore) {
      return false;
    }
    
    return true;
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}