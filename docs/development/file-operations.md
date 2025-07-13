# File Operations Implementation

## Overview

The file operations feature enables safe reading and writing of files within the chat context, allowing the AI to understand and modify code files. This implementation follows security best practices and provides user confirmations for all file modifications.

## Architecture

### Core Components

#### FileReader (`src/integrations/filesystem/reader.ts`)
Handles secure file reading with validation:
- **File size limits**: Maximum 1MB per file to prevent memory issues
- **File type validation**: Supports 30+ programming languages and common file types
- **Security checks**: Path validation, permission checks, exists validation
- **Language detection**: Automatic language detection based on file extensions
- **Batch operations**: Supports reading multiple files with error resilience

**Key Features:**
- Validates file existence and type before reading
- Enforces size limits (1MB) to prevent memory issues  
- Detects programming language automatically
- Handles permission errors gracefully
- Supports batch reading with partial failure tolerance

#### FileWriter (`src/integrations/filesystem/writer.ts`)
Handles secure file writing with user confirmations:
- **Backup creation**: Automatic backups before overwriting files
- **User confirmations**: Interactive prompts for all write operations
- **Directory creation**: Creates parent directories as needed
- **Diff previews**: Shows changes when overwriting existing files
- **Batch operations**: Supports writing multiple files with progress tracking

**Key Features:**
- Creates timestamped backups automatically
- Shows content previews for new files
- Displays diff summaries for file overwrites
- Requires explicit user confirmation for all operations
- Progress tracking for multiple file operations

#### FileService (`src/integrations/filesystem/service.ts`)
Main interface for file operations:
- **Glob pattern support**: Uses glob patterns for flexible file selection
- **Security validation**: Path validation to prevent directory traversal
- **File filtering**: Excludes system files and unsupported types
- **Integration layer**: Bridges between chat commands and file operations

**Key Features:**
- Expands glob patterns to find matching files
- Filters out common directories (node_modules, .git, etc.)
- Validates file paths for security
- Provides unified interface for reading and writing

### Chat Integration

#### CommandParser Updates (`src/core/chat/parser.ts`)
Extended with new commands:

**New Commands:**
- `/add <pattern>` - Add files to context using glob patterns
- `/remove <file>` - Remove specific files from context  
- `/remove all` - Remove all files from context
- `/context` - Enhanced to show file sizes and languages

**Examples:**
```bash
/add src/main.ts              # Add single file
/add src/**/*.ts             # Add all TypeScript files
/add package.json README.md  # Add multiple specific files
/remove src/main.ts          # Remove specific file
/remove all                  # Clear all context
```

#### Enhanced Help System
Updated help display includes:
- Command descriptions and usage patterns
- File pattern examples
- Context management instructions

## Security Features

### Path Validation
- Prevents directory traversal attacks (`../../../etc/passwd`)
- Rejects absolute paths (`/etc/passwd`)
- Blocks Windows drive paths (`C:\Windows\System32`)

### File Type Restrictions
- Supports only text-based files (source code, configuration, documentation)
- Blocks binary files, executables, and system files
- Configurable file size limits (1MB default)

### User Confirmation Flow
1. **New files**: Shows content preview, requires confirmation
2. **Existing files**: Shows diff preview, requires overwrite confirmation
3. **Backups**: Automatic backup creation with timestamps
4. **Cancellation**: Users can cancel any operation

## Supported File Types

The system supports 30+ file extensions:
- **JavaScript/TypeScript**: `.js`, `.ts`, `.jsx`, `.tsx`
- **Python**: `.py`
- **Java**: `.java`
- **C/C++**: `.c`, `.cpp`, `.h`
- **Web**: `.css`, `.scss`, `.html`, `.xml`
- **Data**: `.json`, `.yaml`, `.yml`
- **Documentation**: `.md`, `.txt`
- **Scripts**: `.sh`, `.bash`, `.zsh`, `.ps1`
- **Other**: `.go`, `.rs`, `.php`, `.rb`, `.swift`, `.kt`, `.dart`, `.vue`, `.svelte`

## Usage Examples

### Adding Files to Context
```bash
# Add single file
/add src/main.ts

# Add all TypeScript files in src directory
/add src/**/*.ts

# Add multiple specific files
/add package.json tsconfig.json README.md

# Add all JSON files in current directory
/add *.json
```

### Managing Context
```bash
# View current context
/context

# Remove specific file
/remove src/utils.ts

# Remove multiple files
/remove src/file1.ts src/file2.ts

# Clear all context
/remove all
```

### File Writing (Future Enhancement)
The infrastructure supports file writing through the FileWriter class, though this isn't exposed in chat commands yet:

```typescript
import { fileService } from './integrations/filesystem/service';

// Write single file
const result = await fileService.writeFile(
  'src/new-feature.ts',
  'export const newFeature = () => { /* implementation */ };'
);

// Write multiple files
const operations = [
  { filePath: 'src/component.tsx', content: '...' },
  { filePath: 'src/component.test.tsx', content: '...' }
];
const results = await fileService.writeMultipleFiles(operations);
```

## Error Handling

### File Reading Errors
- **File not found**: Clear error message with file path
- **Permission denied**: Graceful handling with user-friendly message
- **File too large**: Size limit enforcement with helpful guidance
- **Unsupported type**: Clear indication of supported file types

### File Writing Errors
- **Permission errors**: Graceful error handling and user notification
- **Disk space**: Proper error propagation for disk space issues
- **User cancellation**: Clean cancellation without side effects

### Batch Operation Resilience
- Continues processing other files when individual files fail
- Provides detailed error reporting for each failed operation
- Returns partial results when some operations succeed

## Testing Strategy

### Unit Tests
- **FileReader tests**: File validation, language detection, error handling
- **FileWriter tests**: Backup creation, user confirmation flows, error handling
- **FileService tests**: Glob expansion, filtering, integration logic
- **CommandParser tests**: Command parsing, argument handling, integration

### Integration Tests
- **Real filesystem operations**: Tests with actual files and directories
- **Chat command integration**: End-to-end command execution
- **Error scenario testing**: Permission errors, invalid paths, etc.

### E2E Tests
- **Complete user workflows**: Full interaction scenarios
- **CLI execution**: Tests using actual CLI executable
- **Cross-platform compatibility**: Tests on different operating systems

## Configuration

### File Size Limits
```typescript
// In FileReader
private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB
```

### Excluded Patterns
```typescript
// In FileService
private readonly EXCLUDED_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/.DS_Store',
  '**/*.log',
  '**/.env*',
  '**/.cli-coder-backups/**'
];
```

### Backup Directory
```typescript
// In FileWriter
private readonly BACKUP_DIR = '.cli-coder-backups';
```

## Performance Considerations

- **File size limits**: Prevents memory exhaustion from large files
- **Batch processing**: Efficient handling of multiple files
- **Lazy loading**: Files are only read when explicitly added to context
- **Memory management**: Files are stored in session context, not permanently cached

## Future Enhancements

### Planned Features
1. **File watching**: Automatic context updates when files change
2. **Syntax highlighting**: Enhanced file previews with syntax highlighting
3. **Better diff visualization**: Improved diff display for file changes
4. **File compression**: Support for compressed file archives
5. **Remote file support**: Reading files from remote repositories
6. **File search**: Full-text search within context files

### Integration Opportunities
- **Git integration**: Automatic file detection from git status
- **IDE integration**: Synchronization with open editor files
- **Project detection**: Automatic file discovery based on project type

## Security Considerations

### Current Protections
- Path traversal prevention
- File type restrictions  
- Size limit enforcement
- User confirmation requirements
- Backup creation before modifications

### Additional Recommendations
- Consider implementing file permissions checking
- Add audit logging for file operations
- Implement rate limiting for file operations
- Consider sandboxing for file operations

## Dependencies

### Required Packages
- `glob` - For pattern matching and file discovery
- `inquirer` - For user confirmation prompts
- `chalk` - For colored console output
- Node.js built-in `fs` module for file operations

### Development Dependencies
- `vitest` - For unit and integration testing
- `@types/node` - TypeScript definitions for Node.js APIs

This implementation provides a solid foundation for secure file operations within the CLI coder, with comprehensive testing and security measures to ensure safe and reliable file handling.