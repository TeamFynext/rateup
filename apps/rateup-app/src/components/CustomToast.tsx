import { View, Text, TouchableOpacity } from "react-native";
import { CheckCircle, Info, AlertTriangle, X } from "lucide-react-native";

type ToastType = "success" | "info" | "warning" | "danger";

interface CustomToastProps {
  title?: string;
  message: string;
  type?: ToastType;
  onClose?: () => void;
}

export const CustomToast = ({
  title,
  message,
  type = "info",
  onClose,
}: CustomToastProps) => {
  const getToastStyles = () => {
    switch (type) {
      case "success":
        return {
          defaultTitle: "Success",
          borderColor: "border-l-green-500",
          bg: "bg-white",
          icon: <CheckCircle color="#22c55e" size={24} />,
          textColor: "text-green-700",
        };
      case "danger":
        return {
          defaultTitle: "Error",
          borderColor: "border-l-red-500",
          bg: "bg-white",
          icon: <X color="#ef4444" size={24} />,
          textColor: "text-red-700",
        };
      case "warning":
        return {
          defaultTitle: "Warning",
          borderColor: "border-l-yellow-500",
          bg: "bg-white",
          icon: <AlertTriangle color="#facc15" size={24} />,
          textColor: "text-yellow-700",
        };
      default:
        return {
          defaultTitle: "Info",
          borderColor: "border-l-blue-500",
          bg: "bg-white",
          icon: <Info color="#3b82f6" size={24} />,
          textColor: "text-blue-700",
        };
    }
  };

  const { borderColor, bg, icon, textColor, defaultTitle } = getToastStyles();
  const resolvedTitle = title || defaultTitle;

  return (
    <View
      className={`flex-row items-center rounded-xl px-4 py-3 self-center border-l-4 shadow-md ${borderColor} ${bg} max-w-[95%]`}
    >
      {/* Icon */}
      <View className="mr-3 justify-center">{icon}</View>

      {/* Text Content */}
      <View className="flex-1 justify-center">
        <Text className={`font-semibold text-base ${textColor}`}>
          {resolvedTitle}
        </Text>
        <Text className="text-sm text-gray-600">{message}</Text>
      </View>

      {/* Close Button */}
      {onClose && (
        <TouchableOpacity onPress={onClose} className="ml-3 justify-center">
          <X color="#9ca3af" size={20} />
        </TouchableOpacity>
      )}
    </View>
  );
};
