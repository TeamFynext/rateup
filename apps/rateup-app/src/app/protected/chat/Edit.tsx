import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  useColorScheme,
} from "react-native";
import ToggleSwitch from "toggle-switch-react-native";
import { ArrowLeft, ChevronDown, ChevronUp, User } from "lucide-react-native";
import { countries } from "@/constants/countries";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  editContactById,
  getContactById,
} from "@/api/inbox/contacts/contacts.api";
import { convertFullPhoneNumToCoutryCodeAndNationalNum } from "@/utils/phoneNumConvert";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

export default function EditContacts() {
  const { contactId }: { contactId: string } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [isAiChatActive, setIsAiChatActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (phone && selectedCountry) {
      const formatted = selectedCountry.dial_code + phone.replace(/^0+/, "");
      setFullPhoneNumber(formatted.replace("+", ""));
    }
  }, [phone, selectedCountry]);

  const handleSelectCountry = (country: any) => {
    setSelectedCountry(country);
    setShowDropdown(false);
  };

  const handleEdit = async () => {
    try {
      setLoading(true);
      await editContactById(contactId, {
        name,
        aiWaChat: isAiChatActive,
        phone: fullPhoneNumber,
      });
      setLoading(false);
      setMessage("Successfully Updated");
    } catch (error) {
      setError("Failed to update contact details. Please try again.");
      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  const getContactDetails = async () => {
    setLoading(true);
    try {
      const res = await getContactById(contactId);
      setIsAiChatActive(res.aiWaChat);

      const numbers = convertFullPhoneNumToCoutryCodeAndNationalNum(
        `+${res.phone}`,
      );
      setPhone(numbers.national_number);

      const matchingCountry = countries.find(
        (country) => country.dial_code === `+${numbers.country_code}`,
      );

      if (matchingCountry) {
        setSelectedCountry(matchingCountry);
      }

      setName(res.name);

      setError("");
    } catch (err) {
      setError("Failed to load contact details. Please try again.");

      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    getContactDetails();
  }, [contactId]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handleSelectCountry(item)}
      style={{ backgroundColor: isDark ? Colors.dark.surface : "white" }}
      className="flex-row items-center px-3 py-3"
    >
      <Text style={{ color: isDark ? Colors.dark.textPrimary : "black" }} className="mr-2">{item.flag}</Text>
      <Text style={{ color: isDark ? Colors.dark.textPrimary : "black" }} className="mr-2">{item.name}</Text>
      <Text style={{ color: isDark ? Colors.dark.textMuted : "#7A8289" }} className="text-sm">{item.dial_code}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ backgroundColor: isDark ? Colors.dark.bg : "white" }} className="flex-grow">
      <View className="flex-1 p-4">
        {/* Top Part */}
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center mb-8 gap-2">
            <Pressable onPress={() => router.back()}>
              <ArrowLeft color={isDark ? Colors.dark.textPrimary : "black"} />
            </Pressable>
            <Text style={{ color: isDark ? Colors.dark.textPrimary : "black" }} className="text-2xl font-bold">Edit</Text>
          </View>

          {/* Error / Success Message */}
          {(error || message) && (
            <View
              className="mb-4 p-3 rounded-lg"
              style={{ backgroundColor: error ? "#ffe5e5" : "#e5fff0" }}
            >
              <Text
                className={`text-sm ${
                  error ? "text-[#cc0000]" : "text-[#007e33]"
                }`}
              >
                {error || message}
              </Text>
            </View>
          )}

          {/* Name Input */}
          <View className="mb-6">
            <Text className="text-[#7A8289] mb-2 text-base">
              Name <Text className="text-[#CC292C]">*</Text>
            </Text>
            <View 
              style={{ borderColor: isDark ? Colors.dark.borderLight : "#E2E5ED", backgroundColor: isDark ? Colors.dark.inputBg : "transparent" }}
              className="border rounded-lg px-4 py-4 flex-row gap-2 items-center"
            >
              <User size={16} color={isDark ? Colors.dark.textMuted : "#7A8289"} />
              <TextInput
                style={{ color: isDark ? Colors.dark.textPrimary : "black" }}
                className="text-base flex-1"
                placeholder="Enter contact name"
                placeholderTextColor={isDark ? Colors.dark.textPlaceholder : "#E2E5ED"}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Phone Input */}
          <View className="mb-6">
            <Text className="text-[#7A8289] mb-2 text-base">
              Phone Number <Text className="text-[#CC292C]">*</Text>
            </Text>
            <View className="flex-row items-center">
              {/* Country Picker */}
              <View className="relative">
                <Pressable
                  onPress={() => setShowDropdown(!showDropdown)}
                  style={{ minWidth: width * 0.28, borderColor: isDark ? Colors.dark.borderLight : "#E2E5ED", backgroundColor: isDark ? Colors.dark.inputBg : "white" }}
                  className="flex-row items-center border rounded-lg px-3 py-3"
                >
                  <Text style={{ color: isDark ? Colors.dark.textPrimary : "black" }} className="mr-2 text-base">
                    {selectedCountry.flag}
                  </Text>
                  <Text style={{ color: isDark ? Colors.dark.textPrimary : "black" }} className="text-base">
                    {selectedCountry.dial_code}
                  </Text>
                  {showDropdown ? (
                    <ChevronUp size={18} color={isDark ? Colors.dark.textPrimary : "black"} className="ml-1" />
                  ) : (
                    <ChevronDown size={18} color={isDark ? Colors.dark.textPrimary : "black"} className="ml-1" />
                  )}
                </Pressable>

                {/* Dropdown */}
                {showDropdown && (
                  <View
                    style={{
                      width: width * 0.8,
                      maxHeight: height * 0.4,
                      zIndex: 10,
                      borderColor: isDark ? Colors.dark.borderLight : "#E2E5ED",
                      backgroundColor: isDark ? Colors.dark.surface : "white"
                    }}
                    className="absolute top-14 border rounded-lg shadow-md"
                  >
                    <FlatList
                      data={countries}
                      keyExtractor={(item) => item.code}
                      renderItem={renderItem}
                      keyboardShouldPersistTaps="handled"
                    />
                  </View>
                )}
              </View>

              {/* Phone Input */}
              <TextInput
                style={{ color: isDark ? Colors.dark.textPrimary : "black", borderColor: isDark ? Colors.dark.borderLight : "#E2E5ED", backgroundColor: isDark ? Colors.dark.inputBg : "transparent" }}
                className="flex-1 ml-2 border rounded-lg px-4 py-4 text-base"
                placeholder="Enter contact phone number"
                placeholderTextColor={isDark ? Colors.dark.textPlaceholder : "#E2E5ED"}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <View
            style={{ backgroundColor: isAiChatActive ? (isDark ? "rgba(0,153,135,0.15)" : "#00998733") : (isDark ? Colors.dark.surface : "#F5F5F5") }}
            className="flex-row items-center p-3 justify-between rounded-lg"
          >
            <Text style={{ color: isDark ? Colors.dark.textPrimary : "#000" }} className="text-xl font-semibold">AI Chat</Text>
            <ToggleSwitch
              isOn={isAiChatActive}
              onColor="#009987"
              offColor={isDark ? Colors.dark.border : "#000"}
              onToggle={(isOn) => setIsAiChatActive(isOn)}
            />
          </View>
        </View>

        {/* Bottom Button */}
        <View className="mt-8">
          <Pressable
            onPress={handleEdit}
            disabled={loading}
            className="bg-rateUpGreen rounded-xl py-4 flex items-center justify-center"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">Done</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
