import { View, Text, TouchableOpacity, Pressable, Modal, Dimensions } from 'react-native'
import React, { useEffect, useState } from 'react'
import { BackIcon, DotsIcon } from '@/src/constants/imageExports';
import { useRouter } from 'expo-router';
import { namePreview } from '../chatBox/utils';


const { width: screenWidth } = Dimensions.get('window')
let userId:string;

const MoreOptions = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => {
    const modalWidth = screenWidth * 0.4 // 40% of screen width (you can adjust)
    const router = useRouter()
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable className="flex-1" onPress={onClose}>
                <View
                    style={{
                        width: modalWidth,
                        backgroundColor: 'white',
                        borderRadius: 8,
                        padding: 8,
                        position: 'absolute',
                        right: 10,
                        top: 55,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5,
                        display:"flex",
                        gap:2
                    }}
                >
                    <TouchableOpacity className="p-3" onPress={() => { 
                        onClose();
                        router.push({pathname:"/inbox/contact/edit" ,params:{userId}})
                     }}>
                        <Text className="text-gray-800 text-lg">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="p-3" onPress={() => { onClose(); /* handle Assign */ }}>
                        <Text className="text-gray-800 text-lg">Assign</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="p-3" onPress={() => { onClose(); /* handle Close Chat */ }}>
                        <Text className="text-gray-800 text-lg">Close Chat</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    )
}


const ChatHeader = ({ id, name, phone }: { id: string, name: string, phone:number }) => {
    const router = useRouter()
    const [optionsVisible, setOptionsVisible] = useState(false)
    userId = id;

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
                <TouchableOpacity className='bg-[#00998733] h-5 w-5 flex justify-center items-center p-4 rounded-md'
                onPress={()=> setOptionsVisible(true)}>
                <DotsIcon/>
                </TouchableOpacity>
                <MoreOptions visible={optionsVisible} onClose={() => setOptionsVisible(false)} />
        </View>
    )
}

export default ChatHeader