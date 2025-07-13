import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { FilePathUtils } from '../../../utils/filepath';
import type { PathValidationResult, FilePathInputState } from '../../../types';

interface FilePathInputProps {
  onSubmit: (path: string) => void;
  onCancel: () => void;
  placeholder?: string;
  initialValue?: string;
  autoComplete?: boolean;
  validateOnChange?: boolean;
}

/**
 * Interactive file path input component with tab completion and validation
 */
export const FilePathInput: React.FC<FilePathInputProps> = ({
  onSubmit,
  onCancel,
  placeholder = 'Enter file path...',
  initialValue = '',
  autoComplete = true,
  validateOnChange = true,
}) => {
  const [state, setState] = useState<FilePathInputState>({
    input: initialValue,
    completions: [],
    selectedCompletion: 0,
    showCompletions: false,
    validation: { valid: true },
    history: [],
  });

  // Validate path in real-time
  useEffect(() => {
    if (validateOnChange && state.input.trim()) {
      try {
        const result = FilePathUtils.isValidPath(state.input);
        setState(prev => ({ ...prev, validation: result }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          validation: {
            valid: false,
            error: (error as Error).message,
          },
        }));
      }
    } else {
      setState(prev => ({ ...prev, validation: { valid: true } }));
    }
  }, [state.input, validateOnChange]);

  // Handle input events
  useInput(async (inputChar, key) => {
    // Handle escape key
    if (key.escape) {
      onCancel();
      return;
    }

    // Handle enter key
    if (key.return) {
      if (state.showCompletions && state.completions[state.selectedCompletion]) {
        // Select completion
        const selectedPath = state.completions[state.selectedCompletion];
        setState(prev => ({
          ...prev,
          input: selectedPath.toString(),
          showCompletions: false,
          selectedCompletion: 0,
        }));
      } else if (state.validation.valid && state.input.trim()) {
        // Submit if valid
        onSubmit(state.input.trim());
      }
      return;
    }

    // Handle tab key for completions
    if (key.tab && autoComplete) {
      if (state.completions.length > 0) {
        if (state.showCompletions) {
          // Select current completion
          const selectedPath = state.completions[state.selectedCompletion];
          setState(prev => ({
            ...prev,
            input: selectedPath.toString(),
            showCompletions: false,
            selectedCompletion: 0,
          }));
        } else {
          // Show completions
          setState(prev => ({
            ...prev,
            showCompletions: true,
            selectedCompletion: 0,
          }));
        }
      }
      return;
    }

    // Handle completion navigation
    if (state.showCompletions) {
      if (key.upArrow) {
        setState(prev => ({
          ...prev,
          selectedCompletion: Math.max(0, prev.selectedCompletion - 1),
        }));
        return;
      }
      if (key.downArrow) {
        setState(prev => ({
          ...prev,
          selectedCompletion: Math.min(
            prev.completions.length - 1,
            prev.selectedCompletion + 1
          ),
        }));
        return;
      }
    }

    // Handle backspace
    if (key.backspace) {
      const newInput = state.input.slice(0, -1);
      setState(prev => ({ ...prev, input: newInput, showCompletions: false }));
      
      if (autoComplete && newInput.trim()) {
        updateCompletions(newInput);
      } else {
        setState(prev => ({ ...prev, completions: [] }));
      }
      return;
    }

    // Handle character input
    if (inputChar && !key.ctrl && !key.meta) {
      const newInput = state.input + inputChar;
      setState(prev => ({ ...prev, input: newInput, showCompletions: false }));
      
      if (autoComplete && newInput.trim()) {
        updateCompletions(newInput);
      }
    }
  });

  // Update completions based on current input
  const updateCompletions = async (input: string) => {
    try {
      const completions = await FilePathUtils.getCompletions(input);
      setState(prev => ({
        ...prev,
        completions: completions,
        selectedCompletion: 0,
      }));
    } catch {
      setState(prev => ({ ...prev, completions: [] }));
    }
  };

  return (
    <Box flexDirection="column">
      {/* Input field */}
      <Box>
        <Text>📁 </Text>
        <Text>{state.input || placeholder}</Text>
        <Text backgroundColor="white"> </Text>
      </Box>
      
      {/* Validation error */}
      {!state.validation.valid && state.input.trim() && (
        <Box marginTop={1}>
          <Text color="red">❌ {state.validation.error}</Text>
        </Box>
      )}
      
      {/* Completion info */}
      {state.completions.length > 0 && !state.showCompletions && (
        <Box marginTop={1}>
          <Text color="gray">
            {state.completions.length} completion{state.completions.length !== 1 ? 's' : ''} available (Tab to show)
          </Text>
        </Box>
      )}
      
      {/* Completions list */}
      {state.showCompletions && state.completions.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Completions:</Text>
          {state.completions.slice(0, 8).map((completion, index) => (
            <Box key={completion}>
              <Text color={index === state.selectedCompletion ? "blue" : "gray"}>
                {index === state.selectedCompletion ? "▶ " : "  "}
                {completion.length > 60 ? '...' + completion.slice(-60) : completion}
              </Text>
            </Box>
          ))}
          {state.completions.length > 8 && (
            <Text color="gray">
              ... and {state.completions.length - 8} more (use ↑↓ to navigate)
            </Text>
          )}
        </Box>
      )}
      
      {/* Quick access hints */}
      {!state.input.trim() && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">Quick access:</Text>
          <Text color="gray">  ~ (home directory)</Text>
          <Text color="gray">  . (current directory)</Text>
          <Text color="gray">  .. (parent directory)</Text>
        </Box>
      )}
      
      {/* Instructions */}
      <Box marginTop={1}>
        <Text color="gray">
          {autoComplete ? 'Tab: Completions | ' : ''}
          {state.showCompletions ? '↑↓: Navigate | ' : ''}
          Enter: Select | Esc: Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default FilePathInput;