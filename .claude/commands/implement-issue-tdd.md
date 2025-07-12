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

2. **Integration Tests** (`tests/integration/`):

- Test component interactions
- Use real dependencies where possible
- Test CLI command parsing and execution
- Verify configuration loading

3. **End-to-End Tests** (`tests/e2e/`):

- Test complete user workflows
- Use built CLI executable with TestRig
- Test in isolated environments
- Verify actual file operations

4. **Real CLI Tests** (`tests/real/`):

- Test against installed CLI
- Test real integrations (with test credentials)
- Performance and reliability testing
- Actual shell command execution

**Implementation Workflow:**

1. **Test-First Development**:

- Write unit tests FIRST for all business logic
- Create integration test scenarios
- Define E2E test workflows
- Implement features to make tests pass

2. **Type Safety & Validation**:

- Use Zod schemas for all data validation
- Explicit TypeScript types for all interfaces
- Error handling with proper error types
- Input validation at boundaries

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

- [ ] All test specifications defined and documented
- [ ]Unit tests written and passing
- [ ]Integration tests implemented
- [ ]E2E test scenarios created
- [ ]Real CLI tests added
- [ ]All tests pass: npm run test:all
- [ ]Coverage targets met (>90%)
- [ ]TypeScript compilation: npm run type-check
- [ ]Linting passes: npm run lint
- [ ]Documentation updated
- [ ]Feature branch created and commits follow conventional format
- [ ]PR created with comprehensive test results
- [ ]Issue auto-closed when PR merged

Test Documentation Update:
Update docs/development/testing-guide.md with:

Testing approach for the feature if any added.
Any special testing considerations.

Generate complete implementation with all test files, no placeholders, production-ready code following the established multi-layer testing architecture unless the issue is setup issue.
