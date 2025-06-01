import { StyleSheet, Text } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BaseLayout } from '@/components/layout/BaseLayout';
import { ThemedText } from '@/components/ThemedText';

export default function SocialScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <BaseLayout>
      <ThemedText type="title" style={styles.title}>
        Coming Soon
      </ThemedText>
      <ThemedText style={[styles.subtitle, { opacity: 0.7 }]}>
        Social features are in development
      </ThemedText>
    </BaseLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 