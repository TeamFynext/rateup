"use client";

import React, { useEffect, useRef, useState } from "react";

import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";

import "react-phone-number-input/style.css";

import {
  Building,
  Camera,
  Edit,
  Globe,
  Home,
  Mail,
  MapPin,
  Phone,
  Upload,
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
import {
  useGetUserProfile,
  useUpdateProfileMutation,
  useUpdateProfilePhotoMutation,
} from "@/backend/user/user.query";
import { BusinessHoursSection } from "@/components/account/business-hours/BusinessHoursSection";
import { ImageCropModal } from "@/components/Modal/ImageCropModal";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/utils/enums";
import { uploadFile } from "@/utils/file-upload/upload";

export default function Account() {
  const translations = useTranslations();
  const { isLoading: isProfileLoading, data: profileData } =
    useGetUserProfile();
  const { user } = useUser();
  const countries = countryList().getData();

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
      businessmail: (value) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return translations("Invalid email address");
        return null;
      },
    },
  });

  const profileForm = useForm({
    initialValues: {
      title: "",
      fullname: "",
      phone: "",
    },
    validate: {
      title: isNotEmpty(translations("Select a title")),
      fullname: isNotEmpty(translations("Name Cannot be blank")),
      phone: (value) => {
        if (value && !isValidPhoneNumber(value))
          return translations("Invalid phone number");
        return null;
      },
    },
  });

  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [isLogoUpload, setIsLogoUpload] = useState(false);

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
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);
  const updateProfile = useUpdateProfileMutation(setIsLoadingUpload);
  const updateLogo = useUpdateOrgLogoMutation(setIsLoadingUpload);
  const updateProfilePhoto = useUpdateProfilePhotoMutation(setIsLoadingUpload);
  const orgDetailsUpdate = useUpdateOrgDetailsMutation();

  const onSubmit = (values) => {
    const data = {
      title: values.title,
      name: values.fullname,
      phone: values.phone ?? "",
    };

    updateProfile.mutate(data);
  };

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
          }
        }
      };

      uploadAndUpdate();
      setIsLogoUpload(false);
    }
  }, [file]);

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

  useEffect(() => {
    if (updateProfilePhoto.isPending) {
      notifications.show({
        id: "upload-photo",
        loading: true,
        title: translations("Uploading photo"),
        message: translations("Hold on, changing your profile photo"),
        autoClose: false,
        withCloseButton: false,
      });
      if (updateLogo.isPending) {
        notifications.show({
          id: "upload-photo",
          loading: true,
          title: translations("Uploading photo"),
          message: translations("Hold on, changing your organization photo"),
          autoClose: false,
          withCloseButton: false,
        });
      }
    }
  }, [updateLogo.isPending, updateProfilePhoto.isPending]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h2 className="text-2xl mb-1">{translations("Account Settings")}</h2>
        <p className="text-sm text-muted-foreground">
          {translations(
            "Manage your profile, business information and account preferences",
          )}
        </p>
      </div>

      {/* User Profile Section */}
      {isProfileLoading ? (
        <Card className="p-4 sm:p-6 shadow-sm border-gray-200 bg-gradient-to-br from-white to-gray-50/50">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Avatar Skeleton */}
            <div className="relative">
              <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full" />
              <Skeleton className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white" />
            </div>

            {/* Text Skeleton */}
            <div className="flex-1 text-center sm:text-left w-full">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                <div className="flex flex-col gap-2 w-full">
                  <Skeleton className="h-5 sm:h-6 w-40 sm:w-48 mx-auto sm:mx-0" />
                  <Skeleton className="h-3 sm:h-4 w-56 sm:w-64 mx-auto sm:mx-0" />
                  <div className="flex justify-center sm:justify-start gap-2 mt-2">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20 mx-auto sm:mx-0 rounded-md" />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 sm:p-6 shadow-sm border-gray-200 bg-gradient-to-br from-white to-gray-50/50">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Avatar Section */}
            <div className="relative group">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white shadow-lg">
                <AvatarImage src={avatarSrc || ""} />
                <AvatarFallback className="bg-primary text-white text-2xl">
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
                    {profileData?.data?.data?.email} •{" "}
                    {translations("Member since")}{" "}
                    {profileData?.data?.data?.createdAt
                      ? new Date(profileData.data.data.createdAt).getFullYear()
                      : "—"}
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
                    {translations("Edit")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Business Information Modal Trigger */}
      <Card className="p-6 shadow-sm border-gray-200 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="">{translations("Business Information")}</h3>
              <p className="text-xs text-muted-foreground">
                {translations("Your company details and contact information")}
              </p>
            </div>
          </div>
          {user?.role === UserRole.SUPADM && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsBusinessDialogOpen(true)}
            >
              <Edit className="w-4 h-4" />
              {translations("Edit")}
            </Button>
          )}
        </div>

        {/* Business Overview */}
        <div className="flex items-center gap-4 mt-2">
          <div className="relative">
            <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
              <AvatarImage src={orgAvatarSrc} />
              <AvatarFallback className="bg-primary text-white text-lg">
                {user?.orgName?.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            {user?.role === UserRole.SUPADM && (
              <button
                onClick={() => setIsBusinessDialogOpen(true)}
                className="absolute bottom-0 right-0 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-full p-1 sm:p-1.5 shadow-md transition-all hover:scale-110"
              >
                <Camera className="w-3 h-3 text-gray-600" />
              </button>
            )}
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
              <p className="font-medium text-gray-700 mb-0.5">
                {translations("Phone")}
              </p>
              <p className="text-gray-500">{orgForm?.values?.phone || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Mail className="w-4 h-4 mt-0.5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 mb-0.5">
                {translations("Email")}
              </p>
              <p className="text-gray-500">
                {user?.onboarding?.businessmail || "—"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Globe className="w-4 h-4 mt-0.5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 mb-0.5">
                {translations("Website")}
              </p>
              <p className="text-gray-500">
                {user?.onboarding?.website || "—"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 mb-0.5">
                {translations("Location")}
              </p>
              <p className="text-gray-500">
                {user?.onboarding?.location || "—"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 md:col-span-2">
            <Home className="w-4 h-4 mt-0.5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 mb-0.5">
                {translations("Address")}
              </p>
              <p className="text-gray-500">{orgForm?.values?.address || "—"}</p>
            </div>
          </div>
        </div>
      </Card>
      {/* Business Information Dialog */}
      {user?.role === UserRole.SUPADM && (
        <Dialog
          open={isBusinessDialogOpen}
          onOpenChange={setIsBusinessDialogOpen}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{translations("Business Information")}</DialogTitle>
              <DialogDescription>
                {translations(
                  "Update your organization details and upload your company logo",
                )}
                .
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
                  <AvatarFallback className="bg-primary text-white text-xl">
                    {user?.orgName?.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="orgLogoUpload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-fit">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">
                        {translations("Upload Logo")}
                      </span>
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
                    {translations("JPG, PNG or GIF")}.
                    {translations("Max size 2MB")}.
                  </p>
                </div>
              </div>

              {/* Organization Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">
                    {translations("Business Name")}
                  </Label>
                  <Input
                    id="businessName"
                    {...orgForm.getInputProps("name")}
                    placeholder={translations("Enter your business name")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">{translations("Industry")}</Label>
                  <Select
                    defaultValue={user?.onboarding?.industry || "E-commerce"}
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
                  <Label htmlFor="website">{translations("Website")}</Label>
                  <Input
                    id="website"
                    {...orgForm.getInputProps("website")}
                    placeholder="https://your-website.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessPhone">
                    {translations("Business Phone")}
                  </Label>
                  <PhoneInputWithCountrySelect
                    defaultCountry="IN"
                    international
                    countryCallingCodeEditable={false}
                    placeholder={translations("Phone Number")}
                    value={orgForm?.values?.phone || ""}
                    {...orgForm?.getInputProps("phone")}
                    className="rounded-md border border-gray-300 px-2 py-1 w-full"
                  />
                  {orgForm.errors.phone && (
                    <p className="text-xs text-red-500">
                      {orgForm.errors.phone}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessEmail">
                    {translations("Business Email")}
                  </Label>
                  <Input
                    id="businessEmail"
                    {...orgForm.getInputProps("businessmail")}
                    placeholder="business@company.com"
                  />
                  {orgForm.errors.businessmail && (
                    <p className="text-xs text-red-500">
                      {orgForm.errors.businessmail}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">{translations("Location")}</Label>
                  <SelectR
                    options={countries}
                    value={
                      countries.find(
                        (country) => country.label === orgForm.values.location,
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
                  <Label htmlFor="address">{translations("Address")}</Label>
                  <Textarea
                    id="address"
                    {...orgForm.getInputProps("address")}
                    placeholder={translations(
                      "Enter your complete business address",
                    )}
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
                  {translations("Cancel")}
                </Button>
                <Button type="submit" className="bg-primary">
                  {translations("Save Changes")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Card className="p-5 shadow-sm border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="mb-0">{translations("Regional Settings")}</h4>
            <p className="text-xs text-muted-foreground">
              {translations("language preferences")}
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
            <DialogTitle>{translations("Edit Profile")}</DialogTitle>
            <DialogDescription>
              {translations("Update your personal information and preferences")}
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
                <AvatarFallback className="bg-primary text-white text-xl">
                  {profileData?.data?.data?.name?.slice(0, 1) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="profileImageUpload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-fit">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">
                      {translations("Upload Photo")}
                    </span>
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
                  {translations("JPG, PNG or GIF")}.{" "}
                  {translations("Max size 2MB")}.
                </p>
              </div>
            </div>

            {/* Title/Gender */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {translations("Title")} <span className="text-red-500">*</span>
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
                {translations("Full Name")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullname"
                placeholder={translations("Enter your full name")}
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
              <Label htmlFor="profileEmail">
                {translations("Email Address")}
              </Label>
              <Input
                id="profileEmail"
                type="email"
                value={profileData?.data?.data?.email || ""}
                disabled={true}
                readOnly
                className="bg-gray-100 cursor-not-allowed opacity-70"
              />
              {profileForm.errors.email && (
                <p className="text-xs text-red-500">
                  {profileForm.errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="profilePhone">
                {translations("Phone Number")}
              </Label>
              <PhoneInputWithCountrySelect
                defaultCountry="IN"
                international
                countryCallingCodeEditable={false}
                placeholder={translations("Phone Number")}
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
              <Label htmlFor="profileRole">{translations("Role")}</Label>
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
                {translations("Cancel")}
              </Button>
              <Button type="submit" className="bg-primary" disabled={false}>
                {translations("Save Changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Business Hours Section */}
      <BusinessHoursSection canManage={user?.role === UserRole.SUPADM} />
    </div>
  );
}
