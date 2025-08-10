import React from "react";
import { View, Pressable } from "react-native";
import { PROFILE_COLOR_OPTIONS, getTailwindColorHex } from "@/constants/Colors";

interface ColorPickerProps {
  selectedColor: string; // This will be a hex value from the database
  onColorSelect: (hexColor: string) => void;
  size?: "small" | "medium" | "large";
}

const sizeClasses = {
  small: "w-10 h-10",
  medium: "w-12 h-12",
  large: "w-14 h-14",
};

const borderClasses = {
  selected: "border-4 border-huntly-forest",
  unselected: "border-2 border-huntly-mint",
};

export function ColorPicker({
  selectedColor,
  onColorSelect,
  size = "medium",
}: ColorPickerProps) {
  return (
    <View className="flex-row flex-wrap">
      {PROFILE_COLOR_OPTIONS.map((colorOption) => {
        const hexValue = getTailwindColorHex(colorOption.value);
        const isSelected = selectedColor === hexValue;
        
        return (
          <Pressable
            key={colorOption.value}
            className={`${sizeClasses[size]} rounded-full mr-3 mb-3 ${
              isSelected ? borderClasses.selected : borderClasses.unselected
            } ${colorOption.tailwindClass}`}
            onPress={() => onColorSelect(hexValue)}
            accessibilityLabel={colorOption.label}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          />
        );
      })}
    </View>
  );
}

// Export a variant that works with existing hex values from the database
export function ColorPickerWithHex({
  selectedHexColor,
  onColorSelect,
  size = "medium",
}: {
  selectedHexColor: string;
  onColorSelect: (hexColor: string) => void;
  size?: "small" | "medium" | "large";
}) {
  return (
    <ColorPicker
      selectedColor={selectedHexColor}
      onColorSelect={onColorSelect}
      size={size}
    />
  );
}