# UI/UX Guidelines

## Design System

### Color Palette
The Huntly Club brand uses a nature-inspired color palette:

**Primary Colors:**
- `huntly-amber` (#F5B800) - Primary accent, call-to-action
- `huntly-forest` (#2D5A27) - Primary text, headers
- `huntly-leaf` (#5A8A52) - Buttons, success states

**Secondary Colors:**
- `huntly-sage` (#8BAA86) - Subtle accents
- `huntly-mint` (#D4E7D1) - Backgrounds, highlights
- `huntly-cream` (#F5F5DC) - Main background
- `huntly-brown` (#8B7355) - Secondary text
- `huntly-charcoal` (#3D3D3D) - Dark backgrounds, text

**Usage Guidelines:**
```typescript
// Text
className="text-huntly-forest"      // Primary text
className="text-huntly-brown"       // Secondary text
className="text-huntly-charcoal"    // Dark text on light backgrounds

// Backgrounds
className="bg-huntly-cream"         // Main app background
className="bg-huntly-mint"          // Highlighted sections
className="bg-white"                // Cards, modals

// Accents
className="bg-huntly-amber"         // Primary buttons
className="bg-huntly-leaf"          // Secondary buttons
className="bg-huntly-sage"          // Badges, tags
```

### Typography

#### ThemedText Component
Always use `ThemedText` instead of React Native's `Text`:

```typescript
<ThemedText type="title">Welcome</ThemedText>
<ThemedText type="subtitle">Section Header</ThemedText>
<ThemedText type="defaultSemiBold">Important</ThemedText>
<ThemedText type="body">Regular text</ThemedText>
<ThemedText type="caption">Small text</ThemedText>
```

**Type Definitions:**
- `title` - Large headings (24px, bold)
- `subtitle` - Section headers (18px, semibold)
- `defaultSemiBold` - Emphasized text (16px, semibold)
- `body` / `default` - Body text (16px, regular)
- `caption` - Small text (12px, regular)

#### Text Styling
```typescript
// Combine type with className
<ThemedText type="title" className="text-huntly-forest mb-2">
  Header Text
</ThemedText>

// Custom sizes
<ThemedText className="text-lg font-bold text-huntly-amber">
  Custom Styled
</ThemedText>
```

## Component Patterns

### Buttons

#### Button Component
```typescript
<Button variant="primary" size="large" onPress={handlePress}>
  Submit
</Button>
```

**Variants:**
- `primary` - Main actions (amber background)
- `secondary` - Secondary actions (leaf green)
- `danger` - Destructive actions (red)
- `cancel` - Cancel/dismiss (charcoal)
- `badge` - Badge-related actions (leaf green)

**Sizes:**
- `small` - Compact buttons (px-3 py-1)
- `medium` - Standard buttons (px-4 py-2)
- `large` - Primary actions (h-14 px-6)

**States:**
```typescript
<Button loading={isLoading} disabled={!canSubmit}>
  Submit
</Button>
```

### Cards and Containers

#### Card Pattern
```typescript
<View className="bg-white rounded-2xl p-4 shadow-soft mb-4">
  {/* Card content */}
</View>
```

#### Highlighted Section
```typescript
<View className="bg-huntly-mint rounded-2xl p-4 mb-4">
  {/* Highlighted content */}
</View>
```

### Layout Components

#### BaseLayout
Use for all screens to ensure consistent padding and safe areas:
```typescript
export default function Screen() {
  return (
    <BaseLayout className="bg-huntly-cream">
      <ScrollView>
        {/* Screen content */}
      </ScrollView>
    </BaseLayout>
  );
}
```

#### ThemedView
Use instead of React Native's `View` for theme-aware containers:
```typescript
<ThemedView className="flex-1 p-4">
  {/* Content */}
</ThemedView>
```

## Spacing System

### Margin and Padding
Use consistent spacing scale with NativeWind classes:

```typescript
// Spacing scale (in px):
// 1 = 4px
// 2 = 8px
// 3 = 12px
// 4 = 16px
// 6 = 24px
// 8 = 32px

// Common patterns
className="mb-4"        // Margin bottom (16px)
className="p-4"         // Padding all sides (16px)
className="px-4 py-2"   // Horizontal/vertical padding
className="mb-6"        // Section spacing (24px)
className="mb-8"        // Large section spacing (32px)
```

### Layout Patterns
```typescript
// Screen padding
<BaseLayout className="bg-huntly-cream">
  <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
    <View className="mb-6">
      {/* Content with bottom margin */}
    </View>
  </ScrollView>
</BaseLayout>

// Card spacing
<View className="bg-white rounded-2xl p-4 shadow-soft mb-4">
  {/* 16px internal padding, 16px margin below */}
</View>
```

## Border Radius

### Rounded Corners
```typescript
className="rounded-xl"    // Standard (12px) - buttons, small cards
className="rounded-2xl"   // Large (16px) - cards, containers
className="rounded-full"  // Circle - avatars, badges
```

## Shadows and Elevation

### Shadow Utility
```typescript
className="shadow-soft"   // Subtle shadow for cards
```

Custom shadows for specific needs:
```typescript
// Define in tailwind.config.js
boxShadow: {
  'soft': '0 2px 8px rgba(0, 0, 0, 0.1)',
}
```

## Icons and Emojis

### Icon Usage
- Use emojis for playful, kid-friendly icons
- Use `@expo/vector-icons` for standard UI icons
- Use `IconSymbol` component for platform-specific symbols

```typescript
// Emoji icons
<ThemedText className="text-2xl">🦊</ThemedText>
<ThemedText className="text-2xl">🏆</ThemedText>

// Icon component
<IconSymbol name="chevron.right" size={20} color="#2D5A27" />
```

## Interactive Elements

### Pressable Components
```typescript
<Pressable
  className="bg-white rounded-2xl p-4"
  onPress={handlePress}
>
  {/* Pressable content */}
</Pressable>
```

### Haptic Feedback
Provide haptic feedback for important interactions:
```typescript
import * as Haptics from 'expo-haptics';

const handlePress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // Action logic
};
```

## Loading States

### Activity Indicators
```typescript
{loading ? (
  <View className="flex-1 items-center justify-center">
    <ActivityIndicator size="large" color="#5A8A52" />
  </View>
) : (
  <ContentView />
)}
```

### Loading Buttons
```typescript
<Button loading={isSubmitting} disabled={isSubmitting}>
  {isSubmitting ? "Submitting..." : "Submit"}
</Button>
```

## Empty States

### Pattern
Provide friendly, encouraging empty states:
```typescript
{items.length === 0 ? (
  <View className="bg-white rounded-2xl p-6 items-center shadow-soft">
    <View className="w-16 h-16 bg-huntly-mint/30 rounded-full items-center justify-center mb-4">
      <ThemedText className="text-2xl">🏆</ThemedText>
    </View>
    <ThemedText type="subtitle" className="text-huntly-forest text-center mb-2">
      No items yet
    </ThemedText>
    <ThemedText type="body" className="text-huntly-charcoal text-center">
      Get started by adding your first item!
    </ThemedText>
  </View>
) : (
  <ItemList items={items} />
)}
```

## Progress Indicators

### XP Bar
```typescript
<XPBar
  currentXP={player.xp}
  level={player.level}
  className="mb-6"
/>
```

### Progress Bar
```typescript
<PackProgressBar
  percentage={completionPercentage}
  showCompletionBadge={isComplete}
  className="mt-2"
/>
```

## Modals and Overlays

### Modal Pattern
```typescript
<Modal
  visible={isVisible}
  transparent
  animationType="slide"
  onRequestClose={onClose}
>
  <View className="flex-1 bg-black/50 justify-end">
    <View className="bg-white rounded-t-3xl p-6">
      {/* Modal content */}
    </View>
  </View>
</Modal>
```

## Animations

### Transitions
Use React Native Reanimated for smooth animations:
```typescript
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';

<Animated.View entering={FadeIn} exiting={SlideInRight}>
  {/* Animated content */}
</Animated.View>
```

## Accessibility

### Guidelines
- Use semantic component names
- Provide accessible labels
- Ensure sufficient color contrast
- Support dynamic type sizes
- Test with screen readers

```typescript
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Submit form"
  accessibilityHint="Double tap to submit the form"
>
  <ThemedText>Submit</ThemedText>
</Pressable>
```

## Responsive Design

### Layout Flexibility
Use Flexbox for responsive layouts:
```typescript
<View className="flex-row items-center justify-between">
  <View className="flex-1">
    {/* Flexible content */}
  </View>
  <View>
    {/* Fixed content */}
  </View>
</View>
```

### Safe Areas
Always respect safe areas:
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView edges={['top', 'bottom']}>
  {/* Content */}
</SafeAreaView>
```

## Platform-Specific UI

### Platform Detection
```typescript
import { Platform } from 'react-native';

const isIOS = Platform.OS === 'ios';

<View className={`rounded-2xl ${isIOS ? 'shadow-soft' : 'elevation-4'}`}>
  {/* Platform-specific styling */}
</View>
```

### Platform Files
Create platform-specific files when needed:
- `Component.ios.tsx` - iOS implementation
- `Component.android.tsx` - Android implementation
- `Component.tsx` - Default/shared implementation
