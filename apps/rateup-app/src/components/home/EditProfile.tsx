import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Camera } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { serverMessage, updateProfileName, updateProfilePhoto, useUserProfile } from "@/api/api";
import Image from "@/components/common/Image";
import { Toast } from "@/components/common/Notice";
import {
  Card,
  CashierButton,
  CashierInput,
  Field,
  FONT,
  InlineError,
  useTheme,
} from "@/components/loyalty/cashier/ui";
import { uploadFile } from "@/utils/fileUpload";
import { namePreview } from "@/utils/chatbox_utils";

const AVATAR = 112;

/** `uploadFile` throws the server's message as a bare string; the photo save throws axios's error. */
function photoErrorMessage(error: unknown) {
  if (typeof error === "string" && error) return error;
  return serverMessage(error, "Could not update your photo. Try again.");
}

export default function EditProfile({
  name: savedName,
  profilePhoto,
}: Readonly<{ name: string; profilePhoto?: string | null }>) {
  const { t } = useTheme();
  const queryClient = useQueryClient();
  const { data: profile } = useUserProfile();
  const [name, setName] = useState(savedName);
  const [submitted, setSubmitted] = useState(false);

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: ["loggedUser"] });
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
  };

  const photo = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset) => {
      const key = await uploadFile({
        uri: asset.uri,
        name: asset.fileName ?? "profile-photo.jpg",
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as File);
      await updateProfilePhoto(key);
    },
    onSuccess: () => {
      refreshUser();
      Toast.show({ type: "success", text1: "Profile photo updated" });
    },
  });

  const rename = useMutation({
    mutationFn: (newName: string) => updateProfileName(newName, profile),
    onSuccess: () => {
      refreshUser();
      Toast.show({ type: "success", text1: "Name updated" });
      router.back();
    },
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) photo.mutate(result.assets[0]);
  };

  const trimmed = name.trim();
  const nameError = submitted && !trimmed ? "Name cannot be blank" : null;

  const save = () => {
    setSubmitted(true);
    if (!trimmed) return;
    if (trimmed === savedName) return router.back();
    rename.mutate(trimmed);
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Card gap={14}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={pickPhoto}
            disabled={photo.isPending}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <View
              style={{
                width: AVATAR,
                height: AVATAR,
                borderRadius: AVATAR / 2,
                overflow: "hidden",
                backgroundColor: t.brandInk,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {profilePhoto ? (
                <Image
                  source={{ uri: `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${profilePhoto}` }}
                  style={{ width: AVATAR, height: AVATAR }}
                />
              ) : (
                <Text style={{ fontFamily: FONT.extrabold, fontSize: 36, color: "#FFFFFF" }}>
                  {namePreview(savedName)}
                </Text>
              )}
              {photo.isPending ? (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.45)",
                  }}
                >
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <View
              style={{
                position: "absolute",
                right: 2,
                bottom: 2,
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.border1,
              }}
            >
              <Camera size={16} color={t.fg2} />
            </View>
          </Pressable>
          <CashierButton
            label={photo.isPending ? "Uploading photo..." : "Change photo"}
            variant="ghost"
            compact
            onPress={pickPhoto}
            disabled={photo.isPending}
          />
        </View>
        <InlineError message={photo.isError ? photoErrorMessage(photo.error) : null} />
      </Card>

      <Card gap={14}>
        <Field label="Name" error={nameError}>
          <CashierInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            invalid={Boolean(nameError)}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="done"
            onSubmitEditing={save}
          />
        </Field>
        <InlineError
          message={
            rename.isError
              ? serverMessage(rename.error, "Could not save your name. Try again.")
              : null
          }
        />
        <CashierButton label="Save" onPress={save} loading={rename.isPending} disabled={!profile} />
      </Card>
    </ScrollView>
  );
}
