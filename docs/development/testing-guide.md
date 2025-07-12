# Testing Guide

## Testing Philosophy

This project follows a multi-layer testing strategy to prevent integration hell and ensure robust, maintainable code:

### 1. Unit Tests (`npm run test:unit`)
- Test individual functions and classes in isolation
- Mock external dependencies
- Fast execution (< 1 second per test)
- High code coverage target (>90%)
- Located in: `tests/unit/`

### 2. Integration Tests (`npm run test:integration`)
- Test component interactions
- Use real dependencies where possible
- Test configuration loading and validation
- Test CLI command parsing and execution
- Located in: `tests/integration/`

### 3. End-to-End Tests (`npm run test:e2e`)  
- Test complete user workflows
- Use built CLI executable
- Test in isolated environments
- Verify actual file operations
- Located in: `tests/e2e/`

### 4. Real CLI Tests (`npm run test:real`)
- Test against installed CLI
- Test real LLM integrations (with test keys)
- Test actual shell command execution
- Performance and reliability testing
- Located in: `tests/real/`

## Test Requirements for Issues

Every issue must include:

1. **Unit tests** for all new functions/classes
2. **Integration tests** for component interactions  
3. **E2E test scenarios** for user-facing features
4. **Real CLI tests** for command-line interfaces
5. **Test documentation** explaining test approach

## Running Tests

```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:real

# Run with coverage
npm run test:unit -- --coverage

# Run in watch mode
npm run test:unit -- --watch

# Run UI mode
npm run test:ui
```

## Test Structure

```
tests/
├── unit/                 # Unit tests (Vitest)
│   ├── config/          # Configuration tests
│   ├── utils/           # Utility function tests
│   ├── types/           # Type validation tests
│   └── commands/        # Command handler tests
├── integration/         # Integration tests (Vitest)
│   ├── cli/            # CLI integration tests
│   ├── llm/            # LLM provider integration tests
│   ├── filesystem/     # File system integration tests
│   └── session/        # Session management tests
├── e2e/                # End-to-end tests (Custom runner)
│   ├── scenarios/      # Test scenarios
│   ├── fixtures/       # Test fixtures
│   └── helpers/        # Test helpers
├── real/               # Real CLI tests (Custom runner)
│   ├── commands/       # Real command tests
│   ├── workflows/      # Real workflow tests
│   └── helpers/        # Real test helpers
└── fixtures/           # Shared test data
    ├── files/          # Sample files
    ├── configs/        # Sample configurations
    └── responses/      # Sample API responses
```

## Coverage Requirements

- **Minimum 90% line coverage** for all source files
- **100% branch coverage** for critical business logic
- Coverage reports generated with V8 provider
- HTML reports available in `coverage/` directory

## Test-Driven Development Process

1. **Write tests first** before implementation
2. **Run tests** to see them fail (red)
3. **Implement minimal code** to make tests pass (green)
4. **Refactor** while keeping tests green
5. **Add more tests** for edge cases and scenarios

## Testing Tools

- **Vitest**: Primary test runner for unit and integration tests
- **V8**: Coverage provider
- **Custom TestRig**: E2E and real CLI test infrastructure
- **memfs**: In-memory file system for testing
- **Mocking**: Built-in Vitest mocking capabilities

## Best Practices

### Unit Tests
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyModule', () => {
  it('should handle valid input', () => {
    // Arrange
    const input = 'valid input';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Integration Tests
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('CLI Integration', () => {
  beforeEach(() => {
    // Setup test environment
  });
  
  afterEach(() => {
    // Cleanup
  });
  
  it('should integrate components correctly', () => {
    // Test component interaction
  });
});
```

### E2E Tests
```javascript
import { TestRig } from '../run-tests.js';

export async function testScenario() {
  const testRig = new TestRig();
  
  try {
    const testDir = testRig.setup('scenario-name');
    const output = testRig.run('command args');
    
    // Assertions
    
  } finally {
    testRig.cleanup();
  }
}
```

## Continuous Integration

Tests are organized to support efficient CI/CD:

- `npm run test:ci` runs unit and integration tests
- E2E and real CLI tests can be run separately
- Coverage reports are generated for CI systems
- Test results are formatted for CI visibility

## Troubleshooting

### Common Issues

1. **Tests failing after dependency updates**
   - Run `npm install` to ensure dependencies are up to date
   - Check for breaking changes in dependency changelogs

2. **Coverage thresholds not met**
   - Add more unit tests for uncovered code paths
   - Use `npm run test:unit -- --coverage` to see coverage report

3. **E2E tests timing out**
   - Increase timeout values in test configuration
   - Check for resource conflicts in test environment

4. **Real CLI tests skipped**
   - Install CLI globally: `npm install -g .`
   - Ensure CLI is available in PATH

### Debug Mode

Run tests with debug information:

```bash
# Verbose output
npm run test:unit -- --reporter=verbose

# Debug specific test
npm run test:unit -- --reporter=verbose tests/unit/specific-test.test.ts
```

## Adding New Tests

When adding new features:

1. **Create test file** in appropriate directory
2. **Follow naming convention**: `feature.test.ts` or `feature.test.js`
3. **Add comprehensive test cases** covering all code paths
4. **Update this guide** if introducing new testing patterns
5. **Ensure all tests pass** before submitting PR

Remember: **Good tests are the foundation of maintainable code!**