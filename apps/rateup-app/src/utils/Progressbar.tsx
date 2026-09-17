import React from "react";
import { View } from "react-native";

type Props = {
  progress: number; // value from 0 to 100
  barColor?: string;
  bgColor?: string;
};

const ProgressBar = ({
  progress,
  barColor = "#22c55e", // default green
  bgColor = "#e5e7eb", // default gray-200
}: Props) => {
  return (
    <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: bgColor }}>
      <View
        className="h-full"
        style={{
          width: `${progress}%`,
          backgroundColor: barColor,
        }}
      />
    </View>
  );
};

export default ProgressBar;
