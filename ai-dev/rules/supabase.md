# Supabase Development Guidelines

## Database Workflow

### Making Schema Changes

#### Step 1: Make Changes in Supabase UI
Use the Supabase Studio (local or hosted) to:
- Create/modify tables
- Add/remove columns
- Set up relationships
- Configure RLS policies
- Create indexes

**Why UI first?**
- Visual feedback
- Validation
- Easier to understand relationships
- Less error-prone

#### Step 2: Generate Migration
After making changes in the UI:
```bash
supabase db diff --local --file descriptive_migration_name
```

This creates a migration file in `supabase/migrations/`:
```
supabase/migrations/20240115123456_add_badges_table.sql
```

#### Step 3: Review Migration
Always review the generated migration:
```sql
-- Example migration
create table public.badges (
  id bigint primary key generated always as identity,
  name text not null,
  description text,
  icon text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.badges enable row level security;
```

#### Step 4: Regenerate TypeScript Types
After schema changes, regenerate types:
```bash
supabase gen types typescript --local > models/supabase.ts
```

**Important:**
- NEVER manually edit `models/supabase.ts`
- Always regenerate from the schema
- Commit the updated types file

#### Step 5: Reset Database (if needed)
To rebuild from migrations:
```bash
supabase db reset
```

This will:
1. Drop the database
2. Run all migrations in order
3. Apply seed data

#### Step 6: Seed Initial Data
Load initial data:
```bash
docker exec -i supabase_db_huntly-club psql -U postgres -d postgres < supabase/seed/initial_data.sql
```

## Query Patterns

### Basic Queries

#### Select All
```typescript
const { data, error } = await supabase
  .from('packs')
  .select('*');

if (error) throw error;
return data;
```

#### Select Specific Columns
```typescript
const { data, error } = await supabase
  .from('players')
  .select('id, name, xp');
```

#### Select with Relationships
```typescript
const { data, error } = await supabase
  .from('packs')
  .select(`
    *,
    activities (
      id,
      name,
      description
    )
  `);
```

### Filtering

#### Single Condition
```typescript
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('user_id', userId);
```

#### Multiple Conditions
```typescript
const { data, error } = await supabase
  .from('activity_logs')
  .select('*')
  .eq('player_id', playerId)
  .eq('pack_id', packId)
  .order('created_at', { ascending: false });
```

#### Range Queries
```typescript
const { data, error } = await supabase
  .from('players')
  .select('*')
  .gte('xp', 100)
  .lte('xp', 500);
```

### Insert Operations

#### Insert Single Row
```typescript
const { data, error } = await supabase
  .from('activity_logs')
  .insert({
    player_id: playerId,
    activity_id: activityId,
    completed_at: new Date().toISOString(),
  })
  .select()
  .single();

if (error) throw error;
return data;
```

#### Insert Multiple Rows
```typescript
const { data, error } = await supabase
  .from('badges')
  .insert([
    { name: 'First Steps', icon: '🏆' },
    { name: 'Explorer', icon: '🧭' },
  ])
  .select();
```

### Update Operations

#### Update Single Row
```typescript
const { data, error } = await supabase
  .from('players')
  .update({ xp: currentXP + 10 })
  .eq('id', playerId)
  .select()
  .single();
```

#### Update with Conditions
```typescript
const { data, error } = await supabase
  .from('teams')
  .update({ status: 'active' })
  .eq('id', teamId)
  .eq('owner_id', userId) // Additional security check
  .select();
```

### Delete Operations

#### Delete Row
```typescript
const { error } = await supabase
  .from('activity_logs')
  .delete()
  .eq('id', logId);

if (error) throw error;
```

### Complex Queries

#### Joins and Aggregations
```typescript
const { data, error } = await supabase
  .from('players')
  .select(`
    id,
    name,
    teams!inner (
      id,
      name
    ),
    activity_logs (
      count
    )
  `)
  .eq('teams.id', teamId);
```

#### Counting
```typescript
const { count, error } = await supabase
  .from('activity_logs')
  .select('*', { count: 'exact', head: true })
  .eq('player_id', playerId);
```

## Row Level Security (RLS)

### RLS Policies

#### Select Policy (Read)
```sql
-- Users can only see their own players
create policy "Users can view own players"
on players for select
using (auth.uid() = user_id);
```

#### Insert Policy (Create)
```sql
-- Users can create players for themselves
create policy "Users can create own players"
on players for insert
with check (auth.uid() = user_id);
```

#### Update Policy
```sql
-- Users can update their own players
create policy "Users can update own players"
on players for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

#### Delete Policy
```sql
-- Users can delete their own players
create policy "Users can delete own players"
on players for delete
using (auth.uid() = user_id);
```

### Testing RLS
Always test RLS policies:
```typescript
// This should work (own data)
const { data } = await supabase
  .from('players')
  .select('*')
  .eq('user_id', currentUser.id);

// This should fail (other user's data)
const { data: forbidden } = await supabase
  .from('players')
  .select('*')
  .eq('user_id', otherUserId); // Returns empty
```

## Authentication

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    emailRedirectTo: 'huntlyclub://auth/confirm',
  },
});
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
});
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut();
```

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### Auth State Changes
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Handle sign in
  }
  if (event === 'SIGNED_OUT') {
    // Handle sign out
  }
});
```

## Realtime Subscriptions

### Subscribe to Changes
```typescript
const channel = supabase
  .channel('activity-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'activity_logs',
      filter: `team_id=eq.${teamId}`,
    },
    (payload) => {
      console.log('New activity:', payload.new);
      // Update local state
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

### Presence
```typescript
const channel = supabase.channel('team-presence')
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Online users:', state);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: userId, online_at: new Date() });
    }
  });
```

## Type Safety

### Using Generated Types
```typescript
import { Database } from '@/models/supabase';

type Pack = Database['public']['Tables']['packs']['Row'];
type PackInsert = Database['public']['Tables']['packs']['Insert'];
type PackUpdate = Database['public']['Tables']['packs']['Update'];

// Use in function signatures
export async function createPack(data: PackInsert): Promise<Pack> {
  const { data: pack, error } = await supabase
    .from('packs')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return pack;
}
```

### Type-Safe Queries
```typescript
const { data, error } = await supabase
  .from('packs')
  .select('id, name, activities(id, name)')
  .returns<Pack[]>();
```

## Error Handling

### Standard Error Pattern
```typescript
export async function getData() {
  const { data, error } = await supabase
    .from('table')
    .select('*');

  if (error) {
    console.error('Database error:', error);
    throw new Error('Failed to fetch data');
  }

  return data;
}
```

### Specific Error Handling
```typescript
if (error) {
  if (error.code === 'PGRST116') {
    // No rows returned
    return null;
  }
  if (error.code === '23505') {
    // Unique constraint violation
    throw new Error('Record already exists');
  }
  throw error;
}
```

## Best Practices

### Do's
✅ Use RLS policies for security
✅ Regenerate types after schema changes
✅ Use migrations for all schema changes
✅ Test queries with expected data volumes
✅ Use indexes for frequently queried columns
✅ Use `.single()` when expecting one row
✅ Use `.select()` after INSERT/UPDATE to get data
✅ Handle errors appropriately

### Don'ts
❌ Don't manually edit generated types
❌ Don't bypass RLS in application code
❌ Don't store sensitive data unencrypted
❌ Don't make schema changes in production without testing
❌ Don't use `SELECT *` in production (select specific columns)
❌ Don't ignore migration order
❌ Don't forget to enable RLS on new tables

## Performance Optimization

### Indexing
```sql
-- Add index for frequently queried columns
create index idx_activity_logs_player_id
on activity_logs(player_id);

create index idx_players_user_id
on players(user_id);
```

### Query Optimization
```typescript
// Good - specific columns
const { data } = await supabase
  .from('packs')
  .select('id, name')
  .limit(10);

// Avoid - selecting everything
const { data } = await supabase
  .from('packs')
  .select('*');
```

### Connection Pooling
- Use single Supabase client instance
- Don't create new clients for each request
- Reuse connections

## Local Development

### Start Supabase
```bash
supabase start
```

### Stop Supabase
```bash
supabase stop
```

### View Logs
```bash
supabase logs
```

### Access Studio
```
http://localhost:54323
```

### Database URL
```
postgresql://postgres:postgres@localhost:54322/postgres
```
