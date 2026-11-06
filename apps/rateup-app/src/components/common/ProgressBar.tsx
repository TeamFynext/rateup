import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";

type ProgressBarProps = {
  /** 0..1. Values outside the range are clamped. */
  progress: number;
  /** Colour of the filled portion. */
  color: string;
  /** Applied to the track. Supply height, radius and background here. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Minimal horizontal progress bar.
 *
 * Replaces react-native-paper's ProgressBar, which was the only import from
 * that library. Paper pulls in a full theming provider and icon set for what
 * is two nested views here.
 */
const ProgressBar = ({ progress, color, style }: ProgressBarProps) => {
  const clamped = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[{ overflow: "hidden", width: "100%" }, style]}
    >
      <View
        style={{
          height: "100%",
          width: `${clamped * 100}%`,
          backgroundColor: color,
          borderRadius: 10,
        }}
      />
    </View>
  );
};

export default ProgressBar;
