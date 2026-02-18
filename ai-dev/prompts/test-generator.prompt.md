# Test Generation Prompt

You are writing comprehensive tests for the Huntly World application using Jest and React Testing Library.

## Context
- Test framework: Jest with `jest-expo`
- React testing: `@testing-library/react-native`
- Follow testing guidelines in `ai-dev/rules/testing.md`

## Testing Principles

### What to Test
✅ **Do test:**
- Business logic in services
- Utility functions
- Component behavior and interactions
- User flows
- Error handling
- Edge cases
- Async operations

❌ **Don't test:**
- Third-party libraries
- Implementation details
- Generated code (Supabase types)
- Visual styling (unless critical to UX)

### Test Structure
```typescript
describe('ComponentName or functionName', () => {
  describe('specific feature or method', () => {
    it('should behave in expected way', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Test Types

### 1. Service Tests
Test business logic and data operations:

```typescript
import { getPacks } from '../packService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('packService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPacks', () => {
    it('should return packs successfully', async () => {
      const mockPacks = [
        { id: 1, name: 'Nature Pack' },
        { id: 2, name: 'Adventure Pack' }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockPacks,
          error: null
        })
      });

      const result = await getPacks();

      expect(result).toEqual(mockPacks);
      expect(supabase.from).toHaveBeenCalledWith('packs');
    });

    it('should throw error on database failure', async () => {
      const mockError = new Error('Database connection failed');

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      });

      await expect(getPacks()).rejects.toThrow('Database connection failed');
    });
  });
});
```

### 2. Utility Tests
Test pure functions:

```typescript
import { formatDate, calculateLevel } from '../utils';

describe('utils', () => {
  describe('formatDate', () => {
    it('should format ISO date to readable format', () => {
      expect(formatDate('2024-01-15')).toBe('January 15, 2024');
    });

    it('should handle different months', () => {
      expect(formatDate('2024-12-25')).toBe('December 25, 2024');
    });
  });

  describe('calculateLevel', () => {
    it('should calculate level from XP', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(250)).toBe(3);
    });

    it('should handle negative XP', () => {
      expect(calculateLevel(-10)).toBe(1);
    });
  });
});
```

### 3. Component Tests
Test component rendering and interactions:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../ui/Button';

describe('Button', () => {
  it('should render children text', () => {
    const { getByText } = render(
      <Button onPress={() => {}}>Click Me</Button>
    );
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <Button onPress={mockPress}>Click Me</Button>
    );

    fireEvent.press(getByText('Click Me'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('should show loading state', () => {
    const { queryByText, getByTestId } = render(
      <Button loading onPress={() => {}}>Click Me</Button>
    );

    expect(queryByText('Click Me')).toBeNull();
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('should not call onPress when disabled', () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <Button disabled onPress={mockPress}>Click Me</Button>
    );

    fireEvent.press(getByText('Click Me'));
    expect(mockPress).not.toHaveBeenCalled();
  });

  it('should apply variant styles', () => {
    const { getByTestId } = render(
      <Button variant="primary" testID="button" onPress={() => {}}>
        Click Me
      </Button>
    );

    const button = getByTestId('button');
    // Test that appropriate styles are applied
  });
});
```

### 4. Hook Tests
Test custom hooks:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useDataFetch } from '../useDataFetch';

describe('useDataFetch', () => {
  it('should fetch data successfully', async () => {
    const mockData = ['item1', 'item2'];
    const mockFetch = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useDataFetch(mockFetch));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useDataFetch(mockFetch));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Failed to load data');
  });

  it('should refetch on dependency change', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce(['item1'])
      .mockResolvedValueOnce(['item1', 'item2']);

    const { result, rerender } = renderHook(
      ({ id }) => useDataFetch(() => mockFetch(id)),
      { initialProps: { id: 1 } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(['item1']);

    rerender({ id: 2 });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(['item1', 'item2']);
  });
});
```

## Test Coverage Goals

### Must Have (Priority 1)
- [ ] All service functions
- [ ] Critical business logic
- [ ] Authentication flows
- [ ] Data transformation utilities
- [ ] Error handling paths

### Should Have (Priority 2)
- [ ] Main UI components
- [ ] Custom hooks
- [ ] Navigation flows
- [ ] Form validations
- [ ] Edge cases

### Nice to Have (Priority 3)
- [ ] Presentational components
- [ ] Helper functions
- [ ] Visual regression tests
- [ ] Performance tests

## Mocking Strategies

### Supabase Mocks
```typescript
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      signIn: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));
```

### Navigation Mocks
```typescript
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));
```

### Context Mocks
```typescript
const mockPlayerContext = {
  currentPlayer: {
    id: 1,
    name: 'Test Player',
    xp: 100,
  },
  setCurrentPlayer: jest.fn(),
  refreshProfiles: jest.fn(),
};

// Wrapper for tests
const TestWrapper = ({ children }) => (
  <PlayerContext.Provider value={mockPlayerContext}>
    {children}
  </PlayerContext.Provider>
);
```

## Testing Async Code

### With async/await
```typescript
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

### With waitFor
```typescript
it('should update state', async () => {
  const { result } = renderHook(() => useData());

  await waitFor(() => {
    expect(result.current.loaded).toBe(true);
  });
});
```

### With act
```typescript
it('should update state on action', async () => {
  const { result } = renderHook(() => useCounter());

  await act(async () => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

## Edge Cases to Test

- Empty data sets
- Null/undefined values
- Network errors
- Authentication failures
- Boundary values (0, -1, max values)
- Race conditions
- Concurrent operations
- Memory leaks (cleanup)

## Test Organization

### File Naming
- Place tests in `__tests__/` directory
- Name: `ComponentName.test.tsx` or `functionName.test.ts`

### Setup/Teardown
```typescript
describe('Component', () => {
  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  beforeAll(() => {
    // One-time setup
  });

  afterAll(() => {
    // One-time cleanup
  });
});
```

## Output Requirements

For each component/function to test, provide:
1. **Test file structure** with describe blocks
2. **Core functionality tests**
3. **Edge case tests**
4. **Error handling tests**
5. **Mocks needed**
6. **Setup/teardown if required**
7. **Coverage expectations**

Ensure tests are:
- Readable and maintainable
- Independent and isolated
- Fast to execute
- Comprehensive but focused
