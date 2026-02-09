import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";

interface ParentPinModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ParentPinModal({
  visible,
  onSuccess,
  onCancel,
}: ParentPinModalProps) {
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateMathQuestion = () => {
    const num1 = Math.floor(Math.random() * 20) + 1; // 1-20
    const num2 = Math.floor(Math.random() * 20) + 1; // 1-20
    const operators = ["+", "-", "×"];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let result: number;
    let questionText: string;

    switch (operator) {
      case "+":
        result = num1 + num2;
        questionText = `${num1} + ${num2}`;
        break;
      case "-":
        result = num1 - num2;
        questionText = `${num1} - ${num2}`;
        break;
      case "×":
        result = num1 * num2;
        questionText = `${num1} × ${num2}`;
        break;
      default:
        result = num1 + num2;
        questionText = `${num1} + ${num2}`;
    }

    setQuestion(questionText);
    setCorrectAnswer(result);
  };

  useEffect(() => {
    if (visible) {
      generateMathQuestion();
      setAnswer("");
      setError("");
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!answer.trim()) {
      setError("Please enter an answer");
      return;
    }

    const userAnswer = parseInt(answer.trim());
    if (isNaN(userAnswer)) {
      setError("Please enter a valid number");
      return;
    }

    setLoading(true);
    setError("");

    // Simulate a small delay for better UX
    setTimeout(() => {
      setLoading(false);

      if (userAnswer === correctAnswer) {
        onSuccess();
      } else {
        setError("Wrong answer. Please try again.");
        setAnswer("");
        generateMathQuestion();
      }
    }, 500);
  };

  const handleCancel = () => {
    setAnswer("");
    setError("");
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <ThemedView className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-soft">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-huntly-mint rounded-full items-center justify-center mb-4">
                <ThemedText className="text-huntly-forest text-2xl">
                  🔒
                </ThemedText>
              </View>
              <ThemedText
                type="title"
                className="text-huntly-forest text-center mb-2"
              >
                Parent Access Required
              </ThemedText>
              <ThemedText
                type="body"
                className="text-huntly-charcoal text-center"
              >
                Please solve this math problem to access the parents dashboard
              </ThemedText>
            </View>

            <View className="bg-huntly-cream rounded-xl p-4 mb-6">
              <ThemedText
                type="body"
                className="text-huntly-charcoal text-center mb-2"
              >
                What is:
              </ThemedText>
              <ThemedText
                type="title"
                className="text-huntly-forest text-center text-2xl"
              >
                {question} = ?
              </ThemedText>
            </View>

            <TextInput
              className={`h-14 mb-4 border-2 rounded-xl px-4 bg-huntly-cream text-huntly-forest text-center text-xl font-bold ${
                error ? "border-red-500" : "border-huntly-mint"
              }`}
              placeholder="Enter your answer"
              placeholderTextColor="#8B4513"
              value={answer}
              onChangeText={(text) => {
                setAnswer(text);
                setError(""); // Clear error when user types
              }}
              keyboardType="numeric"
              autoFocus={true}
              onSubmitEditing={handleSubmit}
            />

            {/* Error Message */}
            {error && (
              <View className="mb-4 bg-red-50 rounded-xl p-3 border border-red-200">
                <ThemedText type="caption" className="text-red-600 text-center">
                  {error}
                </ThemedText>
              </View>
            )}

            <View className="flex-row space-x-3">
              <Button
                variant="secondary"
                size="large"
                onPress={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="large"
                onPress={handleSubmit}
                loading={loading}
                className="flex-1"
              >
                Submit
              </Button>
            </View>
          </ThemedView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
