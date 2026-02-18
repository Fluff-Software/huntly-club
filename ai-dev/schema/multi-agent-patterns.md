# Multi-Agent Patterns for Huntly World

This document describes patterns for using multiple AI agents collaboratively for complex development tasks in the Huntly World project.

## When to Use Multiple Agents

Use multiple agents when:
- Task has multiple independent sub-tasks
- Different specialized skills needed (review, test, implement)
- Parallel work can speed up completion
- Task requires verification/review steps

## Agent Coordination Patterns

### Pattern 1: Parallel Implementation
**Use Case:** Implementing multiple independent features simultaneously

**Example:**
```markdown
I need to implement three new features:
1. User preferences page
2. Activity filtering
3. Badge sharing

Please use three agents to implement these in parallel.
```

**How it works:**
- Agent 1: Implements user preferences (service + UI)
- Agent 2: Implements activity filtering (service + UI)
- Agent 3: Implements badge sharing (service + UI)
- Main agent: Coordinates and integrates

**Benefits:**
- Faster completion
- Isolated changes
- Easier to review

### Pattern 2: Sequential Pipeline
**Use Case:** Feature implementation with review and testing

**Example:**
```markdown
Please implement user profile editing with this workflow:
1. Agent 1: Implement the feature
2. Agent 2: Review the implementation
3. Agent 3: Add comprehensive tests
```

**How it works:**
1. Implementation agent creates feature following rules
2. Review agent checks code quality and patterns
3. Testing agent generates full test coverage
4. Main agent coordinates handoffs

**Benefits:**
- Quality assurance built-in
- Comprehensive testing
- Multiple perspectives

### Pattern 3: Specialist Review
**Use Case:** Comprehensive code review from multiple angles

**Example:**
```markdown
Review this authentication implementation with three specialist agents:
1. Security review
2. Performance review
3. UX/accessibility review
```

**How it works:**
- Security agent: Checks for vulnerabilities, proper validation
- Performance agent: Checks for optimization opportunities
- UX agent: Checks accessibility, user experience
- Main agent: Synthesizes feedback

**Benefits:**
- Comprehensive review
- Specialized expertise
- Thorough coverage

### Pattern 4: Research and Implementation
**Use Case:** Exploring options then implementing

**Example:**
```markdown
I want to add caching to the app.

1. Research agent: Explore caching options (Redis, AsyncStorage, Memory)
2. Planning agent: Design the caching strategy
3. Implementation agent: Implement the chosen solution
```

**How it works:**
1. Research agent investigates options, pros/cons
2. Planning agent designs architecture
3. Implementation agent builds the solution
4. Main agent facilitates decisions

**Benefits:**
- Informed decisions
- Better architecture
- Faster implementation

### Pattern 5: Divide and Conquer
**Use Case:** Large refactoring across multiple files

**Example:**
```markdown
Refactor the entire authentication flow across:
- 5 screen files
- 3 service files
- 2 context files

Use multiple agents to refactor in parallel.
```

**How it works:**
- Agent 1: Refactors screens
- Agent 2: Refactors services
- Agent 3: Refactors contexts
- Main agent: Ensures consistency

**Benefits:**
- Handles large scope
- Maintains consistency
- Faster completion

## Huntly World Specific Patterns

### Pattern: Feature Development Pipeline

**Stages:**
1. **Planning Agent**: Designs architecture referencing `@ai-dev/rules/architecture.md`
2. **Database Agent**: Creates migrations following `@ai-dev/rules/supabase.md`
3. **Service Agent**: Implements business logic following `@ai-dev/rules/coding-style.md`
4. **UI Agent**: Creates components following `@ai-dev/rules/ui-ux.md`
5. **Test Agent**: Writes tests following `@ai-dev/rules/testing.md`
6. **Review Agent**: Reviews everything with `@ai-dev/prompts/review.prompt.md`

**Example Command:**
```markdown
Implement badge trading feature using the feature development pipeline.

Pipeline:
1. Plan the architecture and database schema
2. Create database migration
3. Implement service layer (badgeTradingService.ts)
4. Create UI components and screens
5. Write comprehensive tests
6. Perform code review

Each agent should reference appropriate ai-dev files.
```

### Pattern: Bug Fix Workflow

**Stages:**
1. **Investigation Agent**: Debugs and identifies root cause
2. **Fix Agent**: Implements minimal fix following patterns
3. **Test Agent**: Adds regression tests
4. **Review Agent**: Verifies fix doesn't introduce issues

**Example Command:**
```markdown
Fix the XP calculation bug using the bug fix workflow:

1. Investigate: Find root cause of negative XP values
2. Fix: Implement solution following @ai-dev/rules/coding-style.md
3. Test: Add tests to prevent regression
4. Review: Verify fix is correct and complete
```

### Pattern: Codebase Modernization

**Stages:**
1. **Audit Agent**: Identifies areas needing updates
2. **Refactor Agents** (parallel): Each handles a module
3. **Integration Agent**: Ensures all changes work together
4. **Test Agent**: Verifies no regressions

**Example Command:**
```markdown
Modernize the pack system across multiple files:

1. Audit current implementation
2. Refactor in parallel:
   - Agent 1: packService.ts
   - Agent 2: Pack components
   - Agent 3: Pack screens
3. Integrate and test changes
4. Verify no breaking changes
```

## Agent Communication Patterns

### Shared Context
All agents should reference:
```markdown
@ai-dev/agents.md                    # Project overview
@ai-dev/rules/[relevant-rule].md    # Specific guidelines
```

### Handoff Pattern
When one agent completes work for another:
```markdown
Agent 1 Output:
- Completed: [what was done]
- Files Changed: [list of files]
- Next Steps: [what the next agent should do]
- Context: [important information for next agent]
```

### Review Pattern
When reviewing another agent's work:
```markdown
Reviewed: [what was reviewed]
Reference: @ai-dev/prompts/review.prompt.md

Findings:
- Critical Issues: [list]
- Suggestions: [list]
- Positive Notes: [what was done well]

Recommendation: [approve/needs changes]
```

## Best Practices

### Do's
✅ Define clear agent responsibilities
✅ Reference ai-dev files in each agent prompt
✅ Use parallel agents for independent work
✅ Use sequential agents for dependent work
✅ Include review stages for quality
✅ Coordinate through main agent
✅ Share context between agents

### Don'ts
❌ Don't duplicate work across agents
❌ Don't lose context between handoffs
❌ Don't skip verification steps
❌ Don't forget to integrate results
❌ Don't parallelize dependent tasks

## Example: Complete Feature with Multi-Agent

**Task:** Implement team challenges feature

**Agent Structure:**
```markdown
Main Agent: Coordinates the following agents

1. Planning Agent (@ai-dev/rules/architecture.md)
   - Design database schema for challenges
   - Plan service layer architecture
   - Design UI flow

2. Database Agent (@ai-dev/rules/supabase.md)
   - Create challenges table migration
   - Set up RLS policies
   - Regenerate TypeScript types

3. Service Agent (@ai-dev/rules/coding-style.md)
   - Implement challengeService.ts
   - Handle CRUD operations
   - Add error handling

4. UI Components Agent (@ai-dev/rules/ui-ux.md)
   - Create ChallengeCard component
   - Create ChallengeModal component
   - Follow design system

5. Screen Agent (@ai-dev/rules/ui-ux.md)
   - Implement challenges screen
   - Add loading/error states
   - Integrate with service layer

6. Test Agent (@ai-dev/rules/testing.md)
   - Write service tests
   - Write component tests
   - Write integration tests

7. Review Agent (@ai-dev/prompts/review.prompt.md)
   - Review all code
   - Check for issues
   - Verify patterns followed

8. Documentation Agent (@ai-dev/prompts/doc-writer.prompt.md)
   - Document new feature
   - Update README
   - Add inline comments
```

**Execution:**
1. Planning agent designs solution
2. Database, Service, and UI agents work in parallel
3. Screen agent integrates components
4. Test agent adds coverage
5. Review agent checks quality
6. Documentation agent finalizes
7. Main agent coordinates and integrates

## Monitoring Agent Progress

Track each agent:
```markdown
Planning Agent: ✅ Complete
Database Agent: ✅ Complete
Service Agent: 🔄 In Progress
UI Components Agent: ⏳ Pending
Screen Agent: ⏳ Pending
Test Agent: ⏳ Pending
Review Agent: ⏳ Pending
Documentation Agent: ⏳ Pending
```

## Agent Templates

### Implementation Agent Template
```markdown
You are implementing [feature] for Huntly World.

Context:
@ai-dev/agents.md
@ai-dev/rules/coding-style.md
@ai-dev/rules/architecture.md

Task:
[Specific implementation task]

Requirements:
- Follow project patterns
- Use TypeScript types
- Handle errors properly
- Add loading states

Deliverables:
- [List of files to create/modify]
```

### Review Agent Template
```markdown
You are reviewing code for Huntly World.

Context:
@ai-dev/prompts/review.prompt.md
@ai-dev/rules/[relevant-rules].md

Review:
[Code to review]

Check for:
- Code quality
- Type safety
- Pattern adherence
- Security issues
- Performance concerns

Provide detailed feedback with examples.
```

### Testing Agent Template
```markdown
You are writing tests for Huntly World.

Context:
@ai-dev/prompts/test-generator.prompt.md
@ai-dev/rules/testing.md

Code to test:
[Code that needs tests]

Requirements:
- Unit tests for all functions
- Component tests for UI
- Edge case coverage
- Mock external dependencies

Use Jest and React Testing Library.
```

## Conclusion

Multi-agent patterns enable:
- Parallel work for faster delivery
- Specialized focus for better quality
- Built-in review for reliability
- Scalability for complex tasks

Choose the pattern that fits your task complexity and requirements.
