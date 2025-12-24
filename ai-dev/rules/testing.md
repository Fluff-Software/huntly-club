# Testing Guidelines

## Testing Strategy

### Testing Pyramid
1. **Unit Tests** (70%) - Functions, utilities, services
2. **Integration Tests** (20%) - Component interactions, hooks
3. **E2E Tests** (10%) - Critical user flows

### Test Framework
- **Jest** - Test runner and assertion library
- **React Test Renderer** - Component testing
- **Expo Jest** - Expo-specific testing utilities

## Unit Testing

### Service Layer Tests
Test business logic and data transformation:

```typescript
// services/__tests__/packService.test.ts
import { getPacks, getPackById } from '../packService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('packService', () => {
  describe('getPacks', () => {
    it('should return array of packs', async () => {
      const mockPacks = [
        { id: 1, name: 'Test Pack', activities: [] }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockPacks,
          error: null,
        }),
      });

      const result = await getPacks();
      expect(result).toEqual(mockPacks);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Database error');

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      });

      await expect(getPacks()).rejects.toThrow('Database error');
    });
  });
});
```

### Utility Function Tests
Test pure functions thoroughly:

```typescript
// utils/__tests__/dateUtils.test.ts
import { formatDate, calculateAge } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBe('January 15, 2024');
    });

    it('should handle invalid dates', () => {
      expect(() => formatDate('invalid')).toThrow();
    });
  });
});
```

## Component Testing

### Component Test Structure
```typescript
// components/__tests__/Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../ui/Button';

describe('Button', () => {
  it('should render with children', () => {
    const { getByText } = render(
      <Button onPress={() => {}}>Click me</Button>
    );
    expect(getByText('Click me')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <Button onPress={mockPress}>Click me</Button>
    );

    fireEvent.press(getByText('Click me'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('should show loading indicator when loading', () => {
    const { getByTestId } = render(
      <Button loading onPress={() => {}}>Click me</Button>
    );
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('should be disabled when loading', () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <Button loading onPress={mockPress}>Click me</Button>
    );

    fireEvent.press(getByText('Click me'));
    expect(mockPress).not.toHaveBeenCalled();
  });
});
```

### Testing Hooks
```typescript
// hooks/__tests__/useDataFetch.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useDataFetch } from '../useDataFetch';

describe('useDataFetch', () => {
  it('should fetch data successfully', async () => {
    const mockFetch = jest.fn().mockResolvedValue(['item1', 'item2']);
    const { result } = renderHook(() => useDataFetch(mockFetch));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(['item1', 'item2']);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Failed'));
    const { result } = renderHook(() => useDataFetch(mockFetch));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch data');
    expect(result.current.data).toBeNull();
  });
});
```

## Mocking

### Mocking Supabase
```typescript
// __mocks__/supabase.ts
export const supabase = {
  from: jest.fn(),
  auth: {
    signIn: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
  },
};
```

### Mocking Navigation
```typescript
// __mocks__/expo-router.ts
export const useRouter = () => ({
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
});

export const useLocalSearchParams = () => ({});
```

### Mocking Context
```typescript
// Test wrapper with context
const TestWrapper = ({ children }) => (
  <PlayerContext.Provider value={mockPlayerContext}>
    {children}
  </PlayerContext.Provider>
);

const { result } = renderHook(() => usePlayer(), {
  wrapper: TestWrapper,
});
```

## Test Organization

### File Structure
```
__tests__/
├── components/
│   ├── Button.test.tsx
│   └── XPBar.test.tsx
├── services/
│   ├── packService.test.ts
│   └── badgeService.test.ts
├── hooks/
│   └── useDataFetch.test.ts
└── utils/
    └── dateUtils.test.ts
```

### Naming Conventions
- Test files: `[ComponentName].test.tsx` or `[fileName].test.ts`
- Test suites: `describe('[ComponentName]', () => {})`
- Test cases: `it('should [expected behavior]', () => {})`

## Test Coverage

### Coverage Goals
- **Services**: 80%+ coverage
- **Utilities**: 90%+ coverage
- **Components**: 60%+ coverage
- **Overall**: 70%+ coverage

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test Button.test.tsx

# Run in watch mode
npm test -- --watch
```

## Best Practices

### Do's
✅ Test behavior, not implementation
✅ Use descriptive test names
✅ Keep tests focused and isolated
✅ Mock external dependencies
✅ Test edge cases and error states
✅ Use setup/teardown appropriately

### Don'ts
❌ Don't test third-party libraries
❌ Don't test styling (except critical UI states)
❌ Don't over-mock (makes tests brittle)
❌ Don't test private methods directly
❌ Don't duplicate test logic

## Test Data

### Fixtures
Create reusable test data:
```typescript
// __fixtures__/packs.ts
export const mockPack = {
  id: 1,
  name: 'Test Pack',
  description: 'Test description',
  activities: [],
  created_at: '2024-01-01',
};

export const mockPacks = [mockPack, { ...mockPack, id: 2 }];
```

### Factory Functions
```typescript
// __fixtures__/factories.ts
export const createMockPlayer = (overrides = {}) => ({
  id: 1,
  name: 'Test Player',
  xp: 100,
  level: 2,
  ...overrides,
});
```

## Async Testing

### Waiting for Updates
```typescript
import { waitFor } from '@testing-library/react-native';

it('should load data', async () => {
  const { getByText } = render(<Screen />);

  await waitFor(() => {
    expect(getByText('Loaded')).toBeTruthy();
  });
});
```

### Testing Timers
```typescript
jest.useFakeTimers();

it('should debounce input', () => {
  const mockFn = jest.fn();
  const { getByPlaceholder } = render(
    <SearchInput onSearch={mockFn} />
  );

  fireEvent.changeText(getByPlaceholder('Search'), 'test');

  jest.advanceTimersByTime(500);
  expect(mockFn).toHaveBeenCalledWith('test');
});
```

## Snapshot Testing

### When to Use
Use snapshots sparingly for:
- Complex UI structures that rarely change
- Generated content (error messages, configs)

```typescript
it('should match snapshot', () => {
  const tree = render(<Button>Click me</Button>).toJSON();
  expect(tree).toMatchSnapshot();
});
```

## Integration Testing

### Screen-Level Tests
Test complete user flows:
```typescript
describe('PacksScreen', () => {
  it('should display packs after loading', async () => {
    const { getByText, queryByText } = render(<PacksScreen />);

    // Check loading state
    expect(getByText('Loading...')).toBeTruthy();

    // Wait for data
    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    });

    // Check data displayed
    expect(getByText('Nature Pack')).toBeTruthy();
  });
});
```

## Error Testing

### Testing Error States
```typescript
it('should display error message on failure', async () => {
  mockService.getData.mockRejectedValue(new Error('Failed'));

  const { getByText } = render(<Screen />);

  await waitFor(() => {
    expect(getByText('Failed to load data')).toBeTruthy();
  });
});
```

## Accessibility Testing

### Testing Accessibility
```typescript
it('should have accessible labels', () => {
  const { getByLabelText } = render(<LoginForm />);

  expect(getByLabelText('Email address')).toBeTruthy();
  expect(getByLabelText('Password')).toBeTruthy();
});
```
