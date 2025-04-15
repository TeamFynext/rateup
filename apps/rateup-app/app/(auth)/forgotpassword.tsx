import { sendPasswordResetEmail } from '@/src/api/api';
import { BackIcon, MessageIcon, SuccessIcon } from '@/src/constants/imageExports';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Dimensions, Image } from 'react-native';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function ResetPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState<boolean>(false);
    const [showToast, setShowToast] = useState(true);

    const handleResetPassword = async () => {
        setLoading(true);
        const response = await sendPasswordResetEmail(email);
        setLoading(false);

        if (response.success) {
            setError("");
            setMessage(response.message);
        } else {
            setMessage("");
            setError(response.message);
        }

        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
        }, 5000); 
    };

    return (
        <View className="flex gap-20 bg-white px-4 pt-6" style={{ width, height }}>
            
            {/* Header */}
            <TouchableOpacity 
                className="flex-row items-center mb-6 justify-start"
                onPress={() => router.replace("/(auth)/signin")}
            >
                <BackIcon/>
                <Text className="text-xl font-bold ml-2">Reset Password</Text>
            </TouchableOpacity>

            {/* Image Placeholder */}
            <View className="items-center justify-center" style={{ height: height * 0.2 }}>
                <View className="bg-[#C4D7F5] p-4 rounded-lg h-[80px] w-[80px] flex items-center justify-center">
                    <MessageIcon/>
                </View>
                <Text className="text-center text-[#7A8289] mt-4 mb-8 text-lg">
                Please check your email for{'\n'}password reset link.
            </Text>
            </View>

            {/* Info Text */}
            

            {/* Email Input */}
            <View>
            <View className="mb-4">
                <Text className="text-sm text-[#7A8289] mb-2">Email Id</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter Your Email"
                    placeholderTextColor="#E2E5ED"
                    className="border border-[#E2E5ED] rounded-md px-4 py-3 text-sm"
                />
            </View>

            {/* Reset Button */}
            <TouchableOpacity
                className="bg-[#004F98] py-3 rounded-md"
                onPress={handleResetPassword}
                disabled={loading}
            >
                <Text className="text-white text-center font-bold text-xl">Send Reset Link</Text>
            </TouchableOpacity>

            {/* Toast Notification */}
            {showToast && (
                <Animated.View
                    entering={SlideInRight.duration(500)}
                    exiting={SlideOutRight.duration(500)}
                    className="mt-[1vh] flex-row justify-end right-2"
                >
                    {error?(
                        <Text className='text-red-600 text-xl'>
                            {error}
                        </Text>
                    ):(
                        ""
                    )}
                    {
                        message?(
                            <View className='flex-row gap-1 items-center'>
                            <SuccessIcon/>
                        <Text className="text-[#004F98] text-xl">
                        {message}
                        </Text>
                        </View>
                        ):("")
                    }
                    
                </Animated.View>
            )}
            </View>
        </View>
    );
}
