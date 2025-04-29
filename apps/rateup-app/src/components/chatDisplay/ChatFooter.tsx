import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { assignedContact, assignInboxToUser } from '@/src/api/inbox/contacts';
import { IIcon } from '@/src/constants/imageExports';

import { UserCheck, CircleUser } from 'lucide-react-native';
import { loggedUserDetails } from '@/src/api/api';


const NotAssigned = ({contact_ID,setWaAssignStatus,refreshAssignedUser}:{contact_ID:string,setWaAssignStatus: React.Dispatch<React.SetStateAction<string>>,refreshAssignedUser: () => void;}) =>{
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const getUserInfo = async () => {
      try {
        setLoading(true)
        const userDetails = await loggedUserDetails();
        setUserData(userDetails.data);
        setLoading(false)
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      } finally {
        setLoading(false);
      }
    };

    useEffect(()=>{
      getUserInfo();
    },[])


  const handleAssignToMe = async() => {
   try {
    setLoading(true)
    const {teams,userId} = userData;
    await assignInboxToUser({contactId:contact_ID,assignedUserIds:[userId],teamId:teams[0]})
    setWaAssignStatus("ASSIGNED");
    await refreshAssignedUser();
    setLoading(false)
    
   } catch (error) {
    console.log(error)
   }finally{
    setLoading(false)
   }
  }

    return(
      <View className='bg-white flex-row p-3 justify-around'>

          <TouchableOpacity
          onPress={handleAssignToMe}
          disabled={loading}
          >
            {loading?(<View className='bg-[#00998733] rounded-full w-[40vw] flex-row p-2 justify-around items-center'>
             <ActivityIndicator size="small" color="#009987"/>
          </View>):(
            <View className='bg-[#00998733] rounded-full w-[40vw] flex-row p-2 justify-around items-center'>
            <CircleUser color={"#009987"}/>
            <Text className='text-[#009987]'>Assign To Me</Text>
         </View>
          )}          
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

const ChatFooter = ({ waAssignStatus ,id, setWaAssignStatus}: { waAssignStatus: string,id:string ,setWaAssignStatus: React.Dispatch<React.SetStateAction<string>>;}) => {

    const [assignedUser, setAssignedUser] = useState("")
    
    const refreshAssignedUser = async () => {
      try {
        const assigned = await assignedContact(id);
        if (assigned?.[0]?.assignedUser?.name) {
          setAssignedUser(assigned[0].assignedUser.name);
        }
      } catch (err) {
        console.error("Error fetching assigned user:", err);
      }
    };
  
    useEffect(() => {
      refreshAssignedUser();
    }, [id]);


return(
  <View className='border'>
    {(waAssignStatus === 'UNASSIGNED' || waAssignStatus === 'NEW')?(
        <View>
            <View className='bg-black flex-row py-2 px-1 items-center justify-center gap-1'>
        <IIcon/>
            <Text className='text-white'>Please assign to start the chat</Text>
            </View>
            <NotAssigned setWaAssignStatus={setWaAssignStatus} refreshAssignedUser={refreshAssignedUser} contact_ID={id} />

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
