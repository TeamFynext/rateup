import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { countries } from '@/src/constants/countries';
import { useWindowDimensions } from 'react-native';
import { BackIcon, EmailIcon, UsernameIcon } from '@/src/constants/imageExports';
import { useRouter } from 'expo-router';
import { createContact } from '@/src/api/inbox/contacts';

export default function AddContactScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fullPhoneNumber, setFullPhoneNumber] = useState("")
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(''); 
  const [error, setError] = useState('');    
  const router = useRouter();

  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState<boolean>(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardStatus(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardStatus(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if(phone && selectedCountry){
      const formatted = selectedCountry.dial_code + phone.replace(/^0+/, '');
    setFullPhoneNumber(formatted.replace("+",""));
    
    }
  }, [phone, selectedCountry]);

  const handleSelectCountry = (country: any) => {
    setSelectedCountry(country);
    setShowDropdown(false);
  };

  const handleAddContact = async () => {
    setError('');
    setMessage('');

    if (!name || !phone || !email) {
      setError('Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      await createContact({
        name,
        phone: fullPhoneNumber,
        email,
        source:"MANUAL"
      });
      setMessage('Contact added successfully!');
      setName('');
      setPhone('');
      setEmail('');
      // router.back(); 
    } catch (error: any) {
      
      setError(error?.response?.data?.error || 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

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

  const renderForm = () => (
    <View className="px-4 pt-6 pb-2">
      <View className='flex-row items-center justify-start mb-8 gap-2'>
        <Pressable onPress={() => router.back()}>
          <BackIcon />
        </Pressable>
        <Text className="text-black text-2xl font-bold">Add New Contact</Text>
      </View>

      {/* Error or Success Messages */}
      {(error || message) && (
        <View className="mb-4 p-3 rounded-lg" style={{ backgroundColor: error ? '#ffe5e5' : '#e5fff0' }}>
          <Text className={`text-sm ${error ? 'text-[#cc0000]' : 'text-[#007e33]'}`}>
            {error || message}
          </Text>
        </View>
      )}

      {/* Name Field */}
      <View className="mb-6">
        <Text className="text-[#7A8289] mb-2 text-base">Name <Text className='text-[#CC292C]'>*</Text></Text>
        <View className='border border-[#E2E5ED] rounded-lg px-4 py-4 flex-row gap-2 items-center'>
          <UsernameIcon />
          <TextInput
            className="text-black text-base w-full"
            placeholder="Enter contact name"
            placeholderTextColor="#E2E5ED"
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

      {/* Phone Field */}
      <View className="mb-6">
        <Text className="text-[#7A8289] mb-2 text-base">Phone Number <Text className='text-[#CC292C]'>*</Text></Text>
        <View className="flex-row items-center">
          <View className="relative">
            <Pressable
              onPress={() => setShowDropdown(!showDropdown)}
              className="flex-row items-center border border-[#E2E5ED] rounded-lg px-3 py-3 bg-white"
            >
              <Text className="text-black mr-2 text-base">{selectedCountry.flag}</Text>
              <Text className="text-black text-base">{selectedCountry.dial_code}</Text>
              {showDropdown ? (
                <ChevronUp size={18} color="black" className="ml-1" />
              ) : (
                <ChevronDown size={18} color="black" className="ml-1" />
              )}
            </Pressable>

            {showDropdown && (
              <View
                className="absolute top-14 border border-[#E2E5ED] rounded-lg shadow-md bg-white"
                style={{ width: width - 40, zIndex: 9999 }}
              >
                <FlatList
                  data={countries}
                  keyExtractor={(item) => item.code}
                  renderItem={renderItem}
                  style={{ maxHeight: 200 }}
                />
              </View>
            )}
          </View>

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

      {/* Email Field */}
      <View className="mb-8">
        <Text className="text-[#7A8289] mb-2 text-base">Email Id <Text className='text-[#CC292C]'>*</Text></Text>
        <View className='border border-[#E2E5ED] rounded-lg px-4 py-4 flex-row gap-2 items-center'>
          <EmailIcon />
          <TextInput
            className="text-black text-base w-full"
            placeholder="Enter contact email"
            placeholderTextColor="#E2E5ED"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className={keyboardStatus ? 'bg-white h-[50vh] flex justify-between p-3' : 'bg-white min-h-screen flex justify-between p-3'}
    >
      {renderForm()}

      {/* Add Contact Button */}
      <View>
        <Pressable
          onPress={handleAddContact}
          disabled={loading}
          className="bg-[#009987] rounded-xl py-4 flex items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Add Contact</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
