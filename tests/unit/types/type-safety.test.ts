/**
 * @fileoverview Unit tests for type safety features and type guards
 */

import { describe, it, expect } from 'vitest';
import { isSuccess, isError, type Result } from '../../../src/types';

describe('Type Safety', () => {
  describe('Result Type Guards', () => {
    it('should correctly identify success results', () => {
      const successResult: Result<string> = {
        success: true,
        data: 'test data'
      };
      
      expect(isSuccess(successResult)).toBe(true);
      expect(isError(successResult)).toBe(false);
      
      if (isSuccess(successResult)) {
        // TypeScript should know this is success type
        expect(successResult.data).toBe('test data');
        // This should not have an error property in TypeScript
        // expect(successResult.error).toBeUndefined(); // Would cause TS error
      }
    });

    it('should correctly identify error results', () => {
      const errorResult: Result<string> = {
        success: false,
        error: new Error('test error')
      };
      
      expect(isSuccess(errorResult)).toBe(false);
      expect(isError(errorResult)).toBe(true);
      
      if (isError(errorResult)) {
        // TypeScript should know this is error type
        expect(errorResult.error.message).toBe('test error');
        // This should not have a data property in TypeScript
        // expect(errorResult.data).toBeUndefined(); // Would cause TS error
      }
    });

    it('should work with custom error types', () => {
      interface CustomError {
        code: string;
        message: string;
        details?: unknown;
      }
      
      const customError: CustomError = {
        code: 'CUSTOM_ERROR',
        message: 'Something went wrong',
        details: { field: 'username' }
      };
      
      const errorResult: Result<string, CustomError> = {
        success: false,
        error: customError
      };
      
      expect(isError(errorResult)).toBe(true);
      
      if (isError(errorResult)) {
        expect(errorResult.error.code).toBe('CUSTOM_ERROR');
        expect(errorResult.error.message).toBe('Something went wrong');
        expect(errorResult.error.details).toEqual({ field: 'username' });
      }
    });

    it('should work with complex data types', () => {
      interface UserData {
        id: number;
        name: string;
        email: string;
      }
      
      const userData: UserData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const successResult: Result<UserData> = {
        success: true,
        data: userData
      };
      
      expect(isSuccess(successResult)).toBe(true);
      
      if (isSuccess(successResult)) {
        expect(successResult.data.id).toBe(1);
        expect(successResult.data.name).toBe('John Doe');
        expect(successResult.data.email).toBe('john@example.com');
      }
    });

    it('should handle array data types', () => {
      const arrayData = ['item1', 'item2', 'item3'];
      
      const successResult: Result<string[]> = {
        success: true,
        data: arrayData
      };
      
      expect(isSuccess(successResult)).toBe(true);
      
      if (isSuccess(successResult)) {
        expect(Array.isArray(successResult.data)).toBe(true);
        expect(successResult.data).toHaveLength(3);
        expect(successResult.data[0]).toBe('item1');
      }
    });

    it('should handle null and undefined data', () => {
      const nullResult: Result<null> = {
        success: true,
        data: null
      };
      
      const undefinedResult: Result<undefined> = {
        success: true,
        data: undefined
      };
      
      expect(isSuccess(nullResult)).toBe(true);
      expect(isSuccess(undefinedResult)).toBe(true);
      
      if (isSuccess(nullResult)) {
        expect(nullResult.data).toBeNull();
      }
      
      if (isSuccess(undefinedResult)) {
        expect(undefinedResult.data).toBeUndefined();
      }
    });
  });

  describe('Type Narrowing', () => {
    it('should properly narrow union types', () => {
      type ApiResponse = Result<{ data: string }, { code: number; message: string }>;
      
      function processApiResponse(response: ApiResponse): string {
        if (isSuccess(response)) {
          // TypeScript knows this is success type
          return `Success: ${response.data.data}`;
        } else {
          // TypeScript knows this is error type
          return `Error ${response.error.code}: ${response.error.message}`;
        }
      }
      
      const successResponse: ApiResponse = {
        success: true,
        data: { data: 'API response data' }
      };
      
      const errorResponse: ApiResponse = {
        success: false,
        error: { code: 404, message: 'Not found' }
      };
      
      expect(processApiResponse(successResponse)).toBe('Success: API response data');
      expect(processApiResponse(errorResponse)).toBe('Error 404: Not found');
    });

    it('should work with generic functions', () => {
      function handleResult<T, E>(result: Result<T, E>): T | null {
        if (isSuccess(result)) {
          return result.data;
        } else {
          // Just return null without logging to avoid test environment issues
          return null;
        }
      }
      
      const stringResult: Result<string> = {
        success: true,
        data: 'hello'
      };
      
      const numberError: Result<number> = {
        success: false,
        error: new Error('Failed to get number')
      };
      
      expect(handleResult(stringResult)).toBe('hello');
      expect(handleResult(numberError)).toBeNull();
    });

    it('should support async results', async () => {
      async function asyncOperation(): Promise<Result<string>> {
        // Simulate async operation
        return {
          success: true,
          data: 'async result'
        };
      }
      
      async function asyncError(): Promise<Result<string>> {
        return {
          success: false,
          error: new Error('async error')
        };
      }
      
      const successResult = await asyncOperation();
      const errorResult = await asyncError();
      
      expect(isSuccess(successResult)).toBe(true);
      expect(isError(errorResult)).toBe(true);
      
      if (isSuccess(successResult)) {
        expect(successResult.data).toBe('async result');
      }
      
      if (isError(errorResult)) {
        expect(errorResult.error.message).toBe('async error');
      }
    });
  });

  describe('Type Guard Performance', () => {
    it('should have efficient type guards', () => {
      // Test that type guards are simple property checks
      const successResult: Result<string> = {
        success: true,
        data: 'test'
      };
      
      const errorResult: Result<string> = {
        success: false,
        error: new Error('test')
      };
      
      // These should be very fast operations
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        isSuccess(successResult);
        isError(errorResult);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete 1000 iterations very quickly (< 10ms)
      expect(duration).toBeLessThan(10);
    });

    it('should not perform deep object inspection', () => {
      const largeData = {
        array: new Array(1000).fill('data'),
        nested: {
          deep: {
            very: {
              deep: 'value'
            }
          }
        }
      };
      
      const result: Result<typeof largeData> = {
        success: true,
        data: largeData
      };
      
      // Type guard should only check the success property
      const start = performance.now();
      const isSuccessResult = isSuccess(result);
      const end = performance.now();
      
      expect(isSuccessResult).toBe(true);
      expect(end - start).toBeLessThan(1); // Should be near-instantaneous
    });
  });

  describe('Type Safety Edge Cases', () => {
    it('should handle Result with void data type', () => {
      const voidResult: Result<void> = {
        success: true,
        data: undefined
      };
      
      expect(isSuccess(voidResult)).toBe(true);
      
      if (isSuccess(voidResult)) {
        expect(voidResult.data).toBeUndefined();
      }
    });

    it('should handle Result with any data type', () => {
      const anyData: any = { random: 'data', number: 42 };
      
      const anyResult: Result<any> = {
        success: true,
        data: anyData
      };
      
      expect(isSuccess(anyResult)).toBe(true);
      
      if (isSuccess(anyResult)) {
        expect(anyResult.data.random).toBe('data');
        expect(anyResult.data.number).toBe(42);
      }
    });

    it('should handle Result with function data type', () => {
      const func = (x: number) => x * 2;
      
      const funcResult: Result<typeof func> = {
        success: true,
        data: func
      };
      
      expect(isSuccess(funcResult)).toBe(true);
      
      if (isSuccess(funcResult)) {
        expect(typeof funcResult.data).toBe('function');
        expect(funcResult.data(5)).toBe(10);
      }
    });

    it('should maintain type safety with nested Results', () => {
      const nestedResult: Result<Result<string>> = {
        success: true,
        data: {
          success: true,
          data: 'nested data'
        }
      };
      
      expect(isSuccess(nestedResult)).toBe(true);
      
      if (isSuccess(nestedResult)) {
        const innerResult = nestedResult.data;
        expect(isSuccess(innerResult)).toBe(true);
        
        if (isSuccess(innerResult)) {
          expect(innerResult.data).toBe('nested data');
        }
      }
    });
  });
});