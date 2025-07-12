# CLI Coder

AI-powered CLI coding assistant that helps developers with code generation, analysis, and development tasks.

## Features

- 🤖 AI-powered code assistance
- 💬 Interactive chat interface
- 📁 File operations and Git integration
- 🎨 Modern TUI (Terminal User Interface)
- 🔧 Configurable LLM providers (OpenAI, Anthropic)

## Installation

```bash
# Install globally
npm install -g cli-coder

# Or run with npx
npx cli-coder
```

## Quick Start

```bash
# Initialize configuration
cli-coder init

# Start interactive chat
cli-coder chat

# Get help
cli-coder --help
```

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Clone repository
git clone <repository-url>
cd cli-coder

# Install dependencies
npm install

# Build project
npm run build

# Run in development mode
npm run dev
```

### Testing

This project follows a comprehensive testing strategy:

```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:real        # Real CLI tests

# Run with coverage
npm run test:unit -- --coverage

# Run in watch mode
npm run test:unit -- --watch
```

### Test Requirements

- **90%+ code coverage** for all source files
- **Unit tests** for all business logic
- **Integration tests** for component interactions
- **E2E tests** for user workflows
- **Real CLI tests** for actual command execution

See [Testing Guide](docs/development/testing-guide.md) for detailed testing documentation.

### Available Scripts

```bash
npm run dev          # Development server
npm run build        # Build for production
npm run test         # Run tests in watch mode
npm run test:all     # Run all test suites
npm run type-check   # TypeScript type checking
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
npm run docs         # Generate API documentation
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure your API keys:

```env
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Architecture

This project follows a modular monolith architecture:

```
src/
├── types/              # Type definitions
├── commands/           # CLI command handlers
├── core/              # Business logic modules
│   ├── agent/         # AI agent functionality
│   ├── chat/          # Chat interface logic
│   ├── session/       # Session management
│   └── tui/           # Terminal UI components
├── integrations/      # External service integrations
│   ├── llm/          # LLM provider integrations
│   ├── git/          # Git operations
│   ├── filesystem/   # File system operations
│   └── clipboard/    # Clipboard operations
├── utils/            # Utility functions
└── config/           # Configuration management
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Write tests for your changes
4. Ensure all tests pass: `npm run test:all`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- **Test-Driven Development**: Write tests before implementation
- **Type Safety**: Use TypeScript with strict mode
- **Code Coverage**: Maintain 90%+ test coverage
- **Documentation**: Update docs for new features
- **Conventional Commits**: Use conventional commit messages

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] Basic CLI interface implementation
- [ ] LLM provider integrations
- [ ] File operations and Git integration
- [ ] Advanced TUI implementation
- [ ] Plugin system
- [ ] Cloud synchronization

## Support

- 📝 [Documentation](docs/)
- 🐛 [Issues](https://github.com/c0rtexR/cli-coder/issues)
- 💬 [Discussions](https://github.com/c0rtexR/cli-coder/discussions)

---

**Note**: This project is currently in development. Features and APIs may change.