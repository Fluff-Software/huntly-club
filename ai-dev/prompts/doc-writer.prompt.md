# Documentation Writer Prompt

You are writing clear, comprehensive documentation for the Huntly Club application. Documentation should be accessible to developers of varying experience levels.

## Documentation Types

### 1. API/Service Documentation
Document service layer functions with clear contracts:

```typescript
/**
 * Fetches all activity packs from the database.
 *
 * @returns {Promise<Pack[]>} Array of pack objects with their associated activities
 * @throws {Error} If the database query fails
 *
 * @example
 * ```typescript
 * const packs = await getPacks();
 * console.log(`Found ${packs.length} packs`);
 * ```
 */
export async function getPacks(): Promise<Pack[]> {
  const { data, error } = await supabase
    .from('packs')
    .select(`
      *,
      activities (*)
    `);

  if (error) {
    throw new Error('Failed to fetch packs');
  }

  return data;
}

/**
 * Creates a new player profile for a user.
 *
 * @param {Object} playerData - The player data to create
 * @param {string} playerData.user_id - The user's UUID from auth
 * @param {string} playerData.name - The player's display name
 * @param {string} [playerData.nickname] - Optional nickname
 * @returns {Promise<Player>} The created player object
 * @throws {Error} If creation fails or user already has max profiles
 *
 * @example
 * ```typescript
 * const player = await createPlayer({
 *   user_id: user.id,
 *   name: 'Scout',
 *   nickname: 'Nature Explorer'
 * });
 * ```
 */
export async function createPlayer(
  playerData: Database['public']['Tables']['players']['Insert']
): Promise<Player> {
  // Implementation
}
```

### 2. Component Documentation
Document React components with prop descriptions:

```typescript
/**
 * A themed button component with multiple variants and states.
 *
 * @component
 * @example
 * ```tsx
 * <Button
 *   variant="primary"
 *   size="large"
 *   onPress={handleSubmit}
 *   loading={isSubmitting}
 * >
 *   Submit Form
 * </Button>
 * ```
 */
interface ButtonProps {
  /**
   * The visual style variant of the button
   * - `primary`: Main action button (amber background)
   * - `secondary`: Secondary actions (green background)
   * - `danger`: Destructive actions (red background)
   * - `cancel`: Cancel/dismiss actions (charcoal background)
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'cancel';

  /**
   * The size of the button
   * - `small`: Compact button for tight spaces
   * - `medium`: Standard button size
   * - `large`: Prominent call-to-action button
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Whether the button is in loading state.
   * When true, displays a spinner and disables interaction.
   */
  loading?: boolean;

  /**
   * Whether the button is disabled.
   * Prevents user interaction when true.
   */
  disabled?: boolean;

  /**
   * Callback fired when the button is pressed.
   * Not called when button is disabled or loading.
   */
  onPress: () => void;

  /** The content to display inside the button */
  children: React.ReactNode;

  /** Additional CSS classes for custom styling */
  className?: string;
}
```

### 3. README Documentation
Write comprehensive README files:

```markdown
# Feature Name

## Overview
Brief description of what this feature does and why it exists.

## Usage

### Basic Example
```typescript
import { useFeature } from '@/hooks/useFeature';

function MyComponent() {
  const { data, loading, error } = useFeature();

  if (loading) return <LoadingView />;
  if (error) return <ErrorView error={error} />;

  return <DataView data={data} />;
}
```

### Advanced Example
```typescript
// More complex usage example
```

## API Reference

### Functions

#### `functionName(param: Type): ReturnType`
Description of what the function does.

**Parameters:**
- `param` (Type): Description of parameter

**Returns:**
- `ReturnType`: Description of return value

**Throws:**
- `Error`: When something goes wrong

**Example:**
```typescript
const result = functionName(value);
```

## Configuration

### Required Environment Variables
- `VARIABLE_NAME`: Description of what it's for

### Optional Settings
- `SETTING_NAME`: Description and default value

## Database Schema

### Tables
- `table_name`: Description of table
  - `column_name` (type): Description of column
  - Foreign keys, indexes, etc.

### RLS Policies
- Policy name: Description of what access is granted

## Testing

### Running Tests
```bash
npm test -- Feature.test.ts
```

### Test Coverage
- Current coverage: XX%
- Critical paths tested: Yes/No

## Common Issues

### Issue: Description
**Cause:** Why this happens
**Solution:** How to fix it

## Performance Considerations
- Important performance notes
- Optimization recommendations

## Related Documentation
- Link to related features
- External documentation references
```

### 4. Inline Comments
Write helpful inline comments for complex logic:

```typescript
// Good comments explain WHY, not WHAT

// Calculate XP required for next level using quadratic formula
// to create progressive difficulty curve
const xpForNextLevel = Math.pow(currentLevel, 2) * 100;

// Fetch progress for each pack separately due to RLS policies
// that prevent bulk queries across player ownership
for (const pack of packs) {
  const progress = await getPackProgress(playerId, pack.id);
  progressMap[pack.id] = progress;
}

// Use isMounted pattern to prevent state updates after component unmount
// See: https://react.dev/learn/synchronizing-with-effects#fetching-data
let isMounted = true;
// ...
return () => { isMounted = false; };

// Debounce search input to avoid excessive API calls
// 300ms delay balances responsiveness with performance
const debouncedSearch = debounce(handleSearch, 300);
```

### 5. Migration Documentation
Document database migrations clearly:

```sql
-- Migration: Add badge system
-- Created: 2024-01-15
-- Purpose: Implement badge earning and display functionality

-- Create badges table
-- Stores available badge types that players can earn
create table public.badges (
  id bigint primary key generated always as identity,
  name text not null,
  description text not null,
  icon text, -- Emoji or image URL
  category text not null, -- 'achievement', 'milestone', 'special'
  tier integer not null default 1, -- 1=bronze, 2=silver, 3=gold
  created_at timestamp with time zone default now()
);

-- Create user_badges junction table
-- Tracks which badges each player has earned
create table public.user_badges (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users not null,
  player_id bigint references public.players not null,
  badge_id bigint references public.badges not null,
  earned_at timestamp with time zone default now(),
  unique(player_id, badge_id) -- Prevent duplicate badge awards
);

-- Add RLS policies
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- Anyone can view available badges
create policy "Badges are viewable by everyone"
  on badges for select
  using (true);

-- Users can only view their own earned badges
create policy "Users can view own badges"
  on user_badges for select
  using (auth.uid() = user_id);

-- Create indexes for common queries
create index idx_user_badges_player_id on user_badges(player_id);
create index idx_user_badges_badge_id on user_badges(badge_id);

-- Add comment for future reference
comment on table badges is 'Available badge types that players can earn through various achievements';
comment on table user_badges is 'Junction table tracking badge awards to players';
```

## Documentation Standards

### Writing Style
- **Clear and Concise**: Get to the point quickly
- **Active Voice**: "The function returns" not "is returned by"
- **Present Tense**: "Creates a user" not "will create"
- **Specific**: Use exact terms, avoid vague language
- **Examples**: Include code examples for clarity

### Structure
1. **Brief description**: One-line summary
2. **Detailed explanation**: How it works, when to use
3. **Parameters/Props**: What it accepts
4. **Return value**: What it provides
5. **Throws/Errors**: What can go wrong
6. **Examples**: How to use it
7. **Related**: Links to related docs

### Code Examples
- Use realistic examples
- Show common use cases
- Include edge cases when relevant
- Keep examples focused and minimal
- Add comments to explain non-obvious parts

```typescript
// Good example - realistic and focused
const player = await getPlayer(userId);
if (!player) {
  throw new Error('Player not found');
}

// Bad example - too minimal to be useful
const p = await getPlayer(id);

// Bad example - too complex with unrelated logic
const player = await getPlayer(userId);
if (!player) {
  const newPlayer = await createPlayer({ userId, name: 'Default' });
  await updatePlayerSettings(newPlayer.id, defaultSettings);
  await notifyAdmin('New player created');
  return newPlayer;
}
```

## What to Document

### Must Document
- Public APIs and exported functions
- Complex algorithms or business logic
- Non-obvious design decisions
- Workarounds for bugs or limitations
- Setup and configuration steps
- Database schema and migrations

### Should Document
- Component props and usage
- Custom hooks
- Utility functions
- Error handling strategies
- Performance considerations

### Optional
- Simple, self-explanatory code
- Standard patterns
- Obvious functionality

## Documentation Checklist

- [ ] Clear, concise description
- [ ] Complete parameter documentation
- [ ] Return value documented
- [ ] Error conditions documented
- [ ] At least one usage example
- [ ] Links to related documentation
- [ ] No spelling or grammar errors
- [ ] Code examples tested and working
- [ ] Appropriate level of detail
- [ ] Updated when code changes

## Output Format

For each item being documented, provide:

1. **Summary**: One-line description
2. **Description**: Detailed explanation
3. **API Details**: Parameters, return values, errors
4. **Examples**: Code examples showing usage
5. **Notes**: Important considerations, gotchas
6. **Related**: Links to related documentation

Ensure documentation is:
- **Accurate**: Matches the actual code behavior
- **Complete**: Covers all important aspects
- **Clear**: Easy to understand for the target audience
- **Maintainable**: Easy to update when code changes
- **Useful**: Provides value to developers
