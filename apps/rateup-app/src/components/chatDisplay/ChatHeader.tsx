import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { BackIcon, DotsIcon } from '@/src/constants/imageExports';
import { useRouter } from 'expo-router';

const ChatHeader = ({ id, name, phone }: { id: string, name: string, phone:number }) => {
    const router = useRouter()
    const namePreview = (name_: string) => {
        const nameArray = name_.split(" ");
        if (nameArray.length >= 2) {
            return (nameArray[0][0] + nameArray[1][0]).toUpperCase();
        }
        return nameArray[0].slice(0, 2).toUpperCase();
    };

    return (
        <View className="flex-row items-center justify-between px-6 py-4 bg-white gap-3">
            <View className='flex-row items-center gap-3'>
            <TouchableOpacity  onPress={()=>router.back()}>
            <BackIcon width={24} height={22} />
            </TouchableOpacity>
            <View className="w-12 h-12 rounded-full bg-[#00998733] flex items-center justify-center">
                <Text className="text-[#009987] font-bold text-xl">
                    {namePreview(name)}
                </Text>
            </View>
                <View>
                <Text className="text-xl text-[#343A40] font-medium">{name}</Text>
                <Text className='text-[#7A8289]'>{phone}</Text>
                </View>
                </View>
                <TouchableOpacity className='bg-[#00998733] h-5 w-5 flex justify-center items-center p-4 rounded-md'>
                <DotsIcon/>
                </TouchableOpacity>
        </View>
    )
}

export default ChatHeader