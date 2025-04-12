import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { ContactsWithLastMessage } from "@/src/api/inbox/types"
import { useFilteredContacts } from "@/src/api/inbox/useFilteredContacts"
import { getDefaultFilter } from "@/src/api/inbox/useFilteredContacts"

export default function Inbox({ filter }: { filter: Partial<Record<string, any>> }) {
  const defaultFilter = getDefaultFilter()
  const mergedFilter = {
    ...defaultFilter,
    ...filter,
    waMessageAssignStatus:
      filter.waMessageAssignStatus === "NEW"
        ? "New"
        : filter.waMessageAssignStatus ?? defaultFilter.waMessageAssignStatus,
  }

  const encodedFilter = encodeURIComponent(JSON.stringify(mergedFilter))

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useFilteredContacts(encodedFilter)

  const contacts = data?.pages.flatMap((page) => page.rows) ?? []

  const renderItem = ({ item }: { item: ContactsWithLastMessage }) => (
    <Pressable
      onPress={() => console.log("Open chat with:", item.name)}
      style={({ pressed }) => [
        styles.itemContainer,
        pressed && styles.itemPressed,
      ]}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.message}>
        {item.lastMessage?.messageBody?.text || "No message"}
      </Text>
      <Text style={styles.status}>{item.waMessageAssignStatus}</Text>
    </Pressable>
  )

  return isLoading ? (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" />
    </View>
  ) : (
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
        ) : null
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
