import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import ToggleSwitch from "toggle-switch-react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { countries } from "@/src/constants/countries";
import { BackIcon, UsernameIcon } from "@/src/constants/imageExports";
import { useLocalSearchParams, useRouter } from "expo-router";
import { editContactById, getContactById } from "@/src/api/inbox/contacts.api";
import { convertFullPhoneNumToCoutryCodeAndNationalNum } from "@/src/utils/phoneNumConvert";

export default function EditContacts() {
  const { userId }: { userId: string } = useLocalSearchParams();
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
      await editContactById(userId, {
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
      const res = await getContactById(userId);
      setIsAiChatActive(res.aiWaChat);

      const numbers = convertFullPhoneNumToCoutryCodeAndNationalNum(
        `+${res.phone}`
      );
      setPhone(numbers.national_number);

      const matchingCountry = countries.find(
        (country) => country.dial_code === `+${numbers.country_code}`
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
  }, [userId]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handleSelectCountry(item)}
      className="flex-row items-center px-3 py-3 bg-white"
    >
      <Text className="text-black mr-2">{item.flag}</Text>
      <Text className="text-black mr-2">{item.name}</Text>
      <Text className="text-black text-sm">{item.dial_code}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <View style={{ flex: 1, padding: 16 }}>
        {/* Top Part */}
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View className="flex-row items-center mb-8 gap-2">
            <Pressable onPress={() => router.back()}>
              <BackIcon height={25} width={25} />
            </Pressable>
            <Text className="text-black text-2xl font-bold">Edit</Text>
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
            <View className="border border-[#E2E5ED] rounded-lg px-4 py-4 flex-row gap-2 items-center">
              <UsernameIcon />
              <TextInput
                className="text-black text-base flex-1"
                placeholder="Enter contact name"
                placeholderTextColor="#E2E5ED"
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
                  className="flex-row items-center border border-[#E2E5ED] rounded-lg px-3 py-3 bg-white"
                  style={{ minWidth: width * 0.28 }}
                >
                  <Text className="text-black mr-2 text-base">
                    {selectedCountry.flag}
                  </Text>
                  <Text className="text-black text-base">
                    {selectedCountry.dial_code}
                  </Text>
                  {showDropdown ? (
                    <ChevronUp size={18} color="black" className="ml-1" />
                  ) : (
                    <ChevronDown size={18} color="black" className="ml-1" />
                  )}
                </Pressable>

                {/* Dropdown */}
                {showDropdown && (
                  <View
                    className="absolute top-14 border border-[#E2E5ED] rounded-lg shadow-md bg-white"
                    style={{
                      width: width * 0.8,
                      maxHeight: height * 0.4,
                      zIndex: 10,
                    }}
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
                className="flex-1 ml-2 border border-[#E2E5ED] rounded-lg px-4 py-4 text-black text-base"
                placeholder="Enter contact phone number"
                placeholderTextColor="#E2E5ED"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <View
            className={`flex-row items-center p-3 justify-between rounded-lg ${
              isAiChatActive ? "bg-[#00998733]" : "bg-[#F5F5F5]"
            }`}
          >
            <Text className="text-[#000] text-xl font-semibold">AI Chat</Text>
            <ToggleSwitch
              isOn={isAiChatActive}
              onColor="#009987"
              offColor="#000"
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
    </KeyboardAvoidingView>
  );
}
