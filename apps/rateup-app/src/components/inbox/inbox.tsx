import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { ContactsWithLastMessage } from "@/src/api/inbox/types";
import { useFilteredContacts, getDefaultFilter } from "@/src/api/inbox/useFilteredContacts";
import ChatBoxNew from "../chatBox/ChatBoxNew";
import ChatBoxAssigned from "../chatBox/ChatBoxAssigned";
import ChatBoxAll from "../chatBox/ChatBoxAll";
import { useRouter } from "expo-router";

type InboxProps = {
  messageType: string;
  strictFilter?: boolean;
  searchTerm?: string;
  contactGroups?: string[];
  campaigns?: string[];
  tags?: string[];
  waMessageAssignStatus?: "New" | "Assigned" | "UnAssigned" | "Closed" | "AssignedToMe" | undefined;
};

export default function Inbox({
  messageType,
  strictFilter = false,
  searchTerm,
  contactGroups = [],
  campaigns = [],
  tags = [],
  waMessageAssignStatus,
}: InboxProps) {
  const defaultFilter = getDefaultFilter(messageType);
  const router = useRouter()

  const mergedFilter = {
    ...defaultFilter,
    strictFilter,
    searchTerm,
    contactGroups,
    campaigns,
    tags,
    waMessageAssignStatus,
  };

  const encodedFilter = encodeURIComponent(JSON.stringify(mergedFilter));
  

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useFilteredContacts(encodedFilter);



  const contacts = data?.pages.flatMap((page) => page.rows) ?? [];

  

  const renderItem = ({ item }: { item: ContactsWithLastMessage }) => {
    let ChatBoxComponent;

    switch (waMessageAssignStatus) {
      case "Assigned":
      case "AssignedToMe":
        ChatBoxComponent = ChatBoxAssigned;
        break;
      case "UnAssigned":
        ChatBoxComponent = ChatBoxNew;
        break;
      default:
        ChatBoxComponent = ChatBoxAll;
        break;
    }
    
  
    if (!ChatBoxComponent) return null;
  
    return (
      <ChatBoxComponent
        id={item.id}
        phone={item.phone}
        name={item.name}
        lastMessage={item.lastMessage.messageBody.receive.messages[0]}
        waMessageAssignStatus={item.waMessageAssignStatus}
        //@ts-ignore
        onPress={() => router.push({pathname:`/inbox/chat/${item.id}`,params:{name:item.name, phone:item.phone, waAssignStatus:item.waMessageAssignStatus}})}
        lastReceivedMessageTimeStamp={item.lastReceivedMessageTimeStamp}
        unReadMessageCount={item.unReadMessageCount}
      />
    );
  };
  

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-red-500 text-center">
          Failed to load contacts.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={contacts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator size="small" className="py-4" />
        ) : (
          <View className="items-center py-4">
            <View className="w-1/2 h-0.5 bg-gray-300 rounded-full" />
          </View>
        )
      }
    />
  );
}
