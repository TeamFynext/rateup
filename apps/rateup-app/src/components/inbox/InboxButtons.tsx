import { useColorScheme } from "nativewind";
import { View, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Filter } from "lucide-react-native";

const InboxButtons = ({
  activeFilterCount = 0,
}: {
  activeFilterCount?: number;
}) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark
    ? "rgba(255,255,255,0.85)"
    : "rgba(255,255,255,0.88)";

  return (
    <View className="relative ml-2">
      <Pressable
        onPress={() => router.push("/protected/inbox/Filters")}
        className="relative"
      >
        <View className="p-1">
          <Filter size={20} color={iconColor} />
        </View>
        {activeFilterCount > 0 && (
          <View className="absolute top-1 right-1 bg-red-500 rounded-full min-w-[14px] h-[14px] px-0.5 items-center justify-center">
            <Text className="text-white text-[8px] font-bold">
              {activeFilterCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default InboxButtons;
