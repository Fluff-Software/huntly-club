import React from "react";
import { Pressable, ActivityIndicator, PressableProps } from "react-native";
import { ThemedText } from "@/components/ThemedText";

type ButtonVariant = "primary" | "secondary" | "danger" | "cancel" | "badge";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps extends Omit<PressableProps, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  primary: "bg-huntly-amber",
  secondary: "bg-huntly-leaf",
  danger: "bg-red-500",
  cancel: "bg-huntly-charcoal",
  badge: "bg-huntly-leaf",
};

const sizeStyles = {
  small: "px-3 py-1",
  medium: "px-4 py-2",
  large: "h-14 px-6",
};

const textColorByVariant = {
  primary: "text-huntly-forest",
  secondary: "text-white",
  danger: "text-white",
  cancel: "text-white",
  badge: "text-white",
};

const loadingColorByVariant = {
  primary: "#2D5A27",
  secondary: "#FFFFFF",
  danger: "#FFFFFF",
  cancel: "#FFFFFF",
  badge: "#FFFFFF",
};

const textSizeByButtonSize = {
  small: "caption",
  medium: "default",
  large: "default",
} as const;

export function Button({
  variant = "primary",
  size = "large",
  loading = false,
  disabled = false,
  children,
  className = "",
  ...pressableProps
}: ButtonProps) {
  const baseStyles = "rounded-xl justify-center items-center shadow-soft";
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const combinedClassName = `${baseStyles} ${variantStyle} ${sizeStyle} ${className}`;
  const textColor = textColorByVariant[variant];
  const loadingColor = loadingColorByVariant[variant];
  const textSize = textSizeByButtonSize[size];

  return (
    <Pressable
      className={combinedClassName}
      disabled={disabled || loading}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={loadingColor} />
      ) : (
        <ThemedText
          type={textSize === "caption" ? "caption" : undefined}
          className={`${textColor} font-bold font-jua ${
            size === "large" ? "text-lg" : size === "small" ? "text-sm" : ""
          }`}
        >
          {children}
        </ThemedText>
      )}
    </Pressable>
  );
}