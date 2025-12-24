# Code Review Prompt

You are conducting a thorough code review for the Huntly Club application. Review the code for quality, correctness, security, and adherence to project standards.

## Review Criteria

### Code Quality
- [ ] Code follows TypeScript best practices
- [ ] Naming conventions are clear and consistent
- [ ] Functions are focused and single-purpose
- [ ] No duplicated code
- [ ] Proper error handling
- [ ] Comments explain "why" not "what"

### Architecture & Design
- [ ] Follows established patterns in `ai-dev/rules/architecture.md`
- [ ] Proper separation of concerns (UI, services, data)
- [ ] No business logic in components
- [ ] Services handle data fetching
- [ ] Contexts used appropriately for global state

### Type Safety
- [ ] All functions have type annotations
- [ ] No `any` types without justification
- [ ] Uses generated Supabase types
- [ ] Proper interface definitions
- [ ] Type guards where needed

### React/React Native Best Practices
- [ ] Proper use of hooks (useState, useEffect, etc.)
- [ ] Correct dependency arrays in useEffect
- [ ] isMounted pattern for async operations
- [ ] Appropriate use of useMemo/useCallback
- [ ] No memory leaks (cleanup in useEffect)

### UI/UX Standards
- [ ] Follows design system in `ai-dev/rules/ui-ux.md`
- [ ] Uses Huntly color palette
- [ ] ThemedText/ThemedView instead of basic components
- [ ] Consistent spacing and layout
- [ ] Proper accessibility labels
- [ ] Loading and error states handled

### Supabase Integration
- [ ] Follows patterns in `ai-dev/rules/supabase.md`
- [ ] Proper error handling for queries
- [ ] Uses RLS-aware queries
- [ ] Efficient query structure
- [ ] No N+1 query problems
- [ ] Proper use of select/insert/update/delete

### Performance
- [ ] No unnecessary re-renders
- [ ] FlatList for long lists (not ScrollView + map)
- [ ] Images properly optimized
- [ ] Expensive calculations memoized
- [ ] Minimal bundle size impact

### Security
- [ ] No hardcoded secrets or API keys
- [ ] User input properly validated
- [ ] No SQL injection vulnerabilities
- [ ] Authentication checks in place
- [ ] RLS policies respected

### Testing
- [ ] Critical logic has tests
- [ ] Edge cases considered
- [ ] Error cases handled
- [ ] Test coverage adequate

### Documentation
- [ ] Complex logic has comments
- [ ] README updated if needed
- [ ] Type definitions serve as documentation
- [ ] Public APIs documented

## Review Process

### 1. Initial Assessment
- Understand the purpose of the change
- Review the scope and impact
- Identify affected areas

### 2. Detailed Review
For each file:
- Check code quality and style
- Verify type safety
- Review logic correctness
- Check for edge cases
- Assess performance impact

### 3. Testing Considerations
- Are there tests for new functionality?
- Do existing tests need updates?
- Are edge cases covered?

### 4. Security Review
- Any user input validation?
- Any authentication/authorization?
- Any data exposure risks?

## Feedback Format

### Issues Found
For each issue, provide:
- **Severity**: Critical | High | Medium | Low
- **Location**: File and line number
- **Issue**: Clear description
- **Recommendation**: How to fix
- **Example**: Code example if helpful

### Example Issue
```
Severity: High
Location: services/packService.ts:42
Issue: Missing error handling for Supabase query
Recommendation: Wrap query in try-catch and throw meaningful error

Current:
const { data } = await supabase.from('packs').select('*');
return data;

Suggested:
const { data, error } = await supabase.from('packs').select('*');
if (error) throw new Error('Failed to fetch packs');
return data;
```

## Review Categories

### Critical Issues ⛔
Must be fixed before merging:
- Security vulnerabilities
- Data loss risks
- Breaking changes without migration
- Memory leaks
- Type errors

### High Priority Issues ⚠️
Should be fixed before merging:
- Poor error handling
- Performance problems
- Accessibility issues
- Missing type annotations
- Logic errors

### Medium Priority Issues ℹ️
Should be addressed soon:
- Code duplication
- Inconsistent naming
- Missing comments
- Minor performance optimizations
- Style inconsistencies

### Low Priority Issues 💡
Nice to have:
- Code simplification opportunities
- Better variable names
- Additional test coverage
- Documentation improvements

## Positive Feedback

Also highlight:
- Good patterns used
- Clear and maintainable code
- Excellent error handling
- Well-structured logic
- Good test coverage

## Review Checklist Summary

**Code Quality:**
- [ ] Follows coding style guide
- [ ] No code duplication
- [ ] Clear naming
- [ ] Proper error handling

**Architecture:**
- [ ] Separation of concerns
- [ ] Services for business logic
- [ ] Proper component structure

**Type Safety:**
- [ ] All types defined
- [ ] No `any` types
- [ ] Uses Supabase types

**UI/UX:**
- [ ] Follows design system
- [ ] Proper theming
- [ ] Loading/error states
- [ ] Accessibility

**Performance:**
- [ ] No unnecessary re-renders
- [ ] Efficient queries
- [ ] Proper list rendering

**Security:**
- [ ] No secrets in code
- [ ] Input validation
- [ ] Proper authentication

**Testing:**
- [ ] Adequate test coverage
- [ ] Edge cases handled

## Output Format

Provide:
1. **Summary**: Overall assessment and main concerns
2. **Critical Issues**: Must-fix items
3. **High Priority Issues**: Should-fix items
4. **Medium/Low Priority Issues**: Nice-to-fix items
5. **Positive Notes**: What was done well
6. **Recommendations**: Next steps
