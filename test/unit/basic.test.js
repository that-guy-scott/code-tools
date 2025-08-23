import { describe, it, expect } from 'vitest';

describe('Basic Test Suite', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should handle string operations', () => {
    const text = 'hello world';
    expect(text.toUpperCase()).toBe('HELLO WORLD');
    expect(text.split(' ')).toHaveLength(2);
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr.filter(n => n > 3)).toEqual([4, 5]);
  });

  it('should handle async operations', async () => {
    const promise = new Promise(resolve => {
      setTimeout(() => resolve('test'), 10);
    });
    
    const result = await promise;
    expect(result).toBe('test');
  });

  it('should handle object operations', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(Object.keys(obj)).toContain('value');
  });
});