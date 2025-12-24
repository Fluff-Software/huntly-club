# Architecture Guidelines

## Layered Architecture

### Presentation Layer (Components & Screens)
- **Location**: `app/`, `components/`
- **Purpose**: UI rendering and user interaction
- **Rules**:
  - No direct database calls
  - Use services for business logic
  - Use contexts for global state
  - Keep components focused and single-purpose

### Business Logic Layer (Services)
- **Location**: `services/`
- **Purpose**: Application logic, data transformation, API calls
- **Rules**:
  - Pure functions where possible
  - Handle errors gracefully
  - Return consistent data shapes
  - No UI-specific logic

### Data Layer (Supabase)
- **Location**: `models/`, Supabase backend
- **Purpose**: Data persistence and retrieval
- **Rules**:
  - Generated types from schema
  - Row-level security policies
  - Database migrations for schema changes

## File Organization

### App Directory (Expo Router)
```
app/
├── (tabs)/              # Tab-based routes (main app)
│   ├── index.tsx       # Home/default tab
│   ├── profile.tsx     # Profile tab
│   └── pack/           # Nested routes
│       └── [id].tsx    # Dynamic route
├── auth/               # Authentication flows
├── profile/            # Profile management
├── _layout.tsx         # Root layout (providers, fonts)
└── +not-found.tsx      # 404 page
```

### Components Organization
```
components/
├── ui/                 # Reusable UI primitives
│   ├── Button.tsx
│   ├── ColorPicker.tsx
│   └── IconSymbol.tsx
├── layout/             # Layout components
│   └── BaseLayout.tsx
├── authentication/     # Auth-specific components
│   ├── LoginForm.tsx
│   └── SignUpForm.tsx
└── [Feature]*.tsx      # Feature-specific components
```

### Services Pattern
Each service should:
- Export typed functions
- Handle Supabase queries
- Transform data as needed
- Throw errors for callers to handle

```typescript
// services/packService.ts
export async function getPacks(): Promise<Pack[]> {
  const { data, error } = await supabase
    .from('packs')
    .select('*');

  if (error) throw error;
  return data;
}

export async function getPackById(id: number): Promise<Pack | null> {
  const { data, error } = await supabase
    .from('packs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}
```

## State Management

### Local State (useState)
Use for:
- Component-specific UI state
- Form inputs
- Loading/error states
- Modal visibility

### Context API
Use for:
- User authentication state
- Current player/profile
- Theme preferences
- Shared state across routes

```typescript
// contexts/PlayerContext.tsx
export const PlayerProvider = ({ children }) => {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  const value = {
    currentPlayer,
    setCurrentPlayer,
    refreshProfiles: async () => {
      // refresh logic
    },
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};
```

### Supabase Realtime
Use for:
- Live activity updates
- Team progress synchronization
- Social features (reactions)

## Navigation Patterns

### Expo Router Structure
- File-based routing
- Use `(groups)` for layout grouping
- Use `[param]` for dynamic routes
- Use `_layout.tsx` for nested layouts

### Navigation Methods
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate to route
router.push('/profile/123');

// Go back
router.back();

// Replace current route
router.replace('/auth');
```

## Data Flow

### Typical Data Flow
1. Component mounts
2. useEffect triggers data fetch
3. Service function called
4. Supabase query executed
5. Data transformed/validated
6. State updated
7. UI re-renders

### Example Implementation
```typescript
export default function Screen() {
  const [data, setData] = useState<Data[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const result = await someService.getData();
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError("Failed to load");
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} />;
  return <DataView data={data} />;
}
```

## Separation of Concerns

### Component Responsibilities
✅ **Should do:**
- Render UI
- Handle user interactions
- Manage local UI state
- Call service functions
- Use context for shared state

❌ **Should NOT do:**
- Direct database queries
- Complex business logic
- Data transformation
- Authentication logic

### Service Responsibilities
✅ **Should do:**
- Database queries
- API calls
- Data transformation
- Business logic
- Error handling

❌ **Should NOT do:**
- UI rendering
- Component state management
- Navigation
- Direct UI updates

## Code Reusability

### Extracting Common Logic
When you see the same pattern 3+ times, extract it:

**Custom Hooks** for shared logic:
```typescript
// hooks/useDataFetch.ts
export function useDataFetch<T>(fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // fetch logic
  }, []);

  return { data, loading, error };
}
```

**Utility Functions** for data manipulation:
```typescript
// utils/dateUtils.ts
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
```

**Component Composition** for UI patterns:
```typescript
// components/ui/Card.tsx
export function Card({ children, className = "" }) {
  return (
    <View className={`bg-white rounded-2xl p-4 shadow-soft ${className}`}>
      {children}
    </View>
  );
}
```

## Dependency Management

### Import Rules
- Use `@/` alias for absolute imports from project root
- Keep external dependencies minimal
- Avoid unused dependencies
- Group related imports

### Avoiding Circular Dependencies
- Services should not import from `app/`
- Components can import from `services/`, `hooks/`, `utils/`
- Utilities should be pure and import-free when possible

## Performance Considerations

### Memoization
Use `useMemo` for expensive calculations:
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

Use `useCallback` for functions passed as props:
```typescript
const handlePress = useCallback(() => {
  // handler logic
}, [dependencies]);
```

### List Rendering
Use `FlatList` for long lists instead of `ScrollView` + `.map()`:
```typescript
<FlatList
  data={items}
  renderItem={({ item }) => <ItemComponent item={item} />}
  keyExtractor={(item) => item.id.toString()}
/>
```

### Image Optimization
- Use Expo's Image component for optimization
- Provide dimensions when possible
- Use appropriate image formats

## Error Boundaries

### Component-Level Error Handling
Each screen should handle its own errors:
```typescript
if (error) {
  return (
    <View className="flex-1 items-center justify-center">
      <ThemedText>{error}</ThemedText>
      <Button onPress={retry}>Try Again</Button>
    </View>
  );
}
```

### Global Error Handling
- Use error boundaries for catastrophic failures
- Log errors for debugging
- Show user-friendly messages
