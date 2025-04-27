import React, { useState } from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemedView } from '@/components/ThemedView';
import { LoginForm } from '@/components/authentication/LoginForm';
import { SignUpForm } from '@/components/authentication/SignUpForm';

enum AuthMode {
  LOGIN,
  SIGNUP,
}

export default function AuthScreen() {
  const [mode, setMode] = useState(AuthMode.LOGIN);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <Stack.Screen options={{ title: 'Authentication', headerShown: false }} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {mode === AuthMode.LOGIN ? (
            <LoginForm onCreateAccount={() => setMode(AuthMode.SIGNUP)} />
          ) : (
            <SignUpForm onLoginInstead={() => setMode(AuthMode.LOGIN)} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
}); 