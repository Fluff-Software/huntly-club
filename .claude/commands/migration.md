---
description: Guide through creating a Supabase database migration
---

Help create a database migration following the Supabase workflow:

@ai-dev/rules/supabase.md

Steps:
1. Confirm what database changes are needed
2. Remind to make changes in Supabase Studio UI first (http://localhost:54323)
3. Generate migration:
   ```bash
   supabase db diff --local --file <descriptive_name>
   ```
4. Review the generated migration file in supabase/migrations/
5. Regenerate TypeScript types:
   ```bash
   supabase gen types typescript --local > models/supabase.ts
   ```
6. Check if RLS policies need to be added/updated
7. Consider if seed data needs updating

Verify:
- Migration is idempotent and safe
- Rollback plan exists if needed
- Types are properly regenerated
- Related service code is updated
- RLS policies are secure
