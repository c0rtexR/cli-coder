/**
 * Represents a Git repository
 */
export interface GitRepository {
  /** Path to the repository root */
  path: string;
  /** Whether the directory is a Git repository */
  isInitialized: boolean;
  /** Currently checked out branch */
  currentBranch: string;
  /** Whether there are uncommitted changes */
  hasChanges: boolean;
}

/**
 * Represents a Git commit
 */
export interface GitCommit {
  /** Commit hash */
  hash: string;
  /** Commit message */
  message: string;
  /** Author of the commit */
  author: string;
  /** Date of the commit */
  date: Date;
}

/**
 * Represents a Git diff for a file
 */
export interface GitDiff {
  /** Path to the file */
  filePath: string;
  /** Number of lines added */
  additions: number;
  /** Number of lines deleted */
  deletions: number;
  /** Diff content */
  content: string;
}

/**
 * Represents a Git operation to be performed
 */
export interface GitOperation {
  /** Type of Git operation */
  type: 'commit' | 'add' | 'status' | 'diff';
  /** Files to operate on (if applicable) */
  files?: string[];
  /** Commit message (for commit operations) */
  message?: string;
}