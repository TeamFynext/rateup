import { useGetMediaFile } from "@/src/api/inbox/messages/message.query";
import { getFileUrlFromKey } from "@/src/utils/fileUpload";
import requestStoragePermission from "@/src/utils/permission";
import { Download } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Image, Text, TouchableOpacity, View, Modal } from "react-native";
import RNFS from "react-native-fs";
import Video from "react-native-video";
import { fromByteArray } from "base64-js";

export function WaInboxImage({ messageContent }: { messageContent: string }) {
  const [link, caption] = messageContent?.split("_caption_");
  const imageUrl = link.startsWith("http")
    ? link
    : `${getFileUrlFromKey(link)}`;

  return (
    <View className="w-[220px] h-[280px] rounded-lg overflow-hidden bg-gray-100">
      <Image
        source={{ uri: imageUrl }}
        className="w-full h-full"
        style={{ resizeMode: "cover" }}
      />
      {caption && (
        <Text className="absolute bottom-1 left-2 right-2 text-white text-xs bg-black/40 px-2 py-1 rounded">
          {caption}
        </Text>
      )}
    </View>
  );
}

export function WaInboxVideo({ messageContent }: { messageContent: string }) {
    const { mutate, isPending } = useGetMediaFile();
    const [localPath, setLocalPath] = useState<string | null>(null);
    const [id, caption] = messageContent.split("_caption_");
    const [isModalVisible, setIsModalVisible] = useState(false);
    const link = id.startsWith("http") ? id : null;
    const downloadPath = `${RNFS.DownloadDirectoryPath}/${id}.mp4`;
    // Check if file already exists on mount
    useEffect(() => {
      const checkLocalFile = async () => {
        const exists = await RNFS.exists(downloadPath);
        if (exists) {
          setLocalPath("file://" + downloadPath);
          console.log("Video already exists locally:", downloadPath);
        }
      };
      checkLocalFile();
    }, [downloadPath]);
  
    const handleDownload = async () => {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        console.warn("Storage permission denied");
        return;
      }
  
      // Recheck existence before downloading
      const exists = await RNFS.exists(downloadPath);
      if (exists) {
        console.log("Video already downloaded.");
        setLocalPath("file://" + downloadPath);
        return;
      }
  
      mutate(id, {
        onSuccess: async (arrayBufferData) => {
          const byteArray = new Uint8Array(arrayBufferData);
          const base64Data = fromByteArray(byteArray);
  
          try {
            await RNFS.writeFile(downloadPath, base64Data, "base64");
            setLocalPath("file://" + downloadPath);
            console.log("Video saved to Downloads:", downloadPath);
          } catch (error) {
            console.error("File write failed:", error);
          }
        },
        onError: () => {
          console.error("Video download failed");
        },
      });
    };
  
    const openModal = () => setIsModalVisible(true);
    const closeModal = () => setIsModalVisible(false);
  
    return (
      <View className="p-2 space-y-2">
        {isPending && <ActivityIndicator />}
        {(link || localPath) ? (
          <TouchableOpacity onPress={openModal} activeOpacity={0.7} className="relative">
            <Video
              source={{ uri: localPath ?? link! }}
              controls={false}
              paused={true}
              style={{ width: 100, height: 100 }}
              resizeMode="cover"
            />
            <View className="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-black/30">
              <Text className="text-white text-4xl font-bold">▶</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 justify-center items-center self-center"
            onPress={handleDownload}
          >
            <Download size={24} color="#000" />
          </TouchableOpacity>
        )}
        {caption ? <Text className="text-sm text-center">{caption}</Text> : null}
        <Modal animationType="fade" transparent={false} visible={isModalVisible} onRequestClose={closeModal}>
          <View className="flex-1 justify-center items-center bg-black">
            <TouchableOpacity className="absolute top-5 right-5" onPress={closeModal}>
              <Text className="text-white text-lg">Close</Text>
            </TouchableOpacity>
            <Video
              source={{ uri: localPath ?? link! }}
              controls
              paused={false}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          </View>
        </Modal>
      </View>
    );
  }