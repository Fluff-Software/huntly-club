# Repository Structure

## Directory Layout

```
huntly-club/
├── app/                          # Expo Router - Screen components
│   ├── (tabs)/                  # Tab navigation group
│   │   ├── index.tsx           # Home screen (packs)
│   │   ├── profile.tsx         # Profile screen
│   │   ├── social.tsx          # Social screen
│   │   ├── parents.tsx         # Parents view
│   │   ├── pack/               # Pack-related routes
│   │   │   ├── [id].tsx       # Pack detail
│   │   │   └── activity/      # Activity routes
│   │   │       ├── [id].tsx   # Activity detail
│   │   │       └── _layout.tsx
│   │   └── _layout.tsx        # Tabs layout
│   ├── auth/                   # Authentication flows
│   │   ├── confirm.tsx        # Email confirmation
│   │   └── ...
│   ├── profile/                # Profile management
│   │   ├── create.tsx         # Create profile
│   │   ├── [id].tsx           # Profile detail
│   │   └── _layout.tsx
│   ├── _layout.tsx             # Root layout (providers)
│   ├── +not-found.tsx          # 404 page
│   ├── auth.tsx                # Auth screen
│   ├── parents.tsx             # Parents standalone
│   └── subscription.tsx        # Subscription flow
│
├── components/                  # Reusable components
│   ├── ui/                     # UI primitives
│   │   ├── Button.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── IconSymbol.tsx
│   │   ├── IconSymbol.ios.tsx  # Platform-specific
│   │   └── TabBarBackground.tsx
│   ├── layout/                 # Layout components
│   │   └── BaseLayout.tsx
│   ├── authentication/         # Auth components
│   │   ├── AuthGuard.tsx
│   │   ├── LoginForm.tsx
│   │   └── SignUpForm.tsx
│   ├── ThemedText.tsx          # Themed components
│   ├── ThemedView.tsx
│   ├── XPBar.tsx               # Feature components
│   ├── PackProgressBar.tsx
│   ├── TeamActivityLog.tsx
│   ├── BadgeDetailModal.tsx
│   ├── CategoryTags.tsx
│   └── __tests__/              # Component tests
│       └── ThemedText-test.tsx
│
├── services/                    # Business logic layer
│   ├── packService.ts          # Pack-related operations
│   ├── badgeService.ts         # Badge operations
│   ├── activityProgressService.ts
│   └── __tests__/              # Service tests
│
├── contexts/                    # React Context providers
│   └── PlayerContext.tsx       # Player state management
│
├── hooks/                       # Custom React hooks
│   ├── useColorScheme.ts
│   ├── useColorScheme.web.ts   # Platform-specific
│   ├── useThemeColor.ts
│   └── __tests__/              # Hook tests
│
├── utils/                       # Utility functions
│   ├── teamUtils.ts
│   ├── categoryUtils.ts
│   └── __tests__/              # Utility tests
│
├── models/                      # TypeScript types
│   └── supabase.ts             # Generated Supabase types
│
├── constants/                   # App constants
│   └── Colors.ts               # Color definitions
│
├── assets/                      # Static assets
│   ├── fonts/
│   ├── images/
│   └── icons/
│
├── supabase/                    # Supabase configuration
│   ├── config.toml             # Supabase config
│   ├── migrations/             # Database migrations
│   │   └── YYYYMMDDHHMMSS_description.sql
│   ├── seed/                   # Seed data
│   │   └── initial_data.sql
│   └── functions/              # Edge functions
│
├── ai-dev/                      # AI development docs
│   ├── rules/                  # Development rules
│   ├── prompts/                # Prompt templates
│   ├── schema/                 # Agent schemas
│   └── agents.md                # AI agent root spec
│   └── guide.md                # Usage guide
│
├── scripts/                     # Build/utility scripts
│   └── reset-project.js
│
├── .expo/                       # Expo generated files
├── node_modules/                # Dependencies
│
├── .gitignore                   # Git ignore rules
├── .env                         # Environment variables (not committed)
├── .env.example                 # Environment template
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript config
├── tailwind.config.js           # Tailwind configuration
├── babel.config.js              # Babel configuration
├── app.json                     # Expo configuration
├── expo-env.d.ts                # Expo type definitions
├── README.md                    # Project documentation
└── Makefile                     # Build commands
```

## File Naming Conventions

### Components
- **PascalCase** for component files: `Button.tsx`, `UserProfile.tsx`
- **Platform suffixes**: `.ios.tsx`, `.android.tsx`, `.web.tsx`
- **Test files**: `ComponentName.test.tsx` in `__tests__/` directory

### Utilities and Services
- **camelCase** for utility files: `dateUtils.ts`, `stringHelpers.ts`
- **Service suffix**: `packService.ts`, `authService.ts`
- **Test files**: `fileName.test.ts` in `__tests__/` directory

### Routes (Expo Router)
- **kebab-case** or **camelCase** for route files
- **[param].tsx** for dynamic routes
- **(group)** for route groups
- **_layout.tsx** for layout routes
- **+not-found.tsx** for error pages

## Import Aliases

### Path Aliases
Configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Usage
```typescript
// Good - absolute import with alias
import { Button } from '@/components/ui/Button';
import { getPacks } from '@/services/packService';
import { ThemedText } from '@/components/ThemedText';

// Avoid - relative imports for cross-directory
import { Button } from '../../../components/ui/Button';
```

## Module Organization

### Service Files
One service per domain:
```typescript
// services/packService.ts
export async function getPacks() { ... }
export async function getPackById(id: number) { ... }
export async function createPack(data: CreatePackData) { ... }
```

### Utility Files
Group related utilities:
```typescript
// utils/dateUtils.ts
export function formatDate(date: string) { ... }
export function calculateAge(birthDate: string) { ... }
export function isToday(date: string) { ... }
```

### Component Files
One component per file (with small helper components):
```typescript
// components/ui/Button.tsx
type ButtonVariant = "primary" | "secondary";

interface ButtonProps {
  variant?: ButtonVariant;
  // ...
}

export function Button({ variant, ...props }: ButtonProps) {
  // component logic
}
```

## Configuration Files

### Environment Variables
- **`.env`** - Local environment (not committed)
- **`.env.example`** - Template for environment variables

```bash
# .env.example
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-key
```

### TypeScript Configuration
```json
// tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'huntly-amber': '#F5B800',
        'huntly-forest': '#2D5A27',
        // ...
      },
    },
  },
}
```

## Asset Organization

### Images
```
assets/
├── images/
│   ├── logo.png
│   ├── logo@2x.png
│   ├── logo@3x.png
│   └── backgrounds/
```

### Fonts
```
assets/
├── fonts/
│   ├── SpaceMono-Regular.ttf
│   └── CustomFont.ttf
```

## Platform-Specific Code

### Platform Files
Create platform-specific implementations:
```
components/
├── IconSymbol.tsx         # Default/fallback
├── IconSymbol.ios.tsx     # iOS-specific
└── IconSymbol.android.tsx # Android-specific
```

### Platform Checks
```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'ios') {
  // iOS-specific code
}

if (Platform.OS === 'android') {
  // Android-specific code
}
```

## Git Workflow

### Branch Naming
- `main` - Production-ready code
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/component-name` - Refactoring

### Commit Messages
Follow conventional commits:
```
feat: add badge detail modal
fix: resolve XP calculation bug
refactor: extract pack service logic
docs: update README with setup instructions
test: add pack service tests
```

### What Not to Commit
```
# .gitignore
.env
.expo/
node_modules/
dist/
*.log
.DS_Store
```

## Dependency Management

### Package Organization
```json
{
  "dependencies": {
    // Production dependencies
    "expo": "~52.0.46",
    "react-native": "0.76.9"
  },
  "devDependencies": {
    // Development dependencies
    "@types/react": "~18.3.12",
    "typescript": "^5.3.3"
  }
}
```

### Adding Dependencies
```bash
# Add production dependency
npm install package-name

# Add dev dependency
npm install -D package-name

# Update dependencies
npm update
```

## Code Ownership

### Critical Files
Files that require careful changes:
- `app/_layout.tsx` - Root layout and providers
- `models/supabase.ts` - Generated types (regenerate, don't edit)
- `supabase/migrations/*` - Database migrations (never modify)
- `package.json` - Dependency manifest

### Safe to Modify
- Individual screen files
- Component implementations
- Service functions
- Utility functions
- Styling and UI

## Documentation

### README Files
- Root `README.md` - Project overview and setup
- Service `README.md` - Complex service documentation
- Component `README.md` - Component library docs

### Inline Documentation
- JSDoc for public APIs
- Comments for complex logic
- Type definitions serve as documentation
