# Production-Grade TUI CLI Development Prompt Template

## Context

You are tasked with implementing a TypeScript TUI CLI application using Ink v3+ based on detailed GitHub issues. This application must be production-ready with comprehensive testing, proper error handling, and clean architecture that prevents integration hell.

## Critical Requirements

### 1. Development Philosophy

- **Test-First Development**: Write tests BEFORE implementation for each component
- **Integration-First Design**: Plan component interfaces before coding
- **Fail-Fast Principle**: Validate all assumptions early with type guards and runtime checks
- **Zero Manual Testing**: Everything must be automated and verifiable

### 2. Project Structure (Mandatory)

```
project/
├── src/
│   ├── core/              # Pure business logic (NO UI, NO I/O)
│   │   ├── domain/        # Domain models & interfaces
│   │   ├── services/      # Business logic services
│   │   └── validators/    # Input validation logic
│   ├── infrastructure/    # External integrations
│   │   ├── adapters/      # API/DB adapters with interfaces
│   │   └── config/        # Configuration management
│   ├── cli/              # CLI layer
│   │   ├── commands/      # Command handlers (thin layer)
│   │   ├── middleware/    # CLI middleware (auth, logging)
│   │   └── parser/        # Argument parsing logic
│   ├── ui/               # Ink components
│   │   ├── components/    # Reusable UI components
│   │   ├── screens/      # Full screen compositions
│   │   ├── hooks/        # Custom Ink hooks
│   │   └── theme/        # UI theme configuration
│   ├── shared/           # Cross-cutting concerns
│   │   ├── types/        # Shared TypeScript types
│   │   ├── errors/       # Custom error classes
│   │   └── utils/        # Pure utility functions
│   └── index.ts          # Entry point (minimal logic)
├── tests/
│   ├── unit/             # Mirrors src/ structure
│   ├── integration/      # Cross-component tests
│   ├── e2e/             # End-to-end CLI tests
│   └── fixtures/         # Test data & mocks
├── scripts/
│   ├── validate-integration.ts  # Pre-commit integration check
│   └── coverage-report.ts       # Coverage validation
└── docs/
    ├── architecture.md   # System design decisions
    └── testing-strategy.md # Test approach documentation
```

### 3. Implementation Rules

#### A. Type Safety Enforcement

```typescript
// REQUIRED: Every public function must have explicit types
// BAD
function processUser(data) { ... }

// GOOD
interface UserInput {
  name: string;
  email: string;
}

interface ProcessedUser {
  id: string;
  normalizedName: string;
  validatedEmail: string;
}

function processUser(data: UserInput): Result<ProcessedUser, ValidationError> {
  // Implementation with error handling
}
```

#### B. Dependency Injection Pattern

```typescript
// REQUIRED: All dependencies must be injected
interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
}

class CreateUserCommand {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly validator: UserValidator,
    private readonly logger: Logger
  ) {}

  async execute(input: CreateUserInput): Promise<Result<User, CommandError>> {
    // Implementation
  }
}
```

#### C. Test Coverage Requirements

- **Minimum 90% line coverage** for all files
- **100% branch coverage** for core business logic
- **Integration tests** for every command
- **E2E tests** for critical user journeys

### 4. Testing Strategy

#### A. Unit Test Template

```typescript
// tests/unit/core/services/user-service.test.ts
describe("UserService", () => {
  let service: UserService;
  let mockRepo: MockProxy<UserRepository>;
  let mockValidator: MockProxy<UserValidator>;

  beforeEach(() => {
    mockRepo = mock<UserRepository>();
    mockValidator = mock<UserValidator>();
    service = new UserService(mockRepo, mockValidator);
  });

  describe("createUser", () => {
    it("should create valid user", async () => {
      // Arrange
      const input = { name: "Test", email: "test@example.com" };
      mockValidator.validate.mockResolvedValue({ isValid: true });
      mockRepo.save.mockResolvedValue();

      // Act
      const result = await service.createUser(input);

      // Assert
      expect(result.isSuccess()).toBe(true);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Test" })
      );
    });

    it("should handle validation errors", async () => {
      // Test error paths
    });
  });
});
```

#### B. Integration Test Template

```typescript
// tests/integration/commands/create-user.test.ts
describe("CreateUser Command Integration", () => {
  let testDb: TestDatabase;
  let app: TestCLIApp;

  beforeEach(async () => {
    testDb = await TestDatabase.create();
    app = new TestCLIApp({ db: testDb });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("should create user through CLI", async () => {
    const result = await app.run([
      "create-user",
      "--name",
      "Test",
      "--email",
      "test@example.com",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("User created successfully");

    const user = await testDb.users.findByEmail("test@example.com");
    expect(user).toBeDefined();
  });
});
```

#### C. Ink Component Test Template

```typescript
// tests/unit/ui/components/user-form.test.tsx
import { render } from "ink-testing-library";
import { UserForm } from "@/ui/components/user-form";

describe("UserForm Component", () => {
  it("should render and handle input via direct logic testing", async () => {
    const onSubmit = jest.fn();
    const { lastFrame } = render(<UserForm onSubmit={onSubmit} />);

    // Test UI structure
    expect(lastFrame()).toContain("Enter username:");
    
    // Test logic directly rather than keyboard simulation
    // For components with useInput hooks, test the handler functions directly
    // or manipulate component state/props to trigger the desired behavior
    const mockFormData = { username: "testuser", email: "test@example.com" };
    
    // Trigger submit through component logic
    expect(onSubmit).toHaveBeenCalledWith(mockFormData);
  });

  it("should handle keyboard events via component logic", () => {
    // AVOID: stdin.write() for keyboard simulation (unreliable)
    // INSTEAD: Test the actual useInput hook handlers or component state changes
    const { lastFrame } = render(<UserForm onSubmit={jest.fn()} />);
    
    // Test that UI shows correct state/content
    expect(lastFrame()).toContain("Expected UI content");
    
    // Test component behavior by examining rendered output or state
    // rather than simulating keyboard input
  });
});
```

### 5. Test Reliability & Environment Patterns

#### A. Test Environment Awareness

```typescript
// utils/errors.ts - Handle process.exit in test environments
export function handleError(error: Error): void {
  if (error instanceof CLIErrorClass) {
    console.error(chalk.red(`Error [${error.code}]:`), error.message);
    if (error.details) {
      console.error(chalk.gray('Details:'), error.details);
    }
  } else {
    console.error(chalk.red('Unexpected error:'), error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  }
  
  // CRITICAL: Don't exit in test environments
  if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
    process.exit(1);
  }
}
```

#### B. File System Test Patterns

```typescript
// Handle file ordering and async operations reliably
describe("File Operations", () => {
  it("should handle files in deterministic order", async () => {
    // Files from glob patterns return in alphabetical order, not creation order
    const files = await fileService.addFiles('src/**/*.ts');
    
    // WRONG: Assumes creation order
    // expect(files[0].content).toBe('expected content');
    
    // CORRECT: Find by specific criteria
    const mainFile = files.find(f => f.path === 'src/main.ts');
    expect(mainFile?.content).toBe('expected content');
    
    // Or test that all expected files are present
    expect(files.map(f => f.path)).toEqual(
      expect.arrayContaining(['src/main.ts', 'src/utils.ts'])
    );
  });
});
```

#### C. Ink Testing Anti-Patterns & Solutions

```typescript
// AVOID: Keyboard simulation (unreliable)
describe("TUI Component - WRONG", () => {
  it("should switch panels with Tab", () => {
    const { stdin, lastFrame } = render(<App />);
    stdin.write('\t'); // Unreliable in test environment
    expect(lastFrame()).toContain('Active: chat');
  });
});

// CORRECT: Test structure and logic directly
describe("TUI Component - CORRECT", () => {
  it("should support panel switching functionality", () => {
    const { lastFrame } = render(<App />);
    
    // Test UI structure supports switching
    expect(lastFrame()).toContain('💬 Chat');
    expect(lastFrame()).toContain('📁 Files');
    expect(lastFrame()).toContain('⌨️ Input');
    expect(lastFrame()).toContain('Active: input'); // Default state
  });
  
  it("should handle state changes via session manipulation", async () => {
    const { lastFrame } = render(<App session={mockSession} />);
    
    // Simulate changes through data, not keyboard
    mockSession.messages.push(newMessage);
    mockSession.context = mockSession.context.slice(0, 1);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Assert UI reflects changes
    expect(mockSession.messages).toHaveLength(3);
    expect(mockSession.context).toHaveLength(1);
  });
});
```

#### D. Integration Test Patterns

```typescript
// Integration tests should test data flow, not UI interaction
describe("CLI Command Integration", () => {
  it("should handle interactive commands correctly", async () => {
    // For interactive commands that don't exit quickly
    try {
      await cli.run(['chat'], { timeout: 1000 });
    } catch (error) {
      // Expect timeout since chat starts interactive session
      expect((error as Error).message).toContain('timed out');
    }
  });
  
  it("should validate configuration schema integration", async () => {
    // Ensure tests match actual schema requirements
    const config = {
      llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
      shell: { defaultTimeout: 30000 },
      editor: { defaultEditor: 'code', tempDir: '/tmp' },
      session: { saveHistory: true, maxHistorySize: 100 }
    };
    
    // Test with complete, valid configuration
    const result = await configManager.loadConfig();
    expect(result).toMatchObject(expect.objectContaining(config));
  });
});
```

#### E. Test Stability Guidelines

1. **Never use `stdin.write()` for keyboard simulation in tests**
2. **Always test logic and UI structure, not interaction simulation**
3. **Handle `process.exit()` calls in test environments**
4. **Use deterministic assertions (find by criteria, not array index)**
5. **Mock external dependencies completely in unit tests**
6. **Use direct state manipulation in integration tests**
7. **Add timeout expectations for interactive commands**
8. **Ensure all test data matches actual schema requirements**

### 6. Anti-Integration Hell Patterns

#### A. Contract Testing

```typescript
// Every module boundary must have a contract test
// tests/contracts/user-repository.contract.ts
export function createUserRepositoryContract(
  createRepo: () => UserRepository
): void {
  describe("UserRepository Contract", () => {
    let repo: UserRepository;

    beforeEach(() => {
      repo = createRepo();
    });

    it("should save and retrieve user", async () => {
      const user = { id: "123", name: "Test", email: "test@example.com" };
      await repo.save(user);
      const retrieved = await repo.findById("123");
      expect(retrieved).toEqual(user);
    });

    // More contract tests...
  });
}
```

#### B. Integration Validation Script

```typescript
// scripts/validate-integration.ts
async function validateIntegration() {
  const issues: string[] = [];

  // Check for circular dependencies
  const circularDeps = await findCircularDependencies("./src");
  if (circularDeps.length > 0) {
    issues.push(`Circular dependencies found: ${circularDeps.join(", ")}`);
  }

  // Validate all interfaces have implementations
  const unimplementedInterfaces = await findUnimplementedInterfaces();
  if (unimplementedInterfaces.length > 0) {
    issues.push(
      `Unimplemented interfaces: ${unimplementedInterfaces.join(", ")}`
    );
  }

  // Check test coverage
  const coverage = await getCoverage();
  if (coverage.line < 90) {
    issues.push(`Line coverage ${coverage.line}% is below 90%`);
  }

  if (issues.length > 0) {
    console.error("Integration issues found:", issues);
    process.exit(1);
  }
}
```

### 6. Implementation Workflow

1. **For each GitHub issue:**

   - Write interface definitions first
   - Create contract tests for the interfaces
   - Write unit tests for the implementation
   - Implement the feature
   - Write integration tests
   - Update E2E tests if needed

2. **Before moving to next issue:**
   - Run all tests (must pass)
   - Run integration validation script
   - Ensure no new circular dependencies
   - Document any architectural decisions

### 7. Error Handling Strategy

```typescript
// Use Result pattern for all operations that can fail
type Result<T, E> = Success<T> | Failure<E>;

class Success<T> {
  constructor(public readonly value: T) {}
  isSuccess(): boolean {
    return true;
  }
  isFailure(): boolean {
    return false;
  }
}

class Failure<E> {
  constructor(public readonly error: E) {}
  isSuccess(): boolean {
    return false;
  }
  isFailure(): boolean {
    return true;
  }
}

// Example usage
async function createUser(
  input: UserInput
): Promise<Result<User, CreateUserError>> {
  const validation = await validateUser(input);
  if (validation.isFailure()) {
    return new Failure(validation.error);
  }

  try {
    const user = await userRepo.save(validation.value);
    return new Success(user);
  } catch (error) {
    return new Failure(new CreateUserError("Database error", error));
  }
}
```

### 8. Ink-Specific Guidelines

#### A. Component Isolation

```typescript
// UI components should NEVER contain business logic
// BAD
const UserList = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Direct API call - NO!
    fetch("/api/users")
      .then((res) => res.json())
      .then(setUsers);
  }, []);

  return <Box>{/* render */}</Box>;
};

// GOOD
interface UserListProps {
  users: User[];
  onRefresh: () => void;
  loading: boolean;
}

const UserList: React.FC<UserListProps> = ({ users, onRefresh, loading }) => {
  return (
    <Box flexDirection="column">
      {loading ? (
        <Spinner />
      ) : (
        users.map((u) => <Text key={u.id}>{u.name}</Text>)
      )}
      <Text color="gray">Press 'r' to refresh</Text>
    </Box>
  );
};
```

#### B. State Management

```typescript
// Use a central state manager for complex UIs
interface AppState {
  currentScreen: "menu" | "userList" | "userDetail";
  users: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
}

const AppStateContext = React.createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>(null!);

// Actions are type-safe
type AppAction =
  | { type: "NAVIGATE"; screen: AppState["currentScreen"] }
  | { type: "SET_USERS"; users: User[] }
  | { type: "SET_ERROR"; error: string };
```

### 9. Performance Requirements

- CLI startup time < 100ms
- Command execution < 500ms for simple operations
- Memory usage < 50MB for typical operations
- All async operations must have timeouts

### 10. Documentation Requirements

Each module must include:

````typescript
/**
 * @module UserService
 * @description Handles user-related business logic
 *
 * @example
 * ```typescript
 * const service = new UserService(repo, validator);
 * const result = await service.createUser({ name: 'John', email: 'john@example.com' });
 * ```
 *
 * @testing
 * - Unit tests: /tests/unit/core/services/user-service.test.ts
 * - Integration: /tests/integration/user-service.integration.test.ts
 */
````

## GitHub Issues Implementation Checklist

For each issue, ensure:

- [ ] Interface definitions created
- [ ] Contract tests written
- [ ] Unit tests written (TDD)
- [ ] Implementation complete
- [ ] Integration tests written
- [ ] E2E tests updated
- [ ] Documentation updated
- [ ] No circular dependencies introduced
- [ ] Coverage targets met
- [ ] Performance benchmarks pass

### Test Reliability Checklist

- [ ] No `stdin.write()` keyboard simulation in tests
- [ ] All `process.exit()` calls handle test environments
- [ ] File operations use deterministic assertions
- [ ] Interactive commands have proper timeout handling
- [ ] Configuration tests match actual schema requirements
- [ ] Integration tests use state manipulation, not UI simulation
- [ ] All async operations have proper timing/waiting
- [ ] Error handling tested without process termination

## Example Usage

"Using the above template, implement the following GitHub issues for a task management TUI:

1. Issue #1: Create task with title, description, and priority
2. Issue #2: List tasks with filtering by status and priority
3. Issue #3: Update task status with keyboard shortcuts
4. Issue #4: Delete tasks with confirmation dialog
5. Issue #5: Task search with fuzzy matching
   [... continue with all issues ...]

Ensure each issue follows the complete workflow: interfaces → contract tests → unit tests → implementation → integration tests → E2E tests. Generate all files with proper imports and no placeholders."

## Success Metrics

Your implementation is successful when:

1. **All tests pass on first run** (including test reliability patterns)
2. **Zero manual testing required**
3. **Integration validation script passes**
4. **Coverage exceeds 90%**
5. **No circular dependencies**
6. **All errors are handled gracefully** (including test environment awareness)
7. **Performance targets are met**
8. **Test suite is stable and reliable** (no flaky tests due to timing or keyboard simulation)
9. **All interactive components properly handle test vs production environments**
