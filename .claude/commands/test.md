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
- Mock setup for dependencies (Supabase, navigation, etc.)
- Clear, descriptive test names

Use Jest and React Testing Library as specified in the testing rules.
Aim for 70%+ coverage.
