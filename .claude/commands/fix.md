---
description: Debug and fix a bug in the codebase
---

Investigate and fix the described bug:

1. **Understand the Issue**
   - Review the error message or unexpected behavior
   - Identify affected code areas
   - Check recent changes that might have caused it

2. **Investigate**
   - Use debugging to trace the issue
   - Check relevant service functions
   - Review component lifecycle and state management
   - Verify Supabase queries and RLS policies
   - Check for TypeScript errors

3. **Fix**
   - Implement the minimal fix required
   - Follow @ai-dev/rules/coding-style.md
   - Ensure type safety
   - Add proper error handling if missing

4. **Test**
   - Verify the fix resolves the issue
   - Check for edge cases
   - Ensure no regressions
   - Add tests to prevent recurrence using @ai-dev/rules/testing.md

5. **Document**
   - Explain the root cause
   - Document the fix
   - Note any related issues or technical debt
