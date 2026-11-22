import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FKButton } from "@/components/fieldkit";
import { FK, FONT, RADIUS } from "@/constants/fieldKit";

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
    const operators = ["+", "-", "×"];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let result: number;
    let questionText: string;

    switch (operator) {
      case "+": {
        // Addition: numbers 1–20, sum 2–40 — easy for adults
        const a = Math.floor(Math.random() * 20) + 1;
        const b = Math.floor(Math.random() * 20) + 1;
        result = a + b;
        questionText = `${a} + ${b}`;
        break;
      }
      case "-": {
        // Subtraction: larger − smaller so result is never negative (0–19)
        const a = Math.floor(Math.random() * 20) + 1;
        const b = Math.floor(Math.random() * 20) + 1;
        const larger = Math.max(a, b);
        const smaller = Math.min(a, b);
        result = larger - smaller;
        questionText = `${larger} - ${smaller}`;
        break;
      }
      case "×": {
        // Multiplication: 2–10 × 2–10 so result 4–100 — not too large
        const a = Math.floor(Math.random() * 9) + 2;
        const b = Math.floor(Math.random() * 9) + 2;
        result = a * b;
        questionText = `${a} × ${b}`;
        break;
      }
      default: {
        const a = Math.floor(Math.random() * 20) + 1;
        const b = Math.floor(Math.random() * 20) + 1;
        result = a + b;
        questionText = `${a} + ${b}`;
      }
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
        setError("Not quite. Here's another one.");
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
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            {/* Always-visible way out: on small phones the number pad can cover Cancel. */}
            <Pressable onPress={handleCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
              <Ionicons name="close" size={22} color={FK.ink} />
            </Pressable>
            <View style={styles.icon}>
              <Ionicons name="lock-closed" size={26} color={FK.ink} />
            </View>
            <Text style={styles.eyebrow}>FOR GROWN-UPS</Text>
            <Text style={styles.title}>Quick check</Text>
            <Text style={styles.sub}>Grown-ups only past this point. What is:</Text>
            <Text style={styles.question}>{question} = ?</Text>
            <TextInput
              value={answer}
              onChangeText={(t) => {
                setAnswer(t.replace(/[^0-9]/g, ""));
                setError("");
              }}
              keyboardType="number-pad"
              placeholder="Your answer"
              placeholderTextColor="#8C988F"
              style={styles.input}
              autoFocus
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              testID="parent-gate-answer"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <FKButton label="Continue" icon={null} onPress={handleSubmit} loading={loading} style={{ marginTop: 16 }} testID="parent-gate-submit" />
            <FKButton label="Cancel" variant="link" onPress={handleCancel} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  close: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FK.moss,
    zIndex: 2,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(16,37,27,0.6)", justifyContent: "center", padding: 22 },
  card: { backgroundColor: FK.moss, borderRadius: RADIUS.lg, padding: 22 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: FK.sunbeam,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  eyebrow: { fontFamily: FONT.display, fontSize: 12, letterSpacing: 1.6, color: FK.muted },
  title: { fontFamily: FONT.display, fontSize: 28, color: FK.ink, marginTop: 4 },
  sub: { fontFamily: FONT.body, fontSize: 16, color: FK.muted, marginTop: 6 },
  question: { fontFamily: FONT.display, fontSize: 36, color: FK.ink, marginTop: 14, letterSpacing: -0.5 },
  input: {
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: FONT.display,
    fontSize: 22,
    color: FK.ink,
    marginTop: 14,
  },
  error: { fontFamily: FONT.bodyBold, fontSize: 15, color: "#B3261E", marginTop: 10 },
});
