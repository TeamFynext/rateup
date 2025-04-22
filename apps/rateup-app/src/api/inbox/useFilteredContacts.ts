import axios from "@/src/config/axios"
import { useInfiniteQuery } from "@tanstack/react-query"
import { ContactsWithLastMessageResponse } from "./types"

const API_URL = process.env.EXPO_PUBLIC_API_URL

export const getDefaultFilter = (messageType:string) => ({
  messageType: messageType,
  strictFilter: false,
  searchTerm: "",
  contactGroups: [],
  campaigns: [],
  tags: []
})

export const getFilteredContacts = async (filterData: string, page: number) => {
  try {
    const response = await axios.get<ContactsWithLastMessageResponse>(
      `${API_URL}/api/wa/inbox/message/contactsfiltered`,
      {
        params: {
          filterData,
          page,
        },
      }
    )
    // console.log("Response:", response)
    return response.data
  } catch (error: any) {
    console.error("Failed to fetch filtered contacts:", error?.response?.data || error.message)
    throw new Error("Failed to load contacts.")
  }
}

export const useFilteredContacts = (filterData: string) => {
  return useInfiniteQuery({
    queryKey: ["contacts", "filtered", filterData],
    queryFn: ({ pageParam = 1 }) => getFilteredContacts(filterData, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.nextOffset ?? null
    },
  })
}


export const filteredContactsCount = async() => {
  const res = await axios.get(`${API_URL}/api/wa/inbox/message/count`)
  return res.data
}