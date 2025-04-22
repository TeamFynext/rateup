import { View, Text, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import { assignedContact } from '@/src/api/inbox/contacts';
import { IIcon } from '@/src/constants/imageExports';

import { UserCheck, CircleUser } from 'lucide-react-native';

const NotAssigned = () =>{
    return(
        <View className='bg-white flex-row p-3 justify-around'>

            <TouchableOpacity>
            <View className='bg-[#00998733] rounded-full w-[40vw] flex-row p-2 justify-around items-center'>
               <CircleUser color={"#009987"}/>
               <Text className='text-[#009987]'>Assign To Me</Text>
            </View>
            </TouchableOpacity>

           <TouchableOpacity>
           <View className='bg-[#FFFFFF] border border-[#009987] rounded-full w-[40vw] flex-row p-2 justify-around items-center'>
               <UserCheck color={"#009987"}/>
               <Text className='text-[#009987]'>Assign To Member</Text>
            </View>
           </TouchableOpacity>

        </View>
    )
}

const ChatFooter = ({ waAssignStatus ,id}: { waAssignStatus: string,id:string }) => {
    const [assignedUser, setAssignedUser] = useState("")
useEffect(() => {
    async function assign() {
      console.log("Fetching assigned user for id:", id);
      try {
        const assigned = await assignedContact(id);
        if (assigned && assigned.length > 0 && assigned[0].assignedUser?.name) {
          setAssignedUser(assigned[0].assignedUser.name);
        }
      } catch (err) {
        console.error("Error fetching assigned user:", err);
      }
    }
    assign();
  }, [id]);


return(
  <View className='border'>
    {(waAssignStatus === 'UNASSIGNED' || waAssignStatus === 'NEW')?(
        <View>
            <View className='bg-black flex-row py-2 px-1 items-center justify-center gap-1'>
        <IIcon/>
            <Text className='text-white'>Please assign to start the chat</Text>
            </View>
            <NotAssigned/>

        </View>
    ):(
        <View className='bg-black flex-row py-2 px-1 items-center justify-center gap-1'>
        <IIcon/>
        <Text className='text-white'>This chat is assigned to {assignedUser}</Text>
            </View>
        
    )}
  </View>
)
};

export default ChatFooter;
