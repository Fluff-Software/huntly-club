# Coding Style Guidelines

## TypeScript Standards

### Type Definitions
- Use TypeScript interfaces for component props
- Prefer `interface` over `type` for object shapes
- Use `type` for unions, intersections, and primitives
- Always define return types for functions
- Avoid `any` - use `unknown` or proper types

```typescript
// Good
interface ButtonProps {
  variant?: ButtonVariant;
  onPress: () => void;
}

type ButtonVariant = "primary" | "secondary" | "danger";

// Avoid
const handlePress = (data: any) => { ... }
```

### Import Organization
1. React and React Native imports
2. Third-party libraries
3. Local components (using @ alias)
4. Services and utilities
5. Types and interfaces
6. Assets

```typescript
import React from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { getPackData } from "@/services/packService";
import { Pack } from "@/models/supabase";
```

## React Patterns

### Component Structure
- Use functional components exclusively
- Default export for screens/pages
- Named exports for reusable components
- One component per file (except small helper components)

```typescript
// Screens (default export)
export default function PacksScreen() {
  // component logic
}

// Components (named export)
export function Button({ variant, children }: ButtonProps) {
  // component logic
}
```

### Hooks Usage
- Group useState declarations at the top
- Follow with useEffect hooks
- Custom hooks after built-in hooks
- Event handlers after hooks

```typescript
export default function Screen() {
  // State
  const [data, setData] = useState<Data[]>([]);
  const [loading, setLoading] = useState(true);

  // Effects
  useEffect(() => {
    // effect logic
  }, [dependencies]);

  // Event handlers
  const handlePress = () => {
    // handler logic
  };

  return (/* JSX */);
}
```

### Async Operations Pattern
Always use the `isMounted` pattern to prevent state updates after unmount:

```typescript
useEffect(() => {
  let isMounted = true;

  const fetchData = async () => {
    try {
      const result = await fetchSomeData();
      if (isMounted) {
        setData(result);
      }
    } catch (err) {
      if (isMounted) {
        setError(err);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  fetchData();

  return () => {
    isMounted = false;
  };
}, [dependencies]);
```

## Naming Conventions

### Files
- Components: PascalCase (e.g., `Button.tsx`, `UserProfile.tsx`)
- Utilities: camelCase (e.g., `teamUtils.ts`, `dateHelpers.ts`)
- Services: camelCase with "Service" suffix (e.g., `packService.ts`)
- Platform-specific: `.ios.tsx`, `.android.tsx`, `.web.ts`

### Variables and Functions
- camelCase for variables and functions
- PascalCase for components and types
- UPPER_SNAKE_CASE for constants
- Prefix booleans with `is`, `has`, `should`
- Prefix event handlers with `handle`

```typescript
// Variables
const userData = await getUser();
const isLoading = true;
const hasPermission = checkPermission();

// Constants
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 5000;

// Event handlers
const handlePress = () => {};
const handleSubmit = async () => {};
```

## Code Organization

### Component Props
Extract props to a separate interface:

```typescript
interface ComponentProps {
  required: string;
  optional?: number;
  onAction: () => void;
}

export function Component({ required, optional = 0, onAction }: ComponentProps) {
  // component logic
}
```

### Destructuring
- Destructure props in function signature
- Destructure hooks where it improves readability
- Avoid deep destructuring (max 2 levels)

```typescript
// Good
export function Component({ title, onPress, children }: Props) {
  const { currentPlayer } = usePlayer();
  const router = useRouter();
}

// Avoid
const { data: { user: { profile: { name } } } } = response;
```

## Error Handling

### Try-Catch Blocks
Always include error handling for async operations:

```typescript
try {
  const data = await fetchData();
  setData(data);
} catch (err) {
  console.error("Failed to fetch data:", err);
  setError("Failed to load data");
}
```

### User-Facing Errors
Provide meaningful error messages to users:

```typescript
setError("Failed to load packs. Please try again.");
// Not: setError(err.message)
```

## Comments and Documentation

### When to Comment
- Complex business logic
- Non-obvious optimizations
- Workarounds for known issues
- Public API interfaces

### When NOT to Comment
- Self-explanatory code
- Obvious variable names
- Standard React patterns

```typescript
// Good - explains WHY
// Fetch progress for each pack separately due to RLS policies
for (const pack of packs) {
  const progress = await getProgress(pack.id);
}

// Unnecessary - explains WHAT (code is self-explanatory)
// Set loading to false
setLoading(false);
```

## Formatting

### Line Length
- Prefer 80-100 characters per line
- Break long lines at logical points

### Spacing
- One blank line between functions
- One blank line between logical sections
- No blank lines at start/end of blocks

### JSX
- One prop per line for 3+ props
- Close tag on same line if single-line
- Close tag on new line if multi-line

```typescript
// Single line
<Button onPress={handlePress}>Click me</Button>

// Multi-line
<Button
  variant="primary"
  onPress={handlePress}
  loading={isLoading}
>
  Submit
</Button>
```
