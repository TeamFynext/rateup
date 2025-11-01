import { useState } from "react";
import { useRouter } from "next/navigation";

import { isNotEmpty, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { deleteOrg } from "@/backend/org/org.api";
import { useChangePasswordMutation } from "@/backend/user/user.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/utils/enums";

export default function Security() {
  const translations = useTranslations();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const isConfirmValid = confirmText === "DELETE ORGANIZATION";

  const changePassword = useChangePasswordMutation();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const router = useRouter();

  const passwordForm = useForm({
    initialValues: {
      existingPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      existingPassword: isNotEmpty(
        translations("Enter your existing password"),
      ),
      newPassword: (value) => {
        if (!value) return translations("Enter your new password");

        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

        if (!passwordRegex.test(value)) {
          return translations(
            "Password must be at least 8 characters long, include 1 uppercase, 1 lowercase, 1 number, and 1 special character",
          );
        }
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) return translations("Please confirm your new password");
        if (value !== values.newPassword)
          return translations("Passwords do not match");
        return null;
      },
    },
  });

  const onPasswordSubmit = (values) => {
    setIsLoading(true);
    const validation = passwordForm.validate();
    if (validation.hasErrors) return;
    const data = {
      existingPassword: values.existingPassword,
      newPassword: values.newPassword,
    };

    changePassword.mutate(data, {
      onSuccess: () => {
        passwordForm.reset();
        notifications.show({
          id: "load-data",
          color: "teal",
          title: "Success",
          message: translations("Password Changed Successfully"),
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
        setIsLoading(false);
      },
      onError: (error: any) => {
        console.error("Error changed password:", error.message);
        notifications.show({
          id: "load-data",
          color: "red",
          title: "Failed",
          message: error?.response?.data?.message,
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });

        setIsLoading(false);
      },
    });
  };

  const orgDeleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteOrg(id),
    onSuccess: (msg) => {
      notifications.update({
        id: "delete-data",
        color: "teal",
        title: translations("Success"),
        message: translations("Organization Deleted Successfully!"),
        loading: false,
        icon: <IconCheck />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      router.push("/logout");
    },
    onError: (error: any) => {
      notifications.update({
        id: "delete-data",
        loading: false,
        color: "red",
        title: translations("Delete Failed!"),
        message: error?.response?.data?.error,
        icon: <IconCheck size="1rem" />,
        autoClose: 4000,
      });
    },
  });
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl mb-1">{translations("Security Settings")}</h2>
        <p className="text-sm text-muted-foreground">
          {translations(
            "Manage your password, authentication, and security preferences",
          )}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-sm border-gray-200">
          <h3 className="mb-5 text-lg font-medium text-gray-800">
            {translations("Change Password")}
          </h3>

          <form
            onSubmit={passwordForm.onSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            {/* Current Password */}
            <div className="space-y-1 relative">
              <Label
                htmlFor="currentPassword"
                className="text-sm text-gray-700"
              >
                {translations("Current Password")}
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  className="h-10 border-2 border-gray-200 focus:border-rateup-blue pr-10"
                  placeholder={translations("Enter current password")}
                  {...passwordForm.getInputProps("existingPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1 relative">
              <Label htmlFor="newPassword" className="text-sm text-gray-700">
                {translations("New Password")}
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  className="h-10 border-2 border-gray-200 focus:border-rateup-blue pr-10"
                  placeholder={translations("Enter new password")}
                  {...passwordForm.getInputProps("newPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1 relative">
              <Label
                htmlFor="confirmPassword"
                className="text-sm text-gray-700"
              >
                {translations("Confirm New Password")}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  className="h-10 border-2 border-gray-200 focus:border-rateup-blue pr-10"
                  placeholder={translations("Confirm new password")}
                  {...passwordForm.getInputProps("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              {passwordForm.errors.newPassword && (
                <p className="text-xs text-red-500">
                  {passwordForm.errors.newPassword}
                </p>
              )}
              {passwordForm.errors.confirmPassword && (
                <p className="text-xs text-red-500">
                  {passwordForm.errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-700">
                {translations(
                  "Password must be at least 8 characters with uppercase, lowercase, numbers and a special character",
                )}
                .
              </p>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full bg-gradient-to-r from-rateup-blue to-rateup-blue"
              disabled={isLoading}
            >
              <Lock className="w-4 h-4 mr-2" />
              {isLoading
                ? translations("Updating")
                : translations("Update Password")}
            </Button>
          </form>
        </Card>

        {user.role === UserRole.SUPADM && (
          <Card className="p-6 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 shadow-sm">
            <h3 className="mb-4 text-red-700">{translations("Danger Zone")}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-white border-2 border-red-200 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <Label className="text-red-700">
                      {translations("Delete Organization")}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {translations(
                      "Permanently delete your organization and all associated data",
                    )}
                    .{translations("This action cannot be undone")}.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-4"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  {translations("Delete Organization")}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {user.role === UserRole.SUPADM && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl text-red-700">
                    {translations("Delete Organization")}?
                  </DialogTitle>
                  <DialogDescription>
                    {translations("This action is permanent and irreversible")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {translations("Warning: High Risk Action")}
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {translations(
                    "Deleting your organization will permanently remove",
                  )}
                  :
                </AlertDescription>
              </Alert>

              <div className="pl-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span>
                    {translations("All team members and their access")}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{translations("All chats and contacts")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{translations("All billing information")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{translations("All integrations")}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label
                  htmlFor="confirm-delete"
                  className="text-sm font-semibold"
                >
                  Type{" "}
                  <code className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-mono">
                    DELETE ORGANIZATION
                  </code>{" "}
                  {translations("to confirm")}
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type here to confirm..."
                  className="border-2 border-red-200 focus:border-red-400"
                  autoComplete="off"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setConfirmText("");
                }}
                disabled={isDeleting}
                className="w-full sm:w-auto"
              >
                {translations("Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  notifications.show({
                    id: "delete-data",
                    loading: true,
                    title: translations("Deleting Organization"),
                    message: translations(
                      "Hold on, your organization is getting deleted",
                    ),
                    autoClose: false,
                    withCloseButton: false,
                  });
                  await orgDeleteMutation.mutateAsync({ id: user?.orgId });
                }}
                disabled={!isConfirmValid || isDeleting}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {translations("Deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {translations("Delete Organization")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
