import React, { useState } from 'react';
import { StyleSheet, TextInput, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

type SignUpFormProps = {
  onLoginInstead: () => void;
};

export function SignUpForm({ onLoginInstead }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signUp, loading } = useAuth();

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      await signUp(email, password);
      setSuccessMessage(`Account created! A confirmation link has been sent to ${email}. Please check your email to verify your account.`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    }
  };

  if (successMessage) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Check Your Email
        </ThemedText>
        
        <ThemedText style={styles.successMessage}>
          {successMessage}
        </ThemedText>
        
        <ThemedText style={[styles.successMessage, styles.emailNote]}>
          If you don't see the email, check your spam folder.
        </ThemedText>
        
        <Pressable style={styles.button} onPress={onLoginInstead}>
          <ThemedText style={styles.buttonText}>Back to Login</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Create Account
      </ThemedText>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <Pressable 
        style={styles.button} 
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Create Account</ThemedText>
        )}
      </Pressable>

      <Pressable onPress={onLoginInstead}>
        <ThemedText style={styles.link}>
          Already have an account? Sign in
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderRadius: 8,
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    height: 50,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#0284c7',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  link: {
    textAlign: 'center',
    marginTop: 8,
    color: '#0284c7',
  },
  successMessage: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emailNote: {
    fontStyle: 'italic',
    opacity: 0.7,
    marginBottom: 32,
  },
}); 