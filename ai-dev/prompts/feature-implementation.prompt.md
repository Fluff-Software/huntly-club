# Feature Implementation Prompt

You are implementing a new feature for the Huntly World application. Follow the established patterns and guidelines to ensure consistency and quality.

## Implementation Process

### 1. Requirements Analysis
- [ ] Understand the feature requirements
- [ ] Identify affected components and services
- [ ] Plan database schema changes (if needed)
- [ ] Consider user experience and edge cases
- [ ] Identify dependencies and integrations

### 2. Planning
- [ ] Design the solution architecture
- [ ] Identify components to create/modify
- [ ] Plan service layer changes
- [ ] Design data models
- [ ] Consider performance implications
- [ ] Plan testing strategy

### 3. Database Changes (if needed)
Follow the Supabase workflow in `ai-dev/rules/supabase.md`:
1. Make schema changes in Supabase UI
2. Generate migration: `supabase db diff --local --file <name>`
3. Review and test migration
4. Regenerate types: `supabase gen types typescript --local > models/supabase.ts`
5. Update RLS policies if needed

### 4. Service Layer
Create or update service functions:
- [ ] Create service file in `services/`
- [ ] Export typed functions
- [ ] Handle errors appropriately
- [ ] Use generated Supabase types
- [ ] Write service tests

```typescript
// services/newFeatureService.ts
import { supabase } from '@/lib/supabase';
import { Database } from '@/models/supabase';

type Feature = Database['public']['Tables']['features']['Row'];

export async function getFeatures(): Promise<Feature[]> {
  const { data, error } = await supabase
    .from('features')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch features:', error);
    throw new Error('Failed to load features');
  }

  return data;
}

export async function createFeature(
  featureData: Database['public']['Tables']['features']['Insert']
): Promise<Feature> {
  const { data, error } = await supabase
    .from('features')
    .insert(featureData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create feature:', error);
    throw new Error('Failed to create feature');
  }

  return data;
}
```

### 5. UI Components
Create reusable components in `components/`:
- [ ] Define TypeScript interfaces for props
- [ ] Use ThemedText/ThemedView
- [ ] Follow design system (colors, spacing)
- [ ] Implement loading and error states
- [ ] Add accessibility labels
- [ ] Make responsive

```typescript
// components/FeatureCard.tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

interface FeatureCardProps {
  feature: Feature;
  onPress: (id: number) => void;
}

export function FeatureCard({ feature, onPress }: FeatureCardProps) {
  return (
    <Pressable
      className="bg-white rounded-2xl p-4 shadow-soft mb-4"
      onPress={() => onPress(feature.id)}
      accessibilityRole="button"
      accessibilityLabel={`View ${feature.name}`}
    >
      <ThemedText type="defaultSemiBold" className="text-huntly-forest mb-2">
        {feature.name}
      </ThemedText>
      <ThemedText type="body" className="text-huntly-charcoal">
        {feature.description}
      </ThemedText>
    </Pressable>
  );
}
```

### 6. Screen Implementation
Create or update screen in `app/`:
- [ ] Use BaseLayout for consistency
- [ ] Implement data fetching with proper patterns
- [ ] Add loading and error states
- [ ] Handle user interactions
- [ ] Add navigation
- [ ] Follow isMounted pattern for async

```typescript
// app/(tabs)/features.tsx
import React, { useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BaseLayout } from '@/components/layout/BaseLayout';
import { ThemedText } from '@/components/ThemedText';
import { FeatureCard } from '@/components/FeatureCard';
import { getFeatures } from '@/services/featureService';
import type { Feature } from '@/models/supabase';

export default function FeaturesScreen() {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchFeatures = async () => {
      try {
        const data = await getFeatures();
        if (isMounted) {
          setFeatures(data);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load features');
        }
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFeatures();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFeaturePress = (id: number) => {
    router.push(`/features/${id}`);
  };

  if (loading) {
    return (
      <BaseLayout className="bg-huntly-cream">
        <View className="flex-1 items-center justify-center">
          <ThemedText>Loading features...</ThemedText>
        </View>
      </BaseLayout>
    );
  }

  if (error) {
    return (
      <BaseLayout className="bg-huntly-cream">
        <View className="flex-1 items-center justify-center">
          <ThemedText className="text-red-500">{error}</ThemedText>
        </View>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout className="bg-huntly-cream">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText type="title" className="text-huntly-forest mb-6">
          Features
        </ThemedText>

        {features.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center">
            <ThemedText type="body" className="text-huntly-charcoal">
              No features available
            </ThemedText>
          </View>
        ) : (
          features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onPress={handleFeaturePress}
            />
          ))
        )}
      </ScrollView>
    </BaseLayout>
  );
}
```

### 7. Custom Hooks (if needed)
Extract complex logic into custom hooks:
```typescript
// hooks/useFeatures.ts
export function useFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFeatures();
      setFeatures(data);
      setError(null);
    } catch (err) {
      setError('Failed to load features');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { features, loading, error, refresh };
}
```

### 8. Testing
Write comprehensive tests:
- [ ] Service layer tests
- [ ] Component tests
- [ ] Hook tests (if applicable)
- [ ] Integration tests
- [ ] Edge case tests

### 9. Documentation
Update documentation:
- [ ] Add comments for complex logic
- [ ] Update README if needed
- [ ] Document new API endpoints
- [ ] Add inline JSDoc for public APIs

## Best Practices Checklist

### Code Quality
- [ ] Follows TypeScript best practices
- [ ] Uses proper type definitions
- [ ] No `any` types
- [ ] Clear variable and function names
- [ ] Proper error handling
- [ ] No code duplication

### Architecture
- [ ] Separation of concerns (UI, services, data)
- [ ] Business logic in services
- [ ] No direct Supabase calls in components
- [ ] Proper use of contexts for global state

### UI/UX
- [ ] Follows design system
- [ ] Uses Huntly color palette
- [ ] Consistent spacing and layout
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Accessibility labels

### Performance
- [ ] No unnecessary re-renders
- [ ] Proper use of useMemo/useCallback
- [ ] FlatList for long lists
- [ ] Optimized images
- [ ] Efficient queries

### Security
- [ ] No hardcoded secrets
- [ ] Input validation
- [ ] Proper authentication checks
- [ ] RLS policies in place

## Implementation Checklist

### Planning Phase
- [ ] Requirements understood
- [ ] Solution designed
- [ ] Database schema planned
- [ ] UI mockup/design reviewed

### Development Phase
- [ ] Database migration created
- [ ] Types regenerated
- [ ] Service layer implemented
- [ ] Components created
- [ ] Screen implemented
- [ ] Navigation configured

### Quality Assurance
- [ ] Tests written and passing
- [ ] Code reviewed
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Performance tested

### Documentation
- [ ] Comments added
- [ ] README updated
- [ ] Types documented
- [ ] Examples provided

## Common Pitfalls to Avoid

❌ **Don't:**
- Skip error handling
- Forget loading states
- Use `any` types
- Put business logic in components
- Forget cleanup in useEffect
- Ignore accessibility
- Skip tests
- Hardcode values

✅ **Do:**
- Handle all error cases
- Show loading indicators
- Use proper types
- Keep components focused on UI
- Clean up side effects
- Add accessibility labels
- Write tests
- Use constants for magic values

## Output Requirements

Provide:
1. **Complete implementation** of the feature
2. **All necessary files** (services, components, screens)
3. **Database migrations** if needed
4. **Tests** for critical functionality
5. **Documentation** explaining the feature
6. **Usage examples** showing how to use the feature
