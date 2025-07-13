/**
 * @fileoverview Unit tests for ChatFormatter - markdown formatting and output styling
 */

import { describe, it, expect } from 'vitest';
import { ChatFormatter } from '../../../../src/core/chat/formatter';

describe('ChatFormatter', () => {
  let formatter: ChatFormatter;

  beforeEach(() => {
    formatter = new ChatFormatter();
  });

  describe('formatAIResponse', () => {
    it('should format plain text correctly', () => {
      const input = 'This is a simple message';
      const result = formatter.formatAIResponse(input);
      
      expect(result).toContain(input);
      expect(result.startsWith('\n')).toBe(true);
      expect(result.endsWith('\n')).toBe(true);
    });

    it('should format bold text with **', () => {
      const input = 'This has **bold text** in it';
      const result = formatter.formatAIResponse(input);
      
      // Should contain the formatted version (exact formatting depends on chalk)
      expect(result).toContain('bold text');
    });

    it('should format inline code with backticks', () => {
      const input = 'Use `console.log()` to debug';
      const result = formatter.formatAIResponse(input);
      
      expect(result).toContain('console.log()');
    });

    it('should format code blocks correctly', () => {
      const input = `Here is code:
\`\`\`javascript
function test() {
  return true;
}
\`\`\`
End of code.`;
      
      const result = formatter.formatAIResponse(input);
      
      expect(result).toContain('function test()');
      expect(result).toContain('return true;');
    });

    it('should handle multiple code blocks', () => {
      const input = `First block:
\`\`\`js
const a = 1;
\`\`\`
Second block:
\`\`\`python
print("hello")
\`\`\``;
      
      const result = formatter.formatAIResponse(input);
      
      expect(result).toContain('const a = 1;');
      expect(result).toContain('print("hello")');
    });

    it('should format headers with #', () => {
      const input = '# Main Header\nSome content\n## Sub Header';
      const result = formatter.formatAIResponse(input);
      
      expect(result).toContain('Main Header');
      expect(result).toContain('Sub Header');
    });

    it('should handle empty strings', () => {
      const result = formatter.formatAIResponse('');
      expect(result).toBe('\n\n');
    });

    it('should handle strings with only whitespace', () => {
      const result = formatter.formatAIResponse('   \n  \t  ');
      expect(result).toContain('\n');
    });

    it('should handle complex mixed formatting', () => {
      const input = `# Code Review
Here's the **main issue**:

\`\`\`typescript
function buggyCode() {
  // This has **bold** inside code block
  return \`template\`;
}
\`\`\`

Use \`npm test\` to verify the fix.`;

      const result = formatter.formatAIResponse(input);
      
      expect(result).toContain('Code Review');
      expect(result).toContain('main issue');
      expect(result).toContain('function buggyCode()');
      expect(result).toContain('npm test');
    });
  });
});