Implement GitHub issue #$ISSUE_NUMBER from c0rtexR/cli-coder following production-grade TUI CLI development practices.

**Process:**

1. **Fetch & Analyze Issue**: Get issue details, requirements, and acceptance criteria
2. **Create Feature Branch**: `feature/issue-$ISSUE_NUMBER`
3. **Define Test Specifications FIRST** (before any implementation):
   - Unit test specs for all new functions/classes
   - Integration test specs for component interactions
   - E2E test scenarios for user-facing features
   - Real CLI test specs for command-line interfaces

**Architecture Requirements:**

- Follow LLM-Friendly Modular Monolith structure:
  src/
  ├── types/ # Type definitions
  ├── commands/ # CLI command handlers
  ├── core/ # Business logic modules
  │ ├── agent/ # AI agent functionality
  │ ├── chat/ # Chat interface logic
  │ ├── session/ # Session management
  │ └── tui/ # Terminal UI components
  ├── integrations/ # External service integrations
  │ ├── llm/ # LLM provider integrations
  │ ├── git/ # Git operations
  │ ├── filesystem/ # File system operations
  │ └── clipboard/ # Clipboard operations
  ├── utils/ # Utility functions
  └── config/ # Configuration management

**Multi-Layer Testing Strategy:**

1. **Unit Tests** (`tests/unit/`):

- Test individual functions/classes in isolation
- Mock external dependencies
- Target >90% code coverage
- Fast execution (<1 second per test)
- **CRITICAL**: No keyboard simulation via `stdin.write()`
- Test UI structure and component logic directly
- Handle `process.exit()` calls in test environments

2. **Integration Tests** (`tests/integration/`):

- Test component interactions
- Use real dependencies where possible
- Test CLI command parsing and execution
- Verify configuration loading
- **CRITICAL**: Use state manipulation instead of UI interaction simulation
- Handle interactive commands with proper timeout expectations
- Ensure all test data matches actual schema requirements

3. **End-to-End Tests** (`tests/e2e/`):

- Test complete user workflows
- Use built CLI executable with TestRig
- Test in isolated environments
- Verify actual file operations
- Handle interactive vs non-interactive command differences

4. **Real CLI Tests** (`tests/real/`):

- Test against installed CLI
- Test real integrations (with test credentials)
- Performance and reliability testing
- Actual shell command execution

### Test Reliability Requirements:

**ALWAYS implement these patterns:**

- **Error Handling**: All functions that call `process.exit()` must check test environment
- **File Operations**: Use deterministic assertions (find by criteria, not array index)
- **UI Testing**: Test component structure and state, never keyboard simulation
- **Async Operations**: Proper timing with explicit waits, not arbitrary delays
- **Configuration**: Complete config objects matching actual schema requirements
- **Interactive Commands**: Expect timeouts for commands that start interactive sessions

**Implementation Workflow:**

1. **Test-First Development**:

- Write unit tests FIRST for all business logic
- Create integration test scenarios
- Define E2E test workflows
- Implement features to make tests pass
- **Apply test reliability patterns from the start**

2. **Type Safety & Validation**:

- Use Zod schemas for all data validation
- Explicit TypeScript types for all interfaces
- Error handling with proper error types
- Input validation at boundaries

3. **Test Reliability Implementation Examples**:

```typescript
// ERROR HANDLING: Always check test environment
export function handleError(error: Error): void {
  console.error(error.message);

  // REQUIRED: Don't exit in test environments
  if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
    process.exit(1);
  }
}

// UI TESTING: Test structure, not keyboard simulation
describe("TUI Component", () => {
  it("should render correctly", () => {
    const { lastFrame } = render(<Component />);

    // CORRECT: Test UI structure
    expect(lastFrame()).toContain("Expected content");

    // WRONG: Never use stdin.write() for keyboard simulation
    // stdin.write('\t'); // This causes flaky tests
  });
});

// FILE OPERATIONS: Use deterministic assertions
describe("File Service", () => {
  it("should process files reliably", async () => {
    const files = await fileService.addFiles("**/*.ts");

    // WRONG: Assumes creation order
    // expect(files[0].path).toBe('main.ts');

    // CORRECT: Find by specific criteria
    const mainFile = files.find((f) => f.path.endsWith("main.ts"));
    expect(mainFile).toBeDefined();
    expect(mainFile?.content).toContain("expected content");
  });
});

// INTEGRATION: Handle interactive commands properly
describe("CLI Integration", () => {
  it("should handle interactive commands", async () => {
    // Interactive commands timeout (expected behavior)
    try {
      await cli.run(["chat"], { timeout: 1000 });
    } catch (error) {
      expect((error as Error).message).toContain("timed out");
    }
  });
});
```

3. **Testing Commands Integration**:

npm run test:unit # Unit tests with Vitest
npm run test:integration # Integration tests
npm run test:e2e # E2E tests with TestRig
npm run test:real # Real CLI tests
npm run test:all # All test suites
npm run test:unit -- --coverage # Coverage reporting
Quality Requirements:

All tests must pass: npm run test:all
Type checking: npm run type-check
Linting: npm run lint
Coverage >90% for new code
No circular dependencies
Performance: CLI startup <100ms, operations <500ms

File Generation Requirements:
Generate all files following the established structure:

Source files in appropriate src/ subdirectories
Corresponding unit tests in tests/unit/ (mirror src structure)
Integration tests in tests/integration/
E2E scenarios in tests/e2e/scenarios/
Real CLI tests in tests/real/
Update relevant documentation

Completion Checklist:

- [ ] Read docs/development/testing-guide.md to understand the testing guidelines.
- [ ] All test specifications defined and documented
- [ ] Unit tests written and passing
- [ ] Integration tests implemented
- [ ] E2E test scenarios created
- [ ] Real CLI tests added
- [ ] All tests pass: npm run test:all
- [ ] Coverage targets met (>90%)
- [ ] TypeScript compilation: npm run type-check
- [ ] Linting passes: npm run lint
- [ ] Documentation updated
- [ ] Feature branch created and commits follow conventional format
- [ ] PR created with comprehensive test results
- [ ] Issue auto-closed when PR merged

**Test Reliability Checklist:**

- [ ] No `stdin.write()` keyboard simulation used anywhere
- [ ] All `process.exit()` calls check test environment (`NODE_ENV !== 'test' && VITEST !== 'true'`)
- [ ] Interactive commands have timeout handling in tests
- [ ] UI tests focus on structure/content, not interaction simulation
- [ ] All async operations have proper timing/waiting patterns
- [ ] Integration tests use state manipulation instead of UI simulation

Test Documentation Update:
Update docs/development/testing-guide.md with:

Testing approach for the feature if any added.
Any special testing considerations.

Generate complete implementation with all test files, no placeholders, production-ready code following the established multi-layer testing architecture unless the issue is setup issue.
