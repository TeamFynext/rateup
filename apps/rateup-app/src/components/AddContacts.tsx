import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { countries } from '../constants/countries';
import { useWindowDimensions } from 'react-native';
import { BackIcon, EmailIcon, UsernameIcon } from '../constants/imageExports';
import { useRouter } from 'expo-router';

export default function AddContactScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const router =useRouter()

  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState<boolean>(false);
  const { width } = useWindowDimensions(); // For dynamic width

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

  const handleSelectCountry = (country: any) => {
    setSelectedCountry(country);
    setShowDropdown(false);
  };

  const renderItem = ({ item }:{item:any}) => {
    return (
      <TouchableOpacity
        onPress={() => handleSelectCountry(item)}
        className="flex-row items-center px-3 py-3 bg-white "
      >
        <Text className="text-black mr-2">{item.flag}</Text>
        <Text className="text-black mr-2">{item.name}</Text>
        <Text className="text-black text-sm">{item.dial_code}</Text>
      </TouchableOpacity>
    );
  };

  const renderForm = () => {
    return (
      <View className="px-4 pt-6 pb-2">
        <View className='flex-row items-center justify-start mb-8 gap-2'>
       <Pressable
       onPress={()=>router.back()}>
       <BackIcon/>
       </Pressable>
        <Text className="text-black text-2xl font-bold">Add New Contact</Text>
        </View>

        {/* Name Field */}
        <View className="mb-6">
          <Text className="text-[#7A8289] mb-2 text-base">Name  <Text className='text-[#CC292C]'>*</Text></Text>
          <View className='border border-[#E2E5ED] rounded-lg px-4 py-4 flex-row gap-2 items-center'>
            <UsernameIcon/>
          <TextInput
            className="text-black text-base w-full"
            placeholder="Enter contact name"
            placeholderTextColor="#E2E5ED"
            value={name}
            onChangeText={setName}
          />
          </View>
        </View>

        {/* Phone Field with Country Dropdown */}
        <View className="mb-6">
          <Text className="text-[#7A8289] mb-2 text-base">Phone Number <Text className='text-[#CC292C]'>*</Text></Text>
          <View className="flex-row items-center">
            {/* Country Dropdown */}
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

              {/* Dropdown Options */}
              {showDropdown && (
                <View
                  className="absolute top-14 border border-[#E2E5ED] rounded-lg shadow-md bg-white"
                  style={{ width: width - 40 ,
                    zIndex:9999
                  }} // Making the dropdown full width
                >
                  <FlatList
                    data={countries}
                    keyExtractor={(item) => item.code}
                    renderItem={renderItem}
                    style={{ maxHeight: 200 }} // Limit the dropdown's height for better UX
                  />
                </View>
              )}
            </View>

            {/* Phone Number Input */}
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
            <EmailIcon/>
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
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className={keyboardStatus ? 'bg-white max-h-[50vh] flex justify-between p-3' : 'bg-white min-h-screen flex justify-between p-3'}
    >
      {/* Form Content */}
      {renderForm()}

      {/* Fixed Add Contact Button */}
      <View>
        <Pressable className="bg-[#009987] rounded-xl py-4">
          <Text className="text-white text-center font-bold text-lg">Add Contact</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
