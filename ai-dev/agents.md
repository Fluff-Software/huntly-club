# Huntly World - Project Overview

## About the Project

Huntly World is a mobile application built with React Native and Expo that provides an interactive platform for outdoor activities and adventures. The app is designed for families and children to explore nature through gamified activity packs, earn badges, and track progress.

## Tech Stack

### Frontend
- **React Native** (0.76.9) - Cross-platform mobile development
- **Expo** (~52.0.46) - React Native development platform
- **Expo Router** (~4.0.20) - File-based routing system
- **TypeScript** (^5.3.3) - Type-safe JavaScript
- **NativeWind** (^4.1.23) - Tailwind CSS for React Native

### Backend
- **Supabase** (^2.49.4) - Backend-as-a-Service (authentication, database, storage)
- PostgreSQL database with generated TypeScript types

### Key Libraries
- **React Navigation** - Bottom tabs and navigation patterns
- **React Native Reanimated** (^3.16.2) - Animations
- **React Native Gesture Handler** (~2.20.2) - Touch gestures
- **Expo Image Picker** (~16.0.6) - Image selection
- **Expo Haptics** (~14.0.1) - Haptic feedback

## Project Structure

```
huntly-club/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab-based navigation routes
│   ├── auth/              # Authentication flows
│   ├── profile/           # Profile management
│   └── _layout.tsx        # Root layout
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Layout components
│   └── authentication/   # Auth-related components
├── services/             # Business logic layer
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── models/               # TypeScript types and interfaces
│   └── supabase.ts      # Generated Supabase types
├── utils/                # Utility functions
├── constants/            # App constants
├── supabase/             # Supabase configuration
│   ├── migrations/       # Database migrations
│   └── seed/            # Initial data
└── ai-dev/              # AI development guidelines
    ├── rules/           # Development rules
    ├── prompts/         # Reusable prompts
    └── schema/          # Agent schemas
```

## Core Features

### Activity Packs
- Curated collections of outdoor activities
- Progress tracking per pack
- Badge rewards for completion

### User Profiles
- Multiple child profiles per account
- XP and leveling system
- Avatar customization
- Badge collection

### Gamification
- XP points for completed activities
- Badge system with multiple tiers
- Progress visualization
- Reactions and social features

### Team Activities
- Team-based challenges
- Activity logs with reactions
- Parent oversight functionality
- PIN-protected parent views

## Development Workflow

### Local Development Setup
1. Start Supabase locally: `supabase start`
2. Configure `.env` with Supabase credentials
3. Install development build on device/simulator
4. Start Expo: `npx expo start`

### Database Changes
1. Make changes in Supabase UI
2. Generate migration: `supabase db diff --local --file <name>`
3. Reset database: `supabase db reset` (if needed)
4. Regenerate types: `supabase gen types typescript --local > models/supabase.ts`
5. Seed data: `docker exec -i supabase_db_huntly-club psql -U postgres -d postgres < supabase/seed/initial_data.sql`

## Design System

### Color Palette
Custom "Huntly" brand colors:
- `huntly-amber` - Primary accent (yellow/gold)
- `huntly-forest` - Dark green for text
- `huntly-leaf` - Medium green for buttons
- `huntly-sage` - Light green
- `huntly-mint` - Very light green
- `huntly-cream` - Off-white background
- `huntly-brown` - Brown accent
- `huntly-charcoal` - Dark gray

### Component Patterns
- Themed components for consistent styling
- Platform-specific implementations (.ios.tsx, .web.ts)
- Reusable UI components in `components/ui/`
- Layout wrappers (BaseLayout) for consistent structure

## Key Concepts

### Service Layer
Business logic is separated into service files:
- `packService.ts` - Activity pack management
- `badgeService.ts` - Badge earning and display
- `activityProgressService.ts` - Progress tracking
- Authentication services for user management

### Context API
Global state management using React Context:
- `PlayerContext` - Current player/profile state
- Refresh mechanisms for data synchronization

### Type Safety
- Generated Supabase types from database schema
- TypeScript interfaces for all components
- Strict type checking enabled

## AI Development Guidelines

For detailed development rules, coding standards, and patterns, refer to:
- `ai-dev/rules/` - Modular development rules
- `ai-dev/prompts/` - Reusable prompt templates
- `ai-dev/schema/` - Claude agent schemas
