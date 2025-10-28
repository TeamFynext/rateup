"use client";

import React, { useEffect, useRef, useState } from "react";

import { isNotEmpty, useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";

import {
  useChangePasswordMutation,
  useGetUserProfile,
  useUpdateProfileMutation,
  useUpdateProfilePhotoMutation,
} from "../../../backend/user/user.query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import {
  ContainedPasswordInput,
  ContainedSelection,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";
import { ImageCropModal } from "../../../components/Modal/ImageCropModal";
import { mergeNames, retrieveRole } from "../../../utils/essential";
import { uploadFile } from "../../../utils/file-upload/upload";
import { passwordValidation } from "../../../utils/validation";
import styles from "./setting.module.css";

import "react-phone-number-input/style.css";

import {
  Bell,
  Building,
  Camera,
  ChevronRight,
  CreditCard,
  Edit,
  Globe,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  Shield,
  ShoppingCart,
  Store,
  Upload,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import SelectR from "react-select";
import countryList from "react-select-country-list";

import {
  useUpdateOrgDetailsMutation,
  useUpdateOrgLogoMutation,
} from "@/backend/org/org.query";
import LocaleSwitcher from "@/components/translation/LocaleSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/context/UserContext";

import { SAVE_HOTKEY } from "../../../utils/constants";
import Team from "./TeamSettings";

type SettingsSection =
  | "account"
  | "users"
  | "notifications"
  | "channels"
  | "integrations"
  | "team"
  | "billing"
  | "security";

const ProfileSettings = () => {
  const translations = useTranslations();
  const { isLoading: isProfileLoading, data: profileData } =
    useGetUserProfile();
  const { user } = useUser();
  const countries = countryList().getData();

  // ============ Forms ============
  const orgForm = useForm({
    initialValues: {
      name: "",
      phone: "",
      address: "",
      location: "",
      industry: "",
      website: "",
      businessmail: "",
    },
    validate: {
      name: isNotEmpty(translations("Name cannot be blank")),
      phone: (value) => {
        if (value && !isValidPhoneNumber(value))
          return translations("Invalid phone number");
        return null;
      },
    },
  });

  const profileForm = useForm({
    initialValues: {
      title: "",
      fullname: "",
      phone: "",
      existingPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      title: isNotEmpty(translations("Select a title")),
      fullname: isNotEmpty(translations("Name Cannot be blank")),
      phone: (value) => {
        if (value && !isValidPhoneNumber(value))
          return translations("Invalid phone number");
        return null;
      },
      existingPassword: (value, values) =>
        isAnyPasswordFieldDirty(values) ? passwordValidation(value) : null,
      newPassword: (value, values) =>
        isAnyPasswordFieldDirty(values) ? passwordValidation(value) : null,
      confirmPassword: (value, values) => {
        if (value !== values.newPassword && isAnyPasswordFieldDirty(values)) {
          return translations(
            "New Password and Confirm Password did not match",
          );
        }
        return null;
      },
    },
  });

  function isAnyPasswordFieldDirty(values) {
    return (
      values.existingPassword !== "" ||
      values.newPassword !== "" ||
      values.confirmPassword !== "" ||
      profileForm.isDirty("existingPassword") ||
      profileForm.isDirty("newPassword") ||
      profileForm.isDirty("confirmPassword")
    );
  }

  const settingsSections = [
    {
      category: "Account Settings",
      items: [
        {
          id: "account" as SettingsSection,
          label: "Account",
          icon: User,
          description: "Business profile & preferences",
        },

        {
          id: "team" as SettingsSection,
          label: "Team",
          icon: Users,
          description: "Team members & roles",
        },
      ],
    },
  ];

  // ============ States ============
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [isLogoUpload, setIsLogoUpload] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [avatarSrc, setAvatarSrc] = useState(
    `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/profile-photo.png`,
  );
  const [orgAvatarSrc, setOrgAvatarSrc] = useState("");
  const [selectedImage, setSelectedImage] = useState({ url: "", name: "" });
  const resetRef = useRef<HTMLInputElement>(null);

  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);

  // ============ Mutations ============
  const updateProfile = useUpdateProfileMutation(setIsLoading);
  const changePassword = useChangePasswordMutation();
  const updateLogo = useUpdateOrgLogoMutation(setIsLoading);
  const updateProfilePhoto = useUpdateProfilePhotoMutation(setIsLoading);
  const orgDetailsUpdate = useUpdateOrgDetailsMutation();

  // ============ Profile Submission ============
  const onSubmit = (values) => {
    setIsLoading(true);
    const data = {
      title: values.title,
      name: values.fullname,
      phone: values.phone ?? "",
    };

    if (isAnyPasswordFieldDirty(values)) {
      const passwordData = {
        existingPassword: values.existingPassword,
        newPassword: values.newPassword,
      };
      changePassword.mutate(passwordData);
      profileForm.setValues({
        existingPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }

    updateProfile.mutate(data, {
      onSuccess: () => {
        setIsEditProfileDialogOpen(false);
        notifications.show({
          title: translations("Success"),
          message: translations("Profile updated successfully"),
          color: "green",
        });
      },
      onError: () => {
        notifications.show({
          title: translations("Error"),
          message: translations("Failed to update profile"),
          color: "red",
        });
      },
    });
  };

  // ============ Effects ============
  useEffect(() => {
    if (profileData?.data?.data) {
      const profile = profileData.data.data;
      profileForm.setValues({
        title: profile.gender || "",
        fullname: profile.name || "",
        phone: profile.phone || "",
      });

      const profilePhoto = profile.profilePhoto;
      if (profilePhoto && profilePhoto !== "REMOVED_PHOTO") {
        setAvatarSrc(
          `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${profilePhoto}`,
        );
      }
    }
  }, [profileData]);

  useEffect(() => {
    if (user) {
      orgForm.setValues({
        name: user?.orgName ?? "",
        phone: user?.orgPhone ?? "",
        address: user?.orgAddress ?? "",
        location: user?.onboarding?.location ?? "",
        website: user?.onboarding?.website ?? "",
        industry: user?.onboarding?.industry ?? "",
        businessmail: user?.onboarding?.businessmail ?? "",
      });

      if (user.orgLogo && user.orgLogo !== "REMOVED_PHOTO") {
        setOrgAvatarSrc(
          `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.orgLogo}`,
        );
      }
    }
  }, [user]);

  useEffect(() => {
    if (file) {
      const uploadAndUpdate = async () => {
        const fileKey = await uploadFile(file);
        if (typeof fileKey === "string") {
          if (isLogoUpload) {
            const data = { logo: fileKey };
            if (typeof fileKey === "string") {
              updateLogo.mutate(data);

              notifications.show({
                id: "load-data",
                loading: true,
                title: translations("Uploading Logo"),
                message: translations(
                  "Hold on, changing your organization Logo",
                ),
                autoClose: false,
                withCloseButton: false,
              });
            }
          } else {
            const data = { profilePhoto: fileKey };
            updateProfilePhoto.mutate(data, {
              onSuccess: () => {
                notifications.update({
                  id: "upload-photo",
                  title: translations("Success"),
                  message: translations("Profile photo updated successfully"),
                  color: "green",
                  loading: false,
                  autoClose: 3000,
                });
              },
            });
            notifications.show({
              id: "upload-photo",
              loading: true,
              title: translations("Uploading photo"),
              message: translations("Hold on, changing your profile photo"),
              autoClose: false,
              withCloseButton: false,
            });
          }
        }
      };

      uploadAndUpdate();
      setIsLogoUpload(false);
    }
  }, [file]);
  // ============ Image Upload ============
  const handleImagePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toggleCropDialog();
    setSelectedImage({
      name: file.name,
      url: URL.createObjectURL(file),
    });
    if (resetRef?.current) e.target.value = "";
  };

  const handleCropImageSave = (croppedImage: File) => {
    setFile(croppedImage);
    closeCropDialog();
  };

  const onOrgSubmit = (values) => {
    const data = {
      name: values.name,
      phone: values?.phone ?? "",
      address: values?.address ?? "",
      location: values?.location ?? "",
      website: values?.website ?? "",
      industry: values?.industry ?? "",
      businessmail: values?.businessmail ?? "",
    };
    notifications.show({
      id: "load-data",
      loading: true,
      title: translations("Updating Organization info"),
      message: translations("Hold on, Organization info is getting updated"),
      autoClose: false,
      withCloseButton: false,
    });
    orgDetailsUpdate.mutate(data);
  };

  const industries = [
    "E-commerce",
    "Retail",
    "Restaurant & Food",
    "Healthcare",
    "Education",
    "Real Estate",
    "Financial Services",
    "Travel & Tourism",
    "Technology",
    "Beauty & Wellness",
    "Automotive",
    "Entertainment",
    "Other",
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return (
          <div className="p-4 flex flex-col gap-2">
            <div>
              <h2 className="text-2xl mb-1">Account Settings</h2>
              <p className="text-sm text-muted-foreground">
                Manage your profile, business information and account
                preferences
              </p>
            </div>

            {/* User Profile Section */}
            <Card className="p-4 sm:p-6 shadow-sm border-gray-200 bg-gradient-to-br from-white to-gray-50/50">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                {/* Avatar Section */}
                <div className="relative group">
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white shadow-lg">
                    <AvatarImage src={avatarSrc || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-2xl">
                      {profileData?.data?.data?.name?.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => setIsEditProfileDialogOpen(true)}
                    className="absolute bottom-0 right-0 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-full p-1.5 sm:p-2 shadow-md transition-all group-hover:scale-110"
                  >
                    <Camera className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Profile Details */}
                <div className="flex-1 text-center sm:text-left w-full">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                    {/* Name + Info */}
                    <div className="flex flex-col gap-0.5">
                      <p className="text-lg sm:text-xl font-medium text-gray-900">
                        {profileData?.data?.data?.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {profileData?.data?.data?.email} • Member since{" "}
                        {new Date(
                          profileData?.data?.data?.createdAt,
                        ).getFullYear()}
                      </p>

                      {/* Status Badges */}
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                        <Badge
                          className={`${
                            profileData?.data?.data?.active
                              ? "bg-green-600"
                              : "bg-gray-400"
                          } text-white text-xs sm:text-sm`}
                        >
                          {profileData?.data?.data?.active
                            ? "Active Account"
                            : "Inactive Account"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-purple-500 text-purple-600 text-xs sm:text-sm"
                        >
                          {profileData?.data?.data?.role}
                        </Badge>
                      </div>
                    </div>

                    {/* Edit Button */}
                    <div className="flex justify-center sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 w-full sm:w-auto mt-2 sm:mt-0"
                        onClick={() => setIsEditProfileDialogOpen(true)}
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Business Information Modal Trigger */}
            <Card className="p-6 shadow-sm border-gray-200 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rateup-blue to-rateup-orange flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="">Business Information</h3>
                    <p className="text-xs text-muted-foreground">
                      Your company details and contact information
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsBusinessDialogOpen(true)}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              </div>

              {/* Business Overview */}
              <div className="flex items-center gap-4 mt-2">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
                    <AvatarImage src={orgAvatarSrc} />
                    <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-lg">
                      {user?.orgName?.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => setIsBusinessDialogOpen(true)}
                    className="absolute bottom-0 right-0 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-full p-1 sm:p-1.5 shadow-md transition-all group-hover:scale-110"
                  >
                    <Camera className="w-3 h-3 text-gray-600" />
                  </button>
                </div>
                <div>
                  <p className="font-medium text-base">{user?.orgName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {user?.onboarding?.industry}
                  </p>
                </div>
              </div>

              {/* Detailed Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 mt-0.5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-700 mb-0.5">Phone</p>
                    <p className="text-gray-500">
                      {orgForm?.values?.phone || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 mt-0.5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-700 mb-0.5">Email</p>
                    <p className="text-gray-500">
                      {user?.onboarding?.businessmail || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Globe className="w-4 h-4 mt-0.5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-700 mb-0.5">Website</p>
                    <p className="text-gray-500">
                      {user?.onboarding?.website || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-700 mb-0.5">Location</p>
                    <p className="text-gray-500">
                      {user?.onboarding?.location || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 md:col-span-2">
                  <Home className="w-4 h-4 mt-0.5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-700 mb-0.5">Address</p>
                    <p className="text-gray-500">
                      {orgForm?.values?.address || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            {/* Business Information Dialog */}
            <Dialog
              open={isBusinessDialogOpen}
              onOpenChange={setIsBusinessDialogOpen}
            >
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Business Information</DialogTitle>
                  <DialogDescription>
                    Update your organization details and upload your company
                    logo.
                  </DialogDescription>
                </DialogHeader>

                <form
                  onSubmit={orgForm.onSubmit(onOrgSubmit)}
                  className="space-y-4 py-4"
                >
                  {/* Logo Upload */}
                  <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                      <AvatarImage src={orgAvatarSrc || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-xl">
                        {user?.orgName?.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Label htmlFor="orgLogoUpload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-fit">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Upload Logo</span>
                        </div>
                        <input
                          id="orgLogoUpload"
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              toggleCropDialog();
                              setSelectedImage({
                                name: file.name,
                                url: URL.createObjectURL(file),
                              });
                              e.target.value = "";
                              setIsLogoUpload(true);
                            }
                          }}
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-2">
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div>

                  {/* Organization Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        {...orgForm.getInputProps("name")}
                        placeholder="Enter your business name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select
                        defaultValue={
                          user?.onboarding?.industry || "E-commerce"
                        }
                        onValueChange={(val) =>
                          orgForm.setFieldValue("industry", val)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        {...orgForm.getInputProps("website")}
                        placeholder="https://your-website.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessPhone">Business Phone</Label>
                      <Input
                        id="businessPhone"
                        {...orgForm.getInputProps("phone")}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessEmail">Business Email</Label>
                      <Input
                        id="businessEmail"
                        {...orgForm.getInputProps("businessmail")}
                        placeholder="business@company.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <SelectR
                        options={countries}
                        value={
                          countries.find(
                            (country) =>
                              country.label === orgForm.values.location,
                          ) || null
                        }
                        onChange={(option) =>
                          orgForm.setFieldValue("location", option?.label || "")
                        }
                        placeholder={translations("Select Your Location")}
                        isSearchable
                        className="rounded-md text-sm bg-white [&>input]:w-full border-gray-200"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        {...orgForm.getInputProps("address")}
                        placeholder="Enter your complete business address"
                        className="resize-none"
                        rows={2}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBusinessDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-rateup-blue to-rateup-blue"
                    >
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Card className="p-5 shadow-sm border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="mb-0">Regional Settings</h4>
                  <p className="text-xs text-muted-foreground">
                    language preferences
                  </p>
                </div>
              </div>
              <LocaleSwitcher />
            </Card>

            {/* Image Crop Modal */}
            <ImageCropModal
              opened={openedCropDialog}
              onclose={closeCropDialog}
              imageName={selectedImage.name}
              handleCropImageSave={handleCropImageSave}
              image={selectedImage.url}
              aspect={1}
            />

            {/* Edit Profile Dialog */}
            <Dialog
              open={isEditProfileDialogOpen}
              onOpenChange={setIsEditProfileDialogOpen}
            >
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>
                    Update your personal information and preferences
                  </DialogDescription>
                </DialogHeader>

                <form
                  onSubmit={profileForm.onSubmit(onSubmit)}
                  className="space-y-4 py-4"
                >
                  {/* Profile Image Upload */}
                  <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-xl">
                        {profileData?.data?.data?.name?.slice(0, 1) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Label
                        htmlFor="profileImageUpload"
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-fit">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Upload Photo</span>
                        </div>
                        <input
                          ref={resetRef}
                          id="profileImageUpload"
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={handleImagePicker}
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-2">
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div>

                  {/* Title/Gender */}
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={profileForm.values.title}
                      onValueChange={(value) =>
                        profileForm.setFieldValue("title", value)
                      }
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select title" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Mr</SelectItem>
                        <SelectItem value="FEMALE">Mrs</SelectItem>
                        <SelectItem value="OTHER">Mx</SelectItem>
                      </SelectContent>
                    </Select>
                    {profileForm.errors.title && (
                      <p className="text-xs text-red-500">
                        {profileForm.errors.title}
                      </p>
                    )}
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullname">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fullname"
                      placeholder="Enter your full name"
                      {...profileForm.getInputProps("fullname")}
                    />
                    {profileForm.errors.fullname && (
                      <p className="text-xs text-red-500">
                        {profileForm.errors.fullname}
                      </p>
                    )}
                  </div>

                  {/* Email - Read Only */}
                  <div className="space-y-2">
                    <Label htmlFor="profileEmail">Email Address</Label>
                    <Input
                      id="profileEmail"
                      type="email"
                      value={profileData?.data?.data?.email || ""}
                      disabled={true}
                      readOnly
                      className="bg-gray-100 cursor-not-allowed opacity-70"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="profilePhone">Phone Number</Label>
                    <PhoneInputWithCountrySelect
                      defaultCountry="IN"
                      international
                      countryCallingCodeEditable={false}
                      placeholder="Phone Number"
                      {...profileForm.getInputProps("phone")}
                      className="rounded-md border border-gray-300 px-2 py-1 w-full"
                    />
                    {profileForm.errors.phone && (
                      <p className="text-xs text-red-500">
                        {profileForm.errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Role - Read Only */}
                  <div className="space-y-2">
                    <Label htmlFor="profileRole">Role</Label>
                    <Input
                      id="profileRole"
                      value={profileData?.data?.data?.role || ""}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditProfileDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-rateup-blue to-rateup-blue"
                      disabled={isLoading}
                    >
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        );
      case "team":
        return <Team />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* Settings Navigation Sidebar */}
      <nav
        className="w-64 border-r bg-card flex flex-col h-full"
        aria-label="Settings navigation"
        role="navigation"
      >
        {/* Navigation Items */}
        <div className="flex-1">
          <div className="px-3 py-2.5">
            {settingsSections.map((category, categoryIndex) => (
              <div key={category.category} className="mb-1.5 last:mb-0">
                {/* Category Label */}
                <div className="px-2 mb-1">
                  <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    {category.category}
                  </h3>
                </div>

                {/* Category Items */}
                <div
                  className="space-y-1"
                  role="group"
                  aria-label={category.category}
                >
                  {category.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rateup-blue/50 ${
                        activeSection === item.id
                          ? "bg-gradient-to-r from-rateup-blue/10 to-rateup-orange/10 border border-rateup-blue/20 shadow-sm"
                          : "hover:bg-muted/50"
                      }`}
                      aria-label={`${item.label}: ${item.description}`}
                      aria-current={
                        activeSection === item.id ? "page" : undefined
                      }
                      tabIndex={0}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          activeSection === item.id
                            ? "bg-gradient-to-br from-rateup-blue to-rateup-orange"
                            : "bg-muted"
                        }`}
                      >
                        <item.icon
                          className={`w-3.5 h-3.5 ${
                            activeSection === item.id
                              ? "text-white"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p
                          className={`text-sm truncate ${
                            activeSection === item.id
                              ? "text-rateup-blue"
                              : "text-foreground"
                          }`}
                        >
                          {item.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                      {activeSection === item.id && (
                        <ChevronRight className="w-4 h-4 text-rateup-blue flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Divider between categories */}
                {categoryIndex < settingsSections.length - 1 && (
                  <Separator className="my-1.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t bg-gradient-to-r from-blue-50 to-orange-50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Need help?</p>
            <Button
              variant="link"
              className="h-auto p-0 text-xs text-rateup-blue hover:text-rateup-orange transition-colors"
              aria-label="Contact support team"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main
        className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/30 to-blue-50/20"
        role="main"
        aria-label="Settings content"
      >
        <div className="pl-6 pr-6 pb-6 max-w-7xl">{renderContent()}</div>
      </main>
    </div>
  );
};

export default ProfileSettings;

// "use client";

// import React, { useEffect, useRef, useState } from "react";

// import { isNotEmpty, useForm } from "@mantine/form";
// import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
// import { notifications } from "@mantine/notifications";
// import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";

// import {
//   useChangePasswordMutation,
//   useGetUserProfile,
//   useUpdateProfileMutation,
//   useUpdateProfilePhotoMutation,
// } from "../../../backend/user/user.query";
// import {
//   RateupButtonBlue,
//   RateupButtonSecondary,
// } from "../../../components/Button/RateupButtons";
// import {
//   ContainedPasswordInput,
//   ContainedSelection,
//   ContainedTextField,
// } from "../../../components/input/ContainedInput/ContainedInput";
// import { ImageCropModal } from "../../../components/Modal/ImageCropModal";
// import { mergeNames, retrieveRole } from "../../../utils/essential";
// import { uploadFile } from "../../../utils/file-upload/upload";
// import { passwordValidation } from "../../../utils/validation";
// import styles from "./setting.module.css";

// import "react-phone-number-input/style.css";

// import {
//   Building,
//   Camera,
//   Edit,
//   Globe,
//   Mail,
//   MapPin,
//   Phone,
//   Save,
//   ShoppingCart,
//   Store,
//   Upload,
// } from "lucide-react";
// import { useTranslations } from "next-intl";
// import PhoneInputWithCountrySelect, {
//   isValidPhoneNumber,
// } from "react-phone-number-input";
// import SelectR from "react-select";
// import countryList from "react-select-country-list";

// import {
//   useUpdateOrgDetailsMutation,
//   useUpdateOrgLogoMutation,
// } from "@/backend/org/org.query";
// import LocaleSwitcher from "@/components/translation/LocaleSwitcher";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Textarea } from "@/components/ui/textarea";
// import { useUser } from "@/context/UserContext";

// import { SAVE_HOTKEY } from "../../../utils/constants";

// const ProfileSettings = () => {
//   const translations = useTranslations();
//   const { isLoading: isProfileLoading, data: profileData } =
//     useGetUserProfile();
//   const { user } = useUser();
//   const countries = countryList().getData();

//   // ============ Forms ============
//   const orgForm = useForm({
//     initialValues: {
//       name: "",
//       phone: "",
//       address: "",
//       location: "",
//       industry: "",
//       website: "",
//       businessmail: "",
//     },
//     validate: {
//       name: isNotEmpty(translations("Name cannot be blank")),
//       phone: (value) => {
//         if (value && !isValidPhoneNumber(value))
//           return translations("Invalid phone number");
//         return null;
//       },
//     },
//   });

//   const profileForm = useForm({
//     initialValues: {
//       title: "",
//       fullname: "",
//       phone: "",
//       existingPassword: "",
//       newPassword: "",
//       confirmPassword: "",
//     },
//     validate: {
//       title: isNotEmpty(translations("Select a title")),
//       fullname: isNotEmpty(translations("Name Cannot be blank")),
//       phone: (value) => {
//         if (value && !isValidPhoneNumber(value))
//           return translations("Invalid phone number");
//         return null;
//       },
//       existingPassword: (value, values) =>
//         isAnyPasswordFieldDirty(values) ? passwordValidation(value) : null,
//       newPassword: (value, values) =>
//         isAnyPasswordFieldDirty(values) ? passwordValidation(value) : null,
//       confirmPassword: (value, values) => {
//         if (value !== values.newPassword && isAnyPasswordFieldDirty(values)) {
//           return translations(
//             "New Password and Confirm Password did not match",
//           );
//         }
//         return null;
//       },
//     },
//   });

//   function isAnyPasswordFieldDirty(values) {
//     return (
//       values.existingPassword !== "" ||
//       values.newPassword !== "" ||
//       values.confirmPassword !== "" ||
//       profileForm.isDirty("existingPassword") ||
//       profileForm.isDirty("newPassword") ||
//       profileForm.isDirty("confirmPassword")
//     );
//   }

//   // ============ States ============
//   const [isLoading, setIsLoading] = useState(false);
//   const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
//   const [file, setFile] = useState<File | null>(null);
//   const [avatarSrc, setAvatarSrc] = useState(
//     `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/profile-photo.png`,
//   );
//   const [orgAvatarSrc, setOrgAvatarSrc] = useState("");
//   const [selectedImage, setSelectedImage] = useState({ url: "", name: "" });
//   const resetRef = useRef<HTMLInputElement>(null);

//   const [
//     openedCropDialog,
//     { toggle: toggleCropDialog, close: closeCropDialog },
//   ] = useDisclosure(false);

//   // ============ Mutations ============
//   const updateProfile = useUpdateProfileMutation(setIsLoading);
//   const changePassword = useChangePasswordMutation(setIsLoading);
//   const updateLogo = useUpdateOrgLogoMutation(setIsLoading);
//   const updateProfilePhoto = useUpdateProfilePhotoMutation(setIsLoading);
//   const orgDetailsUpdate = useUpdateOrgDetailsMutation();

//   // ============ Profile Submission ============
//   const onSubmit = (values) => {
//     setIsLoading(true);
//     const data = {
//       title: values.title,
//       name: values.fullname,
//       phone: values.phone ?? "",
//     };

//     if (isAnyPasswordFieldDirty(values)) {
//       const passwordData = {
//         existingPassword: values.existingPassword,
//         newPassword: values.newPassword,
//       };
//       changePassword.mutate(passwordData);
//       profileForm.setValues({
//         existingPassword: "",
//         newPassword: "",
//         confirmPassword: "",
//       });
//     }

//     updateProfile.mutate(data, {
//       onSuccess: () => {
//         setIsEditProfileDialogOpen(false);
//         notifications.show({
//           title: translations("Success"),
//           message: translations("Profile updated successfully"),
//           color: "green",
//         });
//       },
//       onError: () => {
//         notifications.show({
//           title: translations("Error"),
//           message: translations("Failed to update profile"),
//           color: "red",
//         });
//       },
//     });
//   };

//   // ============ Effects ============
//   useEffect(() => {
//     if (profileData?.data?.data) {
//       const profile = profileData.data.data;
//       profileForm.setValues({
//         title: profile.gender || "",
//         fullname: profile.name || "",
//         phone: profile.phone || "",
//       });

//       const profilePhoto = profile.profilePhoto;
//       if (profilePhoto && profilePhoto !== "REMOVED_PHOTO") {
//         setAvatarSrc(
//           `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${profilePhoto}`,
//         );
//       }
//     }
//   }, [profileData]);

//   useEffect(() => {
//     if (user) {
//       orgForm.setValues({
//         name: user?.orgName ?? "",
//         phone: user?.orgPhone ?? "",
//         address: user?.orgAddress ?? "",
//         location: user?.onboarding?.location ?? "",
//         website: user?.onboarding?.website ?? "",
//         industry: user?.onboarding?.industry ?? "",
//         businessmail: user?.onboarding?.businessmail ?? "",
//       });

//       if (user.orgLogo && user.orgLogo !== "REMOVED_PHOTO") {
//         setOrgAvatarSrc(
//           `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.orgLogo}`,
//         );
//       }
//     }
//   }, [user]);

//   useEffect(() => {
//     if (file) {
//       const uploadAndUpdate = async () => {
//         const fileKey = await uploadFile(file);
//         if (typeof fileKey === "string") {
//           const data = { profilePhoto: fileKey };
//           updateProfilePhoto.mutate(data, {
//             onSuccess: () => {
//               notifications.update({
//                 id: "upload-photo",
//                 title: translations("Success"),
//                 message: translations("Profile photo updated successfully"),
//                 color: "green",
//                 loading: false,
//                 autoClose: 3000,
//               });
//             },
//           });
//           notifications.show({
//             id: "upload-photo",
//             loading: true,
//             title: translations("Uploading photo"),
//             message: translations("Hold on, changing your profile photo"),
//             autoClose: false,
//             withCloseButton: false,
//           });
//         }
//       };
//       uploadAndUpdate();
//     }
//   }, [file]);

//   // ============ Image Upload ============
//   const handleImagePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     toggleCropDialog();
//     setSelectedImage({
//       name: file.name,
//       url: URL.createObjectURL(file),
//     });
//     if (resetRef?.current) e.target.value = "";
//   };

//   const handleCropImageSave = (croppedImage: File) => {
//     setFile(croppedImage);
//     closeCropDialog();
//   };

//   const onOrgSubmit = (values) => {
//     const data = {
//       name: values.name,
//       phone: values?.phone ?? "",
//       address: values?.address ?? "",
//       location: values?.location ?? "",
//       website: values?.website ?? "",
//       industry: values?.industry ?? "",
//       businessmail: values?.businessmail ?? "",
//     };
//     notifications.show({
//       id: "load-data",
//       loading: true,
//       title: translations("Updating Organization info"),
//       message: translations("Hold on, Organization info is getting updated"),
//       autoClose: false,
//       withCloseButton: false,
//     });
//     orgDetailsUpdate.mutate(data);
//   };

//   const industries = [
//     "E-commerce",
//     "Retail",
//     "Restaurant & Food",
//     "Healthcare",
//     "Education",
//     "Real Estate",
//     "Financial Services",
//     "Travel & Tourism",
//     "Technology",
//     "Beauty & Wellness",
//     "Automotive",
//     "Entertainment",
//     "Other",
//   ];

//   return (
//     <div className="p-4 flex flex-col gap-2">
//       <div>
//         <h2 className="text-2xl mb-1">Account Settings</h2>
//         <p className="text-sm text-muted-foreground">
//           Manage your profile, business information and account preferences
//         </p>
//       </div>

//       {/* User Profile Section */}
//       <Card className="p-4 sm:p-6 shadow-sm border-gray-200 bg-gradient-to-br from-white to-gray-50/50">
//         <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
//           {/* Avatar Section */}
//           <div className="relative group">
//             <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white shadow-lg">
//               <AvatarImage src={avatarSrc || ""} />
//               <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-2xl">
//                 {profileData?.data?.data?.name?.slice(0, 1)}
//               </AvatarFallback>
//             </Avatar>
//             <button
//               onClick={() => setIsEditProfileDialogOpen(true)}
//               className="absolute bottom-0 right-0 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-full p-1.5 sm:p-2 shadow-md transition-all group-hover:scale-110"
//             >
//               <Camera className="w-4 h-4 text-gray-600" />
//             </button>
//           </div>

//           {/* Profile Details */}
//           <div className="flex-1 text-center sm:text-left w-full">
//             <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
//               {/* Name + Info */}
//               <div className="flex flex-col gap-0.5">
//                 <p className="text-lg sm:text-xl font-medium text-gray-900">
//                   {profileData?.data?.data?.name}
//                 </p>
//                 <p className="text-xs sm:text-sm text-gray-600">
//                   {profileData?.data?.data?.email} • Member since{" "}
//                   {new Date(profileData?.data?.data?.createdAt).getFullYear()}
//                 </p>

//                 {/* Status Badges */}
//                 <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
//                   <Badge
//                     className={`${
//                       profileData?.data?.data?.active
//                         ? "bg-green-600"
//                         : "bg-gray-400"
//                     } text-white text-xs sm:text-sm`}
//                   >
//                     {profileData?.data?.data?.active
//                       ? "Active Account"
//                       : "Inactive Account"}
//                   </Badge>
//                   <Badge
//                     variant="outline"
//                     className="border-purple-500 text-purple-600 text-xs sm:text-sm"
//                   >
//                     {profileData?.data?.data?.role}
//                   </Badge>
//                 </div>
//               </div>

//               {/* Edit Button */}
//               <div className="flex justify-center sm:justify-end">
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   className="gap-2 w-full sm:w-auto mt-2 sm:mt-0"
//                   onClick={() => setIsEditProfileDialogOpen(true)}
//                 >
//                   <Edit className="w-4 h-4" />
//                   Edit Profile
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </Card>

//       {/* Business Information */}
//       <Card className="p-6 shadow-sm border-gray-200">
//         <div className="flex items-center gap-3 mb-5">
//           <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rateup-blue to-rateup-orange flex items-center justify-center">
//             <Building className="w-5 h-5 text-white" />
//           </div>
//           <div>
//             <h3 className="mb-0">Business Information</h3>
//             <p className="text-xs text-muted-foreground">
//               Your company details and contact information
//             </p>
//           </div>
//         </div>
//         <div>
//           <form onSubmit={orgForm.onSubmit(onOrgSubmit)} className="w-full">
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//               <div className="space-y-2">
//                 <Label
//                   htmlFor="businessName"
//                   className="text-xs text-muted-foreground flex items-center gap-1.5"
//                 >
//                   <Store className="w-3.5 h-3.5" />
//                   Business Name
//                 </Label>
//                 <Input
//                   id="businessName"
//                   defaultValue={user?.orgName}
//                   {...orgForm.getInputProps("name")}
//                   placeholder="Enter your business name"
//                   className="h-9 border-gray-200 focus:border-rateup-blue bg-white text-sm"
//                 />
//               </div>
//               <div className="space-y-2 w-full">
//                 <Label
//                   htmlFor="industry"
//                   className="text-xs text-muted-foreground flex items-center gap-1.5"
//                 >
//                   <ShoppingCart className="w-3.5 h-3.5" />
//                   Industry
//                 </Label>
//                 <Select
//                   defaultValue={user?.onboarding?.industry || "E-commerce"}
//                   onValueChange={(val) =>
//                     orgForm.setFieldValue("industry", val)
//                   }
//                 >
//                   <SelectTrigger className="h-9 border-gray-200 focus:border-rateup-blue bg-white text-sm w-full">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {industries.map((industry) => (
//                       <SelectItem key={industry} value={industry}>
//                         {industry}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div className="space-y-2">
//                 <Label
//                   htmlFor="website"
//                   className="text-xs text-muted-foreground flex items-center gap-1.5"
//                 >
//                   <Globe className="w-3.5 h-3.5" />
//                   Website
//                 </Label>
//                 <Input
//                   id="website"
//                   {...orgForm.getInputProps("website")}
//                   placeholder="https://your-website.com"
//                   className="h-9 border-gray-200 focus:border-rateup-blue bg-white text-sm"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label
//                   htmlFor="businessPhone"
//                   className="text-xs text-muted-foreground flex items-center gap-1.5"
//                 >
//                   <Phone className="w-3.5 h-3.5" />
//                   Business Phone
//                 </Label>
//                 <Input
//                   id="businessPhone"
//                   {...orgForm.getInputProps("phone")}
//                   placeholder="+1 (555) 123-4567"
//                   className="h-9 border-gray-200 focus:border-rateup-blue bg-white text-sm"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label
//                   htmlFor="businessEmail"
//                   className="text-xs text-muted-foreground flex items-center gap-1.5"
//                 >
//                   <Mail className="w-3.5 h-3.5" />
//                   Business Email
//                 </Label>
//                 <Input
//                   id="businessEmail"
//                   type="email"
//                   {...orgForm.getInputProps("businessmail")}
//                   placeholder="business@company.com"
//                   className="h-9 border-gray-200 focus:border-rateup-blue bg-white text-sm"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label
//                   htmlFor="location"
//                   className="text-xs text-muted-foreground flex items-center gap-1.5"
//                 >
//                   <MapPin className="w-3.5 h-3.5" />
//                   Location
//                 </Label>
//                 <SelectR
//                   options={countries}
//                   value={
//                     countries.find(
//                       (country) => country.label === orgForm.values.location,
//                     ) || null
//                   }
//                   onChange={(option) =>
//                     orgForm.setFieldValue("location", option?.label || "")
//                   }
//                   placeholder={translations("Select Your Location")}
//                   isSearchable
//                   className="rounded-md text-sm bg-white [&>input]:w-full border-gray-200"
//                 />
//               </div>
//               <div className="md:col-span-2 lg:col-span-3 space-y-2">
//                 <Label
//                   htmlFor="address"
//                   className="text-xs text-muted-foreground flex items-center gap-1.5"
//                 >
//                   <Building className="w-3.5 h-3.5" />
//                   Business Address
//                 </Label>
//                 <Textarea
//                   id="address"
//                   {...orgForm.getInputProps("address")}
//                   placeholder="Enter your complete business address"
//                   className="border-gray-200 focus:border-rateup-blue bg-white text-sm resize-none"
//                   rows={2}
//                 />
//               </div>
//             </div>
//             <div className="flex justify-end items-center pt-2 w-full">
//               <Button className="bg-gradient-to-r from-rateup-blue to-rateup-orange hover:shadow-lg transition-all">
//                 <Save className="w-4 h-4 mr-2" />
//                 Save Changes
//               </Button>
//             </div>
//           </form>
//         </div>
//       </Card>

//       {/* Image Crop Modal */}
//       <ImageCropModal
//         opened={openedCropDialog}
//         onclose={closeCropDialog}
//         imageName={selectedImage.name}
//         handleCropImageSave={handleCropImageSave}
//         image={selectedImage.url}
//         aspect={1}
//       />

//       {/* Edit Profile Dialog */}
//       <Dialog
//         open={isEditProfileDialogOpen}
//         onOpenChange={setIsEditProfileDialogOpen}
//       >
//         <DialogContent className="sm:max-w-[500px]">
//           <DialogHeader>
//             <DialogTitle>Edit Profile</DialogTitle>
//             <DialogDescription>
//               Update your personal information and preferences
//             </DialogDescription>
//           </DialogHeader>

//           <form
//             onSubmit={profileForm.onSubmit(onSubmit)}
//             className="space-y-4 py-4"
//           >
//             {/* Profile Image Upload */}
//             <div className="flex items-center gap-6">
//               <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
//                 <AvatarImage src={avatarSrc} />
//                 <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-xl">
//                   {profileData?.data?.data?.name?.slice(0, 1) || "U"}
//                 </AvatarFallback>
//               </Avatar>
//               <div className="flex-1">
//                 <Label htmlFor="profileImageUpload" className="cursor-pointer">
//                   <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-fit">
//                     <Upload className="w-4 h-4" />
//                     <span className="text-sm">Upload Photo</span>
//                   </div>
//                   <input
//                     ref={resetRef}
//                     id="profileImageUpload"
//                     type="file"
//                     accept="image/png,image/jpeg,image/svg+xml,image/webp"
//                     className="hidden"
//                     onChange={handleImagePicker}
//                   />
//                 </Label>
//                 <p className="text-xs text-muted-foreground mt-2">
//                   JPG, PNG or GIF. Max size 2MB.
//                 </p>
//               </div>
//             </div>

//             {/* Title/Gender */}
//             <div className="space-y-2">
//               <Label htmlFor="title">
//                 Title <span className="text-red-500">*</span>
//               </Label>
//               <Select
//                 value={profileForm.values.title}
//                 onValueChange={(value) =>
//                   profileForm.setFieldValue("title", value)
//                 }
//                 required
//               >
//                 <SelectTrigger className="w-full">
//                   <SelectValue placeholder="Select title" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="MALE">Mr</SelectItem>
//                   <SelectItem value="FEMALE">Mrs</SelectItem>
//                   <SelectItem value="OTHER">Mx</SelectItem>
//                 </SelectContent>
//               </Select>
//               {profileForm.errors.title && (
//                 <p className="text-xs text-red-500">
//                   {profileForm.errors.title}
//                 </p>
//               )}
//             </div>

//             {/* Full Name */}
//             <div className="space-y-2">
//               <Label htmlFor="fullname">
//                 Full Name <span className="text-red-500">*</span>
//               </Label>
//               <Input
//                 id="fullname"
//                 placeholder="Enter your full name"
//                 {...profileForm.getInputProps("fullname")}
//               />
//               {profileForm.errors.fullname && (
//                 <p className="text-xs text-red-500">
//                   {profileForm.errors.fullname}
//                 </p>
//               )}
//             </div>

//             {/* Email - Read Only */}
//             <div className="space-y-2">
//               <Label htmlFor="profileEmail">Email Address</Label>
//               <Input
//                 id="profileEmail"
//                 type="email"
//                 value={profileData?.data?.data?.email || ""}
//                 disabled={true}
//                 readOnly
//                 className="bg-gray-100 cursor-not-allowed opacity-70"
//               />
//             </div>

//             {/* Phone */}
//             <div className="space-y-2">
//               <Label htmlFor="profilePhone">Phone Number</Label>
//               <PhoneInputWithCountrySelect
//                 defaultCountry="IN"
//                 international
//                 countryCallingCodeEditable={false}
//                 placeholder="Phone Number"
//                 {...profileForm.getInputProps("phone")}
//                 className="rounded-md border border-gray-300 px-2 py-1 w-full"
//               />
//               {profileForm.errors.phone && (
//                 <p className="text-xs text-red-500">
//                   {profileForm.errors.phone}
//                 </p>
//               )}
//             </div>

//             {/* Role - Read Only */}
//             <div className="space-y-2">
//               <Label htmlFor="profileRole">Role</Label>
//               <Input
//                 id="profileRole"
//                 value={profileData?.data?.data?.role || ""}
//                 disabled
//                 className="bg-gray-50"
//               />
//             </div>

//             <DialogFooter>
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => setIsEditProfileDialogOpen(false)}
//               >
//                 Cancel
//               </Button>
//               <Button
//                 type="submit"
//                 className="bg-gradient-to-r from-rateup-blue to-rateup-orange"
//                 disabled={isLoading}
//               >
//                 {isLoading ? "Saving..." : "Save Changes"}
//               </Button>
//             </DialogFooter>
//           </form>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };

// export default ProfileSettings;
