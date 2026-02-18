# Code Refactoring Prompt

You are tasked with refactoring code in the Huntly World application to improve code quality, maintainability, and performance while maintaining existing functionality.

## Context
- This is a React Native/Expo application with TypeScript
- Follow the coding style and architecture guidelines in `ai-dev/rules/`
- Maintain existing functionality and behavior
- Ensure type safety throughout

## Refactoring Principles

### Code Quality
- Extract repeated logic into reusable functions or hooks
- Simplify complex conditional logic
- Remove dead code and unused imports
- Improve variable and function naming for clarity
- Break down large functions into smaller, focused ones

### Performance
- Identify and optimize expensive operations
- Add appropriate memoization (useMemo, useCallback)
- Replace ScrollView + map with FlatList for long lists
- Optimize re-renders by proper dependency arrays

### Type Safety
- Add missing type annotations
- Replace `any` types with proper types
- Use generated Supabase types from `models/supabase.ts`
- Ensure all function parameters and return types are defined

### Architecture
- Separate concerns (UI, business logic, data fetching)
- Move business logic to service layer
- Extract complex hooks into separate files
- Use proper component composition

## Refactoring Process

1. **Analyze Current Code**
   - Identify code smells and anti-patterns
   - Look for duplicated logic
   - Check for performance issues
   - Review type safety

2. **Plan Changes**
   - List specific improvements needed
   - Consider impact on other parts of the codebase
   - Ensure backward compatibility if needed

3. **Implement Refactoring**
   - Make incremental changes
   - Maintain existing functionality
   - Add tests if missing
   - Update types as needed

4. **Verify**
   - Ensure no breaking changes
   - Check that types are correct
   - Verify performance improvements
   - Test edge cases

## Example Refactorings

### Before: Duplicated Logic
```typescript
useEffect(() => {
  const fetchPacks = async () => {
    const { data, error } = await supabase.from('packs').select('*');
    if (error) {
      setError('Failed to load packs');
      return;
    }
    setPacks(data);
  };
  fetchPacks();
}, []);

useEffect(() => {
  const fetchActivities = async () => {
    const { data, error } = await supabase.from('activities').select('*');
    if (error) {
      setError('Failed to load activities');
      return;
    }
    setActivities(data);
  };
  fetchActivities();
}, []);
```

### After: Extracted Hook
```typescript
// hooks/useDataFetch.ts
export function useDataFetch<T>(fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetch = async () => {
      try {
        const result = await fetchFn();
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError('Failed to load data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetch();
    return () => { isMounted = false; };
  }, []);

  return { data, loading, error };
}

// Usage
const { data: packs } = useDataFetch(() => getPacks());
const { data: activities } = useDataFetch(() => getActivities());
```

## What to Refactor

### High Priority
- Duplicated code (DRY principle)
- Complex functions (>50 lines)
- Missing error handling
- Any types
- Inefficient re-renders

### Medium Priority
- Long useEffect hooks
- Inline styles
- Magic numbers/strings
- Unclear variable names
- Missing type annotations

### Low Priority
- Comment improvements
- Consistent formatting
- Minor performance optimizations

## What NOT to Change

- Don't refactor just for the sake of refactoring
- Don't change working code without clear benefit
- Don't break existing functionality
- Don't introduce new dependencies unnecessarily
- Don't change generated files (models/supabase.ts)

## Output Format

Provide:
1. Summary of changes made
2. Rationale for each major refactoring
3. Any breaking changes (should be rare)
4. Performance improvements (if applicable)
5. Suggestions for further improvements
