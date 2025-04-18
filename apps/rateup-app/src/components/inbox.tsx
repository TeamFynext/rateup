import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { ContactsWithLastMessage, WaMessageAssignStatus} from "@/src/api/inbox/types"
import { useFilteredContacts, getDefaultFilter } from "@/src/api/inbox/useFilteredContacts"
import ChatBox from "@/src/components/ChatBox"

type InboxProps = {
  messageType: string;
  strictFilter?: boolean;
  searchTerm?: string;
  contactGroups?: string[];
  campaigns?: string[];
  tags?: string[];
  waMessageAssignStatus?: "New" | "Assigned" | "UnAssigned" | "Closed" | "AssignedToMe" | undefined ;
};

export default function Inbox({
  messageType,
  strictFilter = false,
  searchTerm = "",
  contactGroups = [],
  campaigns = [],
  tags = [],
  waMessageAssignStatus,
}: InboxProps) {
  const defaultFilter = getDefaultFilter(messageType);

  const mergedFilter = {
    ...defaultFilter,
    strictFilter,
    searchTerm,
    contactGroups,
    campaigns,
    tags,
    waMessageAssignStatus,
  };


  const encodedFilter = encodeURIComponent(JSON.stringify(mergedFilter))
  console.log("EncodedFilter:",encodedFilter)


  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useFilteredContacts(encodedFilter)

  console.log("data::",data?.pages)

  const contacts = data?.pages.flatMap((page) => page.rows) ?? []

  console.log("contacts:",contacts)

  const renderItem = ({ item }: { item: ContactsWithLastMessage }) => (
    <ChatBox
  name={item.name}
  //@ts-ignore
  lastMessage={item.lastMessage.messageBody.text}  
  waMessageAssignStatus={item.waMessageAssignStatus} 
  onPress={() => console.log("Open chat with:", item.name)}
/>

  )
  

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: "red", textAlign: "center" }}>
          Failed to load contacts.
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={contacts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator size="small" style={styles.footerLoader} />
        ) : (
          <View style={{ padding: 16 }}>
            <Text>Nothing to show here
            </Text>
          </View>
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  itemPressed: {
    backgroundColor: "#f0f0f0",
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
  },
  message: {
    fontSize: 14,
    color: "#555",
  },
  status: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  footerLoader: {
    padding: 16,
  },
})
