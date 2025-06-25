import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import dayjs from 'dayjs';
import { useContactById } from '@/src/api/inbox/contacts/contacts.query';
import { namePreview } from '@/src/utils/chatbox_utils';

export const ContactCard = ({ item }: { item: any }) => {
  const { data: contact, isLoading: loadingContact } = useContactById(item.contactId);

  if (loadingContact || !contact) {
    return (
      <View className="flex-row items-start gap-3 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  const name = contact.name || contact.whatsappUserName || contact.phone;
  const initials = namePreview(name);
  const created = dayjs(item.createdAt);
  const isToday = created.isSame(dayjs(), 'day');
  const time = isToday ? created.format('h:mm A') : created.format('DD/MM/YYYY');

  return (
    <View
      className="flex-row items-start gap-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-md"
    >
      {/* Avatar */}
      <View className="w-14 h-14 rounded-full bg-rateUpGreen20 items-center justify-center">
        <Text className="text-rateUpGreen font-bold text-lg">{initials}</Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="font-semibold text-base text-gray-900" numberOfLines={1}>
            {name}
          </Text>
          <Text className="text-xs text-gray-500">{time}</Text>
        </View>

        {/* Tags */}
        <View className="flex-row gap-2 flex-wrap mt-1">
          <Text className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
            {item.count} responses
          </Text>
          <Text className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
            {contact.tags?.[0] || contact.source || 'Student'}
          </Text>
        </View>
      </View>
    </View>
  );
};
