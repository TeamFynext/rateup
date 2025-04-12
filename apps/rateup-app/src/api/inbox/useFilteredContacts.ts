import axios from "@/src/config/axios"
import {useInfiniteQuery} from "@tanstack/react-query"
import { ContactsWithLastMessageResponse } from "./types";

const API_URL =process.env.EXPO_PUBLIC_API_URL;

export const getDefaultFilter = () => ({
  messageType: "usermessages",
  strictFilter: false,
  searchTerm: "",
  contactGroups: [],
  campaigns: [],
  tags: [],
  waMessageAssignStatus: "ALL",
})

export const getFilteredContacts = async (filterData:string,page:number) => {
     console.log('filterData',filterData,"page",page)
     const response = await axios.get<ContactsWithLastMessageResponse>(`${API_URL}/api/wa/inbox/contactsfiltered?filterData=${filterData}&page=${page}`)
     console.log(response)

     return response.data
}

export const useFilteredContacts = (filterData:string) => {
    return useInfiniteQuery({
        queryKey:["contacts","filtered",filterData],
        queryFn:({pageParam= 1}) => getFilteredContacts(filterData,pageParam),
        initialPageParam:1,
        getNextPageParam:(lastPage,allPages)=>{
            return lastPage?.nextOffset ?? null;
        }
    })
}