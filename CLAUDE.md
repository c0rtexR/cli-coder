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
  it("should render and handle input", async () => {
    const onSubmit = jest.fn();
    const { stdin, lastFrame } = render(<UserForm onSubmit={onSubmit} />);

    expect(lastFrame()).toContain("Enter username:");

    // Simulate user input
    stdin.write("testuser");
    stdin.write("\r"); // Enter key

    expect(lastFrame()).toContain("Enter email:");
    stdin.write("test@example.com");
    stdin.write("\r");

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        username: "testuser",
        email: "test@example.com",
      });
    });
  });
});
```

### 5. Anti-Integration Hell Patterns

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

1. All tests pass on first run
2. Zero manual testing required
3. Integration validation script passes
4. Coverage exceeds 90%
5. No circular dependencies
6. All errors are handled gracefully
7. Performance targets are met
