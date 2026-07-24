import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { Building, Camera, Edit, Globe, Home, Mail, MapPin, Phone, Upload } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import "react-phone-number-input/style.css";

import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import SelectR from "react-select";
import countryList from "react-select-country-list";
import { toast } from "sonner";
import z from "zod";

import { useUpdateOrgDetailsMutation, useUpdateOrgLogoMutation } from "@/backend/org/org.query";
import {
  useGetUserProfile,
  useUpdateProfileMutation,
  useUpdateProfilePhotoMutation,
} from "@/backend/user/user.query";
import { BusinessHoursSection } from "@/components/account/business-hours/BusinessHoursSection.tsx";
import { ImageCropModal } from "@/components/Modal/ImageCropModal.tsx";
import LocaleSwitcher from "@/components/translation/LocaleSwitcher.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import { UserRole } from "@/utils/enums/index.ts";
import { uploadFile } from "@/utils/file-upload/upload.ts";

export const Route = createFileRoute("/dashboard/settings/account/")({
  component: Account,
});

function Account() {
  const { t: translations } = useTranslation();
  const { isLoading: isProfileLoading, data: profileData } = useGetUserProfile();
  const { user } = useUser();
  const countries = countryList().getData();

  const orgFormSchema = z.object({
    name: z.string().trim().min(1, translations("Name cannot be blank")),
    phone: z
      .string()
      .refine((value) => !value || isValidPhoneNumber(value), translations("Invalid phone number")),
    address: z.string(),
    location: z.string(),
    industry: z.string(),
    website: z.string(),
    businessmail: z.email(translations("Invalid email address")),
  });

  const profileFormSchema = z.object({
    title: z.string().trim().min(1, translations("Select a title")),
    fullname: z.string().trim().min(1, translations("Name Cannot be blank")),
    phone: z
      .string()
      .refine((value) => !value || isValidPhoneNumber(value), translations("Invalid phone number")),
  });

  type OrgFormValues = z.infer<typeof orgFormSchema>;
  type ProfileFormValues = z.infer<typeof profileFormSchema>;

  const orgForm = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      location: "",
      industry: "",
      website: "",
      businessmail: "",
    },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      title: "",
      fullname: "",
      phone: "",
    },
  });

  const orgPhone = orgForm.watch("phone");
  const orgAddress = orgForm.watch("address");

  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [isLogoUpload, setIsLogoUpload] = useState(false);

  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [avatarSrc, setAvatarSrc] = useState(
    `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/profile-photo.png`,
  );
  const [orgAvatarSrc, setOrgAvatarSrc] = useState("");
  const [selectedImage, setSelectedImage] = useState({ url: "", name: "" });
  const resetRef = useRef<HTMLInputElement>(null);
  const [openedCropDialog, { toggle: toggleCropDialog, close: closeCropDialog }] =
    useDisclosure(false);
  const [, setIsLoadingUpload] = useState(false);
  const updateProfile = useUpdateProfileMutation();
  const updateLogo = useUpdateOrgLogoMutation(setIsLoadingUpload);
  const updateProfilePhoto = useUpdateProfilePhotoMutation(setIsLoadingUpload);
  const orgDetailsUpdate = useUpdateOrgDetailsMutation();

  const onSubmit = (values: ProfileFormValues) => {
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
      profileForm.reset({
        title: profile.gender || "",
        fullname: profile.name || "",
        phone: profile.phone || "",
      });

      const profilePhoto = profile.profilePhoto;
      if (profilePhoto && profilePhoto !== "REMOVED_PHOTO") {
        setAvatarSrc(`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${profilePhoto}`);
      }
    }
  }, [profileData]);

  useEffect(() => {
    if (user) {
      orgForm.reset({
        name: user?.orgName ?? "",
        phone: user?.orgPhone ?? "",
        address: user?.orgAddress ?? "",
        location: user?.onboarding?.location ?? "",
        website: user?.onboarding?.website ?? "",
        industry: user?.onboarding?.industry ?? "",
        businessmail: user?.onboarding?.businessmail ?? "",
      });

      if (user.orgLogo && user.orgLogo !== "REMOVED_PHOTO") {
        setOrgAvatarSrc(`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${user.orgLogo}`);
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

              toast.loading(translations("Hold on, changing your organization Logo"), {
                id: "load-data",
              });
            }
          } else {
            const data = { profilePhoto: fileKey };
            updateProfilePhoto.mutate(data, {
              onSuccess: () => {
                toast.success(translations("Profile photo updated successfully"), {
                  id: "upload-photo",
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

  const onOrgSubmit = (values: OrgFormValues) => {
    const data = {
      name: values.name,
      phone: values?.phone ?? "",
      address: values?.address ?? "",
      location: values?.location ?? "",
      website: values?.website ?? "",
      industry: values?.industry ?? "",
      businessmail: values?.businessmail ?? "",
    };
    toast.loading(translations("Hold on, Organization info is getting updated.."), {
      id: "load-data",
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
      toast.loading(translations("Hold on, changing your profile photo"), {
        id: "upload-photo",
      });
      if (updateLogo.isPending) {
        toast.loading(translations("Hold on, changing your organization photo"), {
          id: "upload-photo",
        });
      }
    }
  }, [updateLogo.isPending, updateProfilePhoto.isPending]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h2 className="text-2xl mb-1">{translations("Account Settings")}</h2>
        <p className="text-sm text-muted-foreground">
          {translations("Manage your profile, business information and account preferences")}
        </p>
      </div>
      {/* User Profile Section */}
      {isProfileLoading ? (
        <Card className="p-4 sm:p-6 shadow-sm border-gray-200 bg-linear-to-br from-white to-gray-50/50">
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
        <Card className="p-4 sm:p-6 shadow-sm border-gray-200 bg-linear-to-br from-white to-gray-50/50">
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
                    {profileData?.data?.data?.email} • {translations("Member since")}{" "}
                    {profileData?.data?.data?.createdAt
                      ? new Date(profileData.data.data.createdAt).getFullYear()
                      : "—"}
                  </p>

                  {/* Status Badges */}
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                    <Badge
                      className={`${
                        profileData?.data?.data?.active ? "bg-green-600" : "bg-gray-400"
                      } text-white text-xs sm:text-sm`}
                    >
                      {profileData?.data?.data?.active ? "Active Account" : "Inactive Account"}
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
            <p className="text-xs text-gray-500 mt-1">{user?.onboarding?.industry}</p>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div className="flex items-start gap-2.5">
            <Phone className="w-4 h-4 mt-0.5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 mb-0.5">{translations("Phone")}</p>
              <p className="text-gray-500">{orgPhone || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Mail className="w-4 h-4 mt-0.5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 mb-0.5">{translations("Email")}</p>
              <p className="text-gray-500">{user?.onboarding?.businessmail || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Globe className="w-4 h-4 mt-0.5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 mb-0.5">{translations("Website")}</p>
              <p className="text-gray-500">{user?.onboarding?.website || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 mb-0.5">{translations("Location")}</p>
              <p className="text-gray-500">{user?.onboarding?.location || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 md:col-span-2">
            <Home className="w-4 h-4 mt-0.5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 mb-0.5">{translations("Address")}</p>
              <p className="text-gray-500">{orgAddress || "—"}</p>
            </div>
          </div>
        </div>
      </Card>
      {/* Business Information Dialog */}
      {user?.role === UserRole.SUPADM && (
        <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{translations("Business Information")}</DialogTitle>
              <DialogDescription>
                {translations("Update your organization details and upload your company logo")}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={orgForm.handleSubmit(onOrgSubmit)} className="py-4">
              <FieldGroup className="gap-4">
                {/* Logo Upload */}
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                    <AvatarImage src={orgAvatarSrc || ""} />
                    <AvatarFallback className="bg-primary text-white text-xl">
                      {user?.orgName?.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <FieldLabel htmlFor="orgLogoUpload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-fit">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{translations("Upload Logo")}</span>
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
                    </FieldLabel>
                    <p className="text-xs text-muted-foreground mt-2">
                      {translations("JPG, PNG or GIF")}.{translations("Max size 2MB")}.
                    </p>
                  </div>
                </div>

                {/* Organization Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="name"
                    control={orgForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="businessName">
                          {translations("Business Name")}
                        </FieldLabel>
                        <Input
                          {...field}
                          id="businessName"
                          aria-invalid={fieldState.invalid}
                          placeholder={translations("Enter your business name")}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="industry"
                    control={orgForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="industry">{translations("Industry")}</FieldLabel>
                        <Select
                          name={field.name}
                          value={field.value}
                          onValueChange={field.onChange}
                          items={industries.map((industry) => ({
                            value: industry,
                            label: industry,
                          }))}
                        >
                          <SelectTrigger
                            id="industry"
                            className="w-full"
                            aria-invalid={fieldState.invalid}
                          >
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
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="website"
                    control={orgForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="website">{translations("Website")}</FieldLabel>
                        <Input
                          {...field}
                          id="website"
                          aria-invalid={fieldState.invalid}
                          placeholder="https://your-website.com"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="phone"
                    control={orgForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="businessPhone">
                          {translations("Business Phone")}
                        </FieldLabel>
                        <PhoneInput
                          id="businessPhone"
                          defaultCountry="IN"
                          international
                          countryCallingCodeEditable={false}
                          placeholder={translations("Phone Number")}
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="businessmail"
                    control={orgForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="businessEmail">
                          {translations("Business Email")}
                        </FieldLabel>
                        <Input
                          {...field}
                          id="businessEmail"
                          aria-invalid={fieldState.invalid}
                          placeholder="business@company.com"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="location"
                    control={orgForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="location">{translations("Location")}</FieldLabel>
                        <SelectR
                          inputId="location"
                          options={countries}
                          value={countries.find((country) => country.label === field.value) || null}
                          onChange={(option) => field.onChange(option?.label || "")}
                          onBlur={field.onBlur}
                          placeholder={translations("Select Your Location")}
                          isSearchable
                          className="rounded-md text-sm bg-white [&>input]:w-full border-gray-200"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="address"
                    control={orgForm.control}
                    render={({ field, fieldState }) => (
                      <Field className="md:col-span-2" data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="address">{translations("Address")}</FieldLabel>
                        <Textarea
                          {...field}
                          id="address"
                          aria-invalid={fieldState.invalid}
                          placeholder={translations("Enter your complete business address")}
                          className="resize-none"
                          rows={2}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
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
              </FieldGroup>
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
            <p className="text-xs text-muted-foreground">{translations("Language Preferences")}</p>
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
      <Dialog open={isEditProfileDialogOpen} onOpenChange={setIsEditProfileDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{translations("Edit Profile")}</DialogTitle>
            <DialogDescription>
              {translations("Update your personal information and preferences")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={profileForm.handleSubmit(onSubmit)} className="py-4">
            <FieldGroup className="gap-4">
              {/* Profile Image Upload */}
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                  <AvatarImage src={avatarSrc} />
                  <AvatarFallback className="bg-primary text-white text-xl">
                    {profileData?.data?.data?.name?.slice(0, 1) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <FieldLabel htmlFor="profileImageUpload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-fit">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">{translations("Upload Photo")}</span>
                    </div>
                    <input
                      ref={resetRef}
                      id="profileImageUpload"
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={handleImagePicker}
                    />
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground mt-2">
                    {translations("JPG, PNG or GIF")}. {translations("Max size 2MB")}.
                  </p>
                </div>
              </div>

              {/* Title/Gender */}
              <Controller
                name="title"
                control={profileForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="title">
                      {translations("Title")} <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      items={[
                        { value: "MALE", label: "Mr" },
                        { value: "FEMALE", label: "Mrs" },
                        { value: "OTHER", label: "Mx" },
                      ]}
                    >
                      <SelectTrigger
                        id="title"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Select title" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Mr</SelectItem>
                        <SelectItem value="FEMALE">Mrs</SelectItem>
                        <SelectItem value="OTHER">Mx</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Full Name */}
              <Controller
                name="fullname"
                control={profileForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fullname">
                      {translations("Full Name")} <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id="fullname"
                      aria-invalid={fieldState.invalid}
                      placeholder={translations("Enter your full name")}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Email - Read Only */}
              <Field>
                <FieldLabel htmlFor="profileEmail">{translations("Email Address")}</FieldLabel>
                <Input
                  id="profileEmail"
                  type="email"
                  value={profileData?.data?.data?.email || ""}
                  disabled={true}
                  readOnly
                  className="bg-gray-100 cursor-not-allowed opacity-70"
                />
              </Field>

              {/* Phone */}
              <Controller
                name="phone"
                control={profileForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="profilePhone">{translations("Phone Number")}</FieldLabel>
                    <PhoneInput
                      id="profilePhone"
                      defaultCountry="IN"
                      international
                      countryCallingCodeEditable={false}
                      placeholder={translations("Phone Number")}
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Role - Read Only */}
              <Field>
                <FieldLabel htmlFor="profileRole">{translations("Role")}</FieldLabel>
                <Input
                  id="profileRole"
                  value={profileData?.data?.data?.role || ""}
                  disabled
                  className="bg-gray-50"
                />
              </Field>

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
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
      {/* Business Hours Section */}
      <BusinessHoursSection canManage={user?.role === UserRole.SUPADM} />
    </div>
  );
}
