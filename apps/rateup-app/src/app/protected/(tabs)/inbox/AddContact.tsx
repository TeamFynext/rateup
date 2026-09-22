import { useState } from "react";
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
  useColorScheme,
} from "react-native";
import { ArrowLeft, ChevronDown, ChevronUp, Mail, User } from "lucide-react-native";
import { countries } from "@/constants/countries";
import { useRouter } from "expo-router";
import { createContact } from "@/api/inbox/contacts/contacts.api";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/constants";

export default function AddContactScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "white" : colors["slate-950"];

  const router = useRouter();
  const { width, height } = useWindowDimensions();

  // Computed, not stored: it is a pure function of the country and what has been typed, and
  // holding it in state meant the submit below could read the *previous* number for one
  // render after either changed.
  const fullPhoneNumber =
    phone && selectedCountry
      ? (selectedCountry.dial_code + phone.replace(/^0+/, "")).replace("+", "")
      : "";

  const handleSelectCountry = (country: any) => {
    setSelectedCountry(country);
    setShowDropdown(false);
  };

  const handleAddContact = async () => {
    setError("");
    setMessage("");

    if (!name || !phone || !email) {
      setError("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      await createContact({
        name,
        phone: fullPhoneNumber,
        email,
        source: "MANUAL",
      });
      setMessage("Contact added successfully!");
      setName("");
      setPhone("");
      setEmail("");
    } catch (error: any) {
      setError(error?.response?.data?.error || "Failed to add contact");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handleSelectCountry(item)}
      className="flex-row items-center px-3 py-3 bg-white dark:bg-slate-900"
    >
      <Text className="text-black dark:text-white mr-2">{item.flag}</Text>
      <Text className="text-black dark:text-white mr-2">{item.name}</Text>
      <Text className="text-black dark:text-white text-sm">{item.dial_code}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 py-4">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        className="flex-grow px-4 bg-white dark:bg-slate-950"
      >
        <View className="flex-grow justify-between">
          {/* Form */}
          <View>
            {/* Header */}
            <View className="flex-row items-center justify-start mb-8 gap-2">
              <Pressable onPress={() => router.back()}>
                <ArrowLeft color={textColor} />
              </Pressable>
              <Text className="dark:text-white text-2xl font-bold">Add New Contact</Text>
            </View>

            {/* Error or Success Messages */}
            {(error || message) && (
              <View
                className="mb-4 p-3 rounded-lg"
                style={{ backgroundColor: error ? "#ffe5e5" : "#e5fff0" }}
              >
                <Text className={`text-sm ${error ? "text-[#cc0000]" : "text-[#007e33]"}`}>
                  {error || message}
                </Text>
              </View>
            )}

            {/* Name Field */}
            <View className="mb-6">
              <Text className="text-[#7A8289] mb-2 text-base">
                Name <Text className="text-[#CC292C]">*</Text>
              </Text>
              <View className="border border-[#E2E5ED] rounded-lg px-4 py-4 flex-row gap-2 items-center">
                <User size={16} />
                <TextInput
                  className="dark:text-white text-base flex-1"
                  placeholder="Enter contact name"
                  placeholderTextColor="#E2E5ED"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Phone Field */}
            <View className="mb-6">
              <Text className="text-[#7A8289] mb-2 text-base">
                Phone Number <Text className="text-[#CC292C]">*</Text>
              </Text>
              <View className="flex-row items-center">
                <View className="relative">
                  <Pressable
                    onPress={() => setShowDropdown(!showDropdown)}
                    className="flex-row items-center border border-[#E2E5ED] rounded-lg px-3 py-3 bg-white dark:bg-slate-950"
                    style={{ minWidth: width * 0.28 }}
                  >
                    <Text className="dark:text-white mr-2 text-base">{selectedCountry.flag}</Text>
                    <Text className="dark:text-white text-base">{selectedCountry.dial_code}</Text>
                    {showDropdown ? (
                      <ChevronUp size={18} color={textColor} />
                    ) : (
                      <ChevronDown size={18} color={textColor} />
                    )}
                  </Pressable>

                  {/* Dropdown */}
                  {showDropdown && (
                    <View
                      className="absolute top-14 border border-[#E2E5ED] rounded-lg shadow-md bg-white dark:bg-slate-900"
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

                <TextInput
                  className="flex-1 ml-2 border border-[#E2E5ED] rounded-lg px-4 py-4 dark:text-white text-base"
                  placeholder="Enter contact phone number"
                  placeholderTextColor="#E2E5ED"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email Field */}
            <View className="mb-8">
              <Text className="text-[#7A8289] mb-2 text-base">
                Email Id <Text className="text-[#CC292C]">*</Text>
              </Text>
              <View className="border border-[#E2E5ED] rounded-lg px-4 py-4 flex-row gap-2 items-center">
                <Mail size={16} />
                <TextInput
                  className="dark:text-white text-base flex-1"
                  placeholder="Enter contact email"
                  placeholderTextColor="#E2E5ED"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
              </View>
            </View>
          </View>

          {/* Add Contact Button */}
          <View>
            <Pressable
              onPress={handleAddContact}
              disabled={loading}
              className="bg-primaryBlue rounded-xl py-4 flex items-center justify-center"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg">Add Contact</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
