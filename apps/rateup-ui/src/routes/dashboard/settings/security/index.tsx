import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Eye, EyeOff, Loader2, Lock, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { deleteOrg } from "@/backend/org/org.api";
import {
  useChangePasswordMutation,
  useUpdateActiveStatusMutation,
} from "@/backend/user/user.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
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
import { Field, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { UserRole } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/dashboard/settings/security/")({
  component: Security,
});

function Security() {
  const uid = useId();
  const { t: translations } = useTranslation();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting] = useState(false);
  const updateActiveStatus = useUpdateActiveStatusMutation();
  const [isUserDeleteDialogOpen, setIsUserDeleteDialogOpen] = useState(false);
  const [userConfirmText, setUserConfirmText] = useState("");
  const isConfirmValid = confirmText === "DELETE ORGANIZATION";
  const isUserConfirmValid = userConfirmText === "DELETE ACCOUNT";

  const changePassword = useChangePasswordMutation();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const navigate = useNavigate();

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

  const passwordSchema = z
    .object({
      existingPassword: z.string().min(1, translations("Enter your existing password")),
      newPassword: z
        .string()
        .min(1, translations("Enter your new password"))
        .regex(
          passwordRegex,
          translations(
            "Password must be at least 8 characters long, include 1 uppercase, 1 lowercase, 1 number, and 1 special character",
          ),
        ),
      confirmPassword: z.string().min(1, translations("Please confirm your new password")),
    })
    .refine((values) => values.confirmPassword === values.newPassword, {
      path: ["confirmPassword"],
      message: translations("Passwords do not match"),
    });

  type PasswordFormValues = z.infer<typeof passwordSchema>;

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      existingPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setIsLoading(true);
    const data = {
      existingPassword: values.existingPassword,
      newPassword: values.newPassword,
    };

    changePassword.mutate(data, {
      onSuccess: () => {
        passwordForm.reset();
        toast.success(translations("Password Changed Successfully"), {
          id: "load-data",
        });
        setIsLoading(false);
      },
      onError: (error) => {
        console.error("Error changed password:", error.message);
        toast.error(error?.message, {
          id: "load-data",
        });

        setIsLoading(false);
      },
    });
  };

  const orgDeleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteOrg(id),
    onSuccess: (_msg) => {
      toast.success(translations("Organization Deleted Successfully!"), {
        id: "delete-data",
      });
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      navigate({
        to: "/logout",
      });
    },
    onError: (error) => {
      toast.error(error?.message, {
        id: "delete-data",
      });
    },
  });

  const handleDeleteUser = () => {
    if (!user?.userId) return;

    toast.loading(translations("Deleting user account"), {
      id: "delete-user",
    });

    updateActiveStatus.mutate(user?.userId, {
      onSuccess: () => {
        toast.success(translations("User deleted successfully"), {
          id: "delete-user",
        });
        setIsUserDeleteDialogOpen(false);
        setUserConfirmText("");
        queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
        navigate({
          to: "/logout",
        });
      },
      onError: (error) => {
        toast.error(error?.message || translations("Failed to delete user"), {
          id: "delete-user",
        });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl mb-1">{translations("Security Settings")}</h2>
        <p className="text-sm text-muted-foreground">
          {translations("Manage your password, authentication, and security preferences")}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-sm border-gray-200">
          <h3 className="mb-5 text-lg font-medium text-gray-800">
            {translations("Change Password")}
          </h3>

          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Current Password */}
            <Controller
              name="existingPassword"
              control={passwordForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{translations("Current Password")}</FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      id={field.name}
                      type={showCurrent ? "text" : "password"}
                      className="pr-10"
                      aria-invalid={fieldState.invalid}
                      placeholder={translations("Enter current password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((prev) => !prev)}
                      className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                      aria-label={showCurrent ? "Hide password" : "Show password"}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* New Password */}
            <Controller
              name="newPassword"
              control={passwordForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{translations("New Password")}</FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      id={field.name}
                      type={showNew ? "text" : "password"}
                      className="pr-10"
                      aria-invalid={fieldState.invalid}
                      placeholder={translations("Enter new password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((prev) => !prev)}
                      className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Confirm Password */}
            <Controller
              name="confirmPassword"
              control={passwordForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {translations("Confirm New Password")}
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      id={field.name}
                      type={showConfirm ? "text" : "password"}
                      className="pr-10"
                      aria-invalid={fieldState.invalid}
                      placeholder={translations("Confirm new password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

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
            <Button className="w-full bg-primary" disabled={isLoading} type="submit">
              <Lock className="w-4 h-4 mr-2" />
              {isLoading ? translations("Updating") : translations("Update Password")}
            </Button>
          </form>
        </Card>

        <Card className="p-6 border-red-200 bg-linear-to-br from-red-50 to-orange-50 shadow-sm">
          <h3 className="mb-4 text-red-700">{translations("Danger Zone")}</h3>
          <div className="space-y-4">
            {user?.role === UserRole.SUPADM && (
              <div className="flex items-center justify-between p-5 bg-white border-2 border-red-200 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <FieldTitle className="text-red-700">
                      {translations("Delete Organization")}
                    </FieldTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {translations("Permanently delete your organization and all associated data")}.
                    {translations("This action cannot be undone")}.
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
            )}
            <div className="flex items-center justify-between p-5 bg-white border-2 border-red-200 rounded-xl">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <FieldTitle className="text-red-700">{translations("Delete Account")}</FieldTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  {translations("Permanently delete your user account")}.{" "}
                  {translations("This action cannot be undone")}.
                </p>
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="ml-4"
                onClick={() => setIsUserDeleteDialogOpen(true)}
              >
                {translations("Delete Account")}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      {/* Delete Confirmation Dialog */}
      {user?.role === UserRole.SUPADM && (
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
                <AlertTitle>{translations("Warning: High Risk Action")}</AlertTitle>
                <AlertDescription className="text-sm">
                  {translations("Deleting your organization will permanently remove")}:
                </AlertDescription>
              </Alert>

              <div className="pl-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{translations("All team members and their access")}</span>
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
                <FieldLabel htmlFor="confirm-delete" className="text-sm font-semibold">
                  Type{" "}
                  <code className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-mono">
                    DELETE ORGANIZATION
                  </code>{" "}
                  {translations("to confirm")}
                </FieldLabel>
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
                  toast.loading(translations("Hold on, your organization is getting deleted..."), {
                    id: "delete-data",
                  });
                  await orgDeleteMutation.mutateAsync({ id: user?.orgId });
                }}
                disabled={!isConfirmValid || isDeleting}
                className="w-full sm:w-auto"
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
      <Dialog open={isUserDeleteDialogOpen} onOpenChange={setIsUserDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-xl text-red-700">
                  {translations("Delete Account")}?
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
              <AlertTitle>{translations("Warning: High Risk Action")}</AlertTitle>
              <AlertDescription>
                {translations("This will permanently delete your account")}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <FieldLabel htmlFor={`${uid}-type-delete-account`} className="text-sm font-semibold">
                Type{" "}
                <code className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-mono">
                  DELETE ACCOUNT
                </code>{" "}
                {translations("to confirm")}
              </FieldLabel>

              <Input
                id={`${uid}-type-delete-account`}
                value={userConfirmText}
                onChange={(e) => setUserConfirmText(e.target.value)}
                placeholder="Type here to confirm..."
                className="border-2 border-red-200 focus:border-red-400"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsUserDeleteDialogOpen(false);
                setUserConfirmText("");
              }}
            >
              {translations("Cancel")}
            </Button>

            <Button
              variant="destructive"
              disabled={!isUserConfirmValid}
              onClick={handleDeleteUser}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {translations("Delete Account")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
