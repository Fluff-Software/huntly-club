# AI Development Guide

This guide explains how to use the `ai-dev/` directory with various AI coding assistants for the Huntly Club project.

## Overview

The `ai-dev/` directory contains:
- **rules/** - Modular development guidelines (tool-agnostic)
- **prompts/** - Reusable prompt templates (tool-agnostic)
- **schema/** - Claude-specific schemas and patterns
- **guide.md** - This file

The **agents.md** file provides project context and overview.

## File Structure

```
huntly-club/
├── ai-dev/
│   ├── agents.md                      # Root spec - project overview
│   ├── guide.md                      # This guide
│   │
│   ├── rules/                        # Development guidelines
│   │   ├── coding-style.md          # TypeScript, React patterns
│   │   ├── architecture.md          # Project structure, layers
│   │   ├── ui-ux.md                 # Design system, components
│   │   ├── testing.md               # Test patterns, coverage
│   │   ├── repo-structure.md        # File organization
│   │   └── supabase.md              # Database workflows
│   │
│   ├── prompts/                      # Reusable templates
│   │   ├── refactor.prompt.md
│   │   ├── review.prompt.md
│   │   ├── test-generator.prompt.md
│   │   ├── feature-implementation.prompt.md
│   │   └── doc-writer.prompt.md
│   │
│   └── schema/                       # Claude-specific
│       ├── claude-command-schema.md
│       └── multi-agent-patterns.md
│
└── .claude/                          # Claude Code specific
    ├── claude.md                     # Main Claude memory file
    └── commands/                     # Slash commands
        ├── review.md
        ├── test.md
        └── ...
```

## Using with Claude Code

Claude Code can reference these files using the `@` syntax.

### Main Memory File

Create or update `.claude/claude.md`:

```markdown
# Claude Code Memory

## Project Context
@ai-dev/agents.md

## Development Rules
@ai-dev/rules/coding-style.md
@ai-dev/rules/architecture.md
@ai-dev/rules/ui-ux.md
@ai-dev/rules/supabase.md
@ai-dev/rules/testing.md

## Additional Context
- This is a React Native/Expo application
- Uses Supabase for backend
- Follows strict TypeScript patterns
- Has a nature-themed design system
```

### Slash Commands

Create commands in `.claude/commands/` that reference ai-dev files:

**Example: `.claude/commands/review.md`**
```markdown
---
description: Review code for quality and best practices
---

Review the code using:
@ai-dev/prompts/review.prompt.md
@ai-dev/rules/coding-style.md
@ai-dev/rules/architecture.md
```

**Example: `.claude/commands/new-feature.md`**
```markdown
---
description: Implement a new feature
---

Implement the feature using:
@ai-dev/prompts/feature-implementation.prompt.md
@ai-dev/rules/architecture.md
@ai-dev/rules/ui-ux.md
@ai-dev/rules/supabase.md
```

### Usage in Conversation

Reference files directly in conversation:
```
Please refactor this component following @ai-dev/rules/coding-style.md
and @ai-dev/rules/architecture.md
```

### Multi-Agent Workflows

Use patterns from `@ai-dev/schema/multi-agent-patterns.md`:
```
Implement user preferences using the feature development pipeline from
@ai-dev/schema/multi-agent-patterns.md
```

## Using with GitHub Copilot

GitHub Copilot uses `.github/copilot-instructions.md` for project context.

### Setup

Create `.github/copilot-instructions.md`:

```markdown
# Huntly Club Development Instructions

## Project Overview
[Copy relevant content from agents.md]

## Coding Standards
[Copy or reference key points from ai-dev/rules/coding-style.md]

- Use TypeScript with strict mode
- Functional components only
- Follow isMounted pattern for async
- Use @ alias for imports

## Architecture
[Copy key points from ai-dev/rules/architecture.md]

- Service layer for business logic
- Components only handle UI
- Use Supabase generated types
- Context for global state

## UI/UX Guidelines
[Copy key points from ai-dev/rules/ui-ux.md]

- Use Huntly color palette
- ThemedText/ThemedView components
- Follow design system spacing
- Handle loading/error states

## Supabase Patterns
[Copy key points from ai-dev/rules/supabase.md]

- Regenerate types after schema changes
- Follow RLS patterns
- Use isMounted for queries
- Proper error handling

## Testing
[Copy key points from ai-dev/rules/testing.md]

- Jest + React Testing Library
- Test services and components
- 70%+ coverage goal
```

### In-Editor Usage

Copilot will use the instructions automatically. You can also:
- Add comments referencing the rules: `// Follow ai-dev/rules/coding-style.md`
- Use descriptive names that match patterns
- Structure code according to architecture rules

## Using with Cursor

Cursor supports both `.cursorrules` and direct file references.

### Setup: .cursorrules

Create `.cursorrules` at project root:

```
You are working on Huntly Club, a React Native/Expo app.

# Project Context
[Key points from agents.md]

# Coding Standards
Follow these guidelines from ai-dev/rules/:
- TypeScript strict mode, no any types
- Functional components with hooks
- Import alias @ for absolute paths
- isMounted pattern for async operations

# Architecture
- Services for business logic (services/)
- Components for UI (components/)
- Screens in app/ with Expo Router
- Generated Supabase types (models/supabase.ts)

# UI/UX
- Use Huntly color palette (huntly-amber, huntly-forest, etc.)
- ThemedText and ThemedView components
- NativeWind for styling
- Loading and error states required

# Supabase
- Regenerate types after schema changes
- Follow RLS patterns
- Use proper error handling
- Test queries with isMounted

# Testing
- Jest + React Testing Library
- 70%+ coverage
- Test services, components, and hooks
```

### Using Composer

In Cursor's Composer, reference files:
```
@ai-dev/rules/coding-style.md @ai-dev/rules/architecture.md
Please refactor this component following these guidelines.
```

### Chat Mode

```
Following @ai-dev/prompts/review.prompt.md, review this code
for quality and adherence to project standards.
```

## Using with VS Code Copilot

Similar to GitHub Copilot - uses `.github/copilot-instructions.md`.

### Additional: Workspace Settings

Add to `.vscode/settings.json`:
```json
{
  "github.copilot.advanced": {
    "contextualAssist": true
  },
  "files.associations": {
    "*.prompt.md": "markdown"
  }
}
```

## Using with Windsurf/Codeium/Other Tools

Most AI coding assistants support project-level instructions:

### Generic Setup File

Create `AI_INSTRUCTIONS.md` at root:
```markdown
# AI Development Instructions for Huntly Club

[Consolidated content from ai-dev/rules/ files]

Follow strict TypeScript patterns, use service layer architecture,
implement with Huntly design system, handle errors properly.

See ai-dev/ directory for detailed guidelines.
```

### Tool-Specific Configuration

- **Windsurf**: Uses `.windsurfrules`
- **Codeium**: Uses `.codeium/config.json`
- **Tabnine**: Uses `.tabnine/config.json`

Copy relevant content from ai-dev/rules/ into these config files.

## Best Practices

### For All Tools

1. **Reference, Don't Duplicate**
   - Point to ai-dev files rather than copying content
   - Keep a single source of truth
   - Update ai-dev files when patterns change

2. **Layered Context**
   - Start with agents.md for overview
   - Add specific rules as needed
   - Use prompts for complex tasks

3. **Keep It Current**
   - Update ai-dev when patterns change
   - Review rules regularly
   - Remove outdated guidance

4. **Organize by Task**
   - Use prompts for specific workflows
   - Use rules for general patterns
   - Use schema for tool-specific features

### File Reference Patterns

**For Overview:**
```
@ai-dev/agents.md
```

**For Specific Work:**
```
@ai-dev/rules/coding-style.md
@ai-dev/rules/architecture.md
```

**For Complex Tasks:**
```
@ai-dev/prompts/feature-implementation.prompt.md
@ai-dev/rules/architecture.md
@ai-dev/rules/ui-ux.md
@ai-dev/rules/supabase.md
```

## Updating Guidelines

When you need to update development patterns:

1. **Update ai-dev files** (single source of truth)
2. **Reference in tool configs** (don't duplicate)
3. **Test with AI tools** (verify it works)
4. **Document changes** (note what changed)

## Common Workflows

### Code Review
```
Claude Code:
/review

Cursor:
@ai-dev/prompts/review.prompt.md Review this code

Copilot:
# Add comment: AI review following coding-style.md
```

### New Feature
```
Claude Code:
/new-feature

Cursor:
@ai-dev/prompts/feature-implementation.prompt.md
Implement [feature] following all rules

Copilot:
# Code with patterns, Copilot follows instructions.md
```

### Refactoring
```
Claude Code:
/refactor

Cursor:
@ai-dev/prompts/refactor.prompt.md Refactor this code

Copilot:
# Copilot suggests improvements based on instructions.md
```

### Adding Tests
```
Claude Code:
/test

Cursor:
@ai-dev/prompts/test-generator.prompt.md Generate tests

Copilot:
# Generate tests following testing.md patterns
```

## Tool-Specific Features

### Claude Code Only
- Slash commands (`.claude/commands/`)
- Multi-agent patterns
- Direct @ file references
- Memory files

### Cursor Specific
- Composer mode with @ references
- .cursorrules file
- Inline chat with context

### Copilot Specific
- Inline suggestions based on instructions
- Chat mode with GitHub context
- Comment-driven development

## Getting Started Checklist

- [ ] Read `agents.md` for project overview
- [ ] Review relevant files in `ai-dev/rules/`
- [ ] Set up tool-specific configuration:
  - [ ] Claude Code: `.claude/claude.md`
  - [ ] Copilot: `.github/copilot-instructions.md`
  - [ ] Cursor: `.cursorrules`
  - [ ] Other: Create tool-specific config
- [ ] Create useful commands (Claude Code)
- [ ] Test AI assistant with a simple task
- [ ] Verify it follows project patterns

## Troubleshooting

### AI Not Following Rules

1. Check file references are correct
2. Verify tool can access the files
3. Make instructions more explicit
4. Add examples to rules
5. Use prompts for complex tasks

### Inconsistent Results

1. Reference multiple related files
2. Be specific about requirements
3. Use prompt templates
4. Provide examples in prompt

### File Not Loading

1. Check file path syntax
2. Verify file exists
3. Check tool-specific reference format
4. Try absolute vs relative paths

## Support

For questions about:
- **Project patterns**: See `ai-dev/rules/`
- **AI tool usage**: See this guide
- **Claude Code**: See `ai-dev/schema/`
- **Specific features**: See `agents.md`

## Contributing

When adding new patterns:

1. **Document in ai-dev/rules/** if it's a general pattern
2. **Create prompt in ai-dev/prompts/** if it's a workflow
3. **Add schema in ai-dev/schema/** if it's Claude-specific
4. **Update this guide** if it affects tool usage
5. **Update agents.md** if it's project-level context

Keep all files:
- Tool-agnostic (except schema/)
- Clear and concise
- Example-rich
- Easy to reference
