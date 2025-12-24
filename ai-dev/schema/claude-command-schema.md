# Claude Command Schema

This document describes how to create custom slash commands for Claude Code that can be used in this project.

## What are Slash Commands?

Slash commands are custom prompts stored in the `.claude/commands/` directory that can be invoked with a `/` prefix. They allow you to create reusable, project-specific commands for common development tasks.

## Command File Structure

### Location
```
.claude/
└── commands/
    ├── command-name.md
    ├── another-command.md
    └── ...
```

### File Naming
- Use kebab-case: `fix-types.md`, `add-test.md`
- Extension must be `.md`
- File name becomes the command name: `/fix-types`, `/add-test`

## Command Format

Commands are markdown files with optional frontmatter and a prompt body:

```markdown
---
description: Brief description of what this command does
---

[Your detailed prompt instructions here]
```

### Frontmatter (Optional)
```yaml
---
description: A short description shown in command listings
tags: [tag1, tag2]  # Optional categorization
---
```

### Prompt Body
The main content that Claude will receive when the command is invoked.

## Command Examples

### Example 1: Review Code Command
**File:** `.claude/commands/review.md`

```markdown
---
description: Review the current code for quality, security, and best practices
---

Please review the code in the current context using the guidelines from:

@ai-dev/prompts/review.prompt.md
@ai-dev/rules/coding-style.md
@ai-dev/rules/architecture.md
@ai-dev/rules/ui-ux.md
@ai-dev/rules/supabase.md

Focus on:
1. Code quality and TypeScript best practices
2. Adherence to project patterns
3. Security vulnerabilities
4. Performance issues
5. Accessibility concerns

Provide specific, actionable feedback with code examples.
```

### Example 2: Add Tests Command
**File:** `.claude/commands/add-tests.md`

```markdown
---
description: Generate comprehensive tests for the selected code
---

Generate tests for the selected code following:

@ai-dev/prompts/test-generator.prompt.md
@ai-dev/rules/testing.md

Include:
- Unit tests for all functions
- Component tests for UI elements
- Edge case coverage
- Mock setup for dependencies
- Clear test descriptions

Use Jest and React Testing Library as specified in the testing rules.
```

### Example 3: Refactor Command
**File:** `.claude/commands/refactor.md`

```markdown
---
description: Refactor the selected code for improved quality and maintainability
---

Refactor the selected code using the guidelines from:

@ai-dev/prompts/refactor.prompt.md
@ai-dev/rules/coding-style.md
@ai-dev/rules/architecture.md

Focus on:
- Extracting duplicated logic
- Improving type safety
- Simplifying complex functions
- Following project patterns
- Maintaining functionality

Explain all changes made and the rationale behind them.
```

### Example 4: New Feature Command
**File:** `.claude/commands/new-feature.md`

```markdown
---
description: Implement a new feature following project standards
---

Implement the requested feature using:

@ai-dev/prompts/feature-implementation.prompt.md
@ai-dev/rules/architecture.md
@ai-dev/rules/coding-style.md
@ai-dev/rules/ui-ux.md
@ai-dev/rules/supabase.md

Follow the complete implementation process:
1. Plan the architecture
2. Database changes (if needed)
3. Service layer implementation
4. UI component creation
5. Screen implementation
6. Tests
7. Documentation

Ensure the feature:
- Follows existing patterns
- Uses the design system
- Handles errors and loading states
- Includes proper TypeScript types
- Has appropriate tests
```

### Example 5: Fix Bug Command
**File:** `.claude/commands/fix-bug.md`

```markdown
---
description: Debug and fix an issue in the codebase
---

Investigate and fix the described bug following these steps:

1. **Understand the Issue**
   - Review the error message or unexpected behavior
   - Identify affected code areas
   - Check recent changes that might have caused it

2. **Investigate**
   - Use debugging tools to trace the issue
   - Check relevant service functions
   - Review component lifecycle and state management
   - Verify Supabase queries and RLS policies

3. **Fix**
   - Implement the minimal fix required
   - Follow patterns in @ai-dev/rules/
   - Ensure type safety
   - Add error handling if missing

4. **Test**
   - Verify the fix resolves the issue
   - Check for edge cases
   - Ensure no regressions
   - Add tests to prevent recurrence

5. **Document**
   - Explain the root cause
   - Document the fix
   - Note any related issues
```

### Example 6: Database Migration Command
**File:** `.claude/commands/migration.md`

```markdown
---
description: Guide through creating a database migration
---

Help create a database migration following the Supabase workflow:

Reference: @ai-dev/rules/supabase.md

Steps:
1. Confirm what database changes are needed
2. Remind to make changes in Supabase UI first
3. Show command to generate migration:
   ```
   supabase db diff --local --file descriptive_name
   ```
4. Review the generated migration
5. Show command to regenerate types:
   ```
   supabase gen types typescript --local > models/supabase.ts
   ```
6. Check if RLS policies need updates
7. Consider seed data updates

Verify:
- Migration is idempotent
- Rollback plan exists
- Types are regenerated
- Related code is updated
```

## Using Commands

### Basic Usage
```
/review
```

### With File Selection
Select code in your editor, then run:
```
/refactor
```

### With Additional Context
```
/new-feature
[Then describe the feature you want to build]
```

## Best Practices for Commands

### Do's
✅ Reference ai-dev files using `@ai-dev/` syntax
✅ Keep commands focused on a single task
✅ Include clear instructions
✅ Reference relevant rule files
✅ Provide context about the project
✅ Make commands reusable

### Don'ts
❌ Don't duplicate content from ai-dev files
❌ Don't make commands too specific
❌ Don't forget the description frontmatter
❌ Don't include AI-specific headers or metadata

## Command Organization

### Suggested Commands
- `/review` - Code review
- `/test` - Generate tests
- `/refactor` - Refactor code
- `/feature` - Implement new feature
- `/fix` - Fix bugs
- `/migration` - Database migration
- `/docs` - Generate documentation
- `/security` - Security audit
- `/performance` - Performance optimization

## Referencing AI-Dev Files

Use the `@` syntax to reference files:

```markdown
@ai-dev/agents.md                        # Root spec
@ai-dev/rules/coding-style.md           # Coding rules
@ai-dev/rules/architecture.md           # Architecture
@ai-dev/rules/ui-ux.md                  # Design system
@ai-dev/rules/supabase.md               # Database
@ai-dev/rules/testing.md                # Testing
@ai-dev/prompts/refactor.prompt.md      # Prompts
@ai-dev/prompts/review.prompt.md
@ai-dev/prompts/test-generator.prompt.md
```

## Testing Commands

After creating a command:
1. Test it in Claude Code: `/command-name`
2. Verify it loads the correct files
3. Check that Claude follows the instructions
4. Iterate on the prompt for better results

## Command Maintenance

- Review commands regularly
- Update when ai-dev files change
- Remove unused commands
- Gather feedback from team
- Document any special usage patterns
