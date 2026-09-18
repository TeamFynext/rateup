// Extracted verbatim from the `/dashboard/settings/security/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconLock,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { deleteOrg } from "@/backend/org/org.api";
import { userKeys } from "@/backend/user/user.keys";
import {
  useChangePasswordMutation,
  useGetUserProfile,
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

export function SecurityPage() {
  const uid = useId();
  const { t: translations } = useTranslation();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const passwordHintId = `${uid}-password-hint`;
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
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const isConfirmValid = confirmText === "DELETE ORGANIZATION";

  const { data: profileData } = useGetUserProfile();
  const changePassword = useChangePasswordMutation();
  // A Google-only account has no password to re-enter, so it keeps the typed phrase.
  const hasPassword = profileData?.data?.data?.hasPassword ?? true;
  const isUserConfirmValid = hasPassword
    ? deletePassword.length > 0
    : userConfirmText === "DELETE ACCOUNT";
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

  const openPasswordForm = () => setIsChangingPassword(true);

  const closePasswordForm = () => {
    setIsChangingPassword(false);
    passwordForm.reset();
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setIsLoading(true);
    const data = {
      existingPassword: values.existingPassword,
      newPassword: values.newPassword,
    };

    changePassword.mutate(data, {
      onSuccess: () => {
        closePasswordForm();
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
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
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

    updateActiveStatus.mutate(
      { userId: user.userId, password: hasPassword ? deletePassword : undefined },
      {
        onSuccess: () => {
          toast.success(translations("User deleted successfully"), {
            id: "delete-user",
          });
          setIsUserDeleteDialogOpen(false);
          setUserConfirmText("");
          setDeletePassword("");
          queryClient.invalidateQueries({ queryKey: userKeys.info() });
          navigate({
            to: "/logout",
          });
        },
        onError: (error) => {
          toast.error(error?.message || translations("Failed to delete user"), {
            id: "delete-user",
          });
        },
      },
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6">
      <div>
        <h2 className="text-2xl mb-1">{translations("Security Settings")}</h2>
        <p className="text-sm text-muted-foreground">
          {translations("Manage your password, authentication, and security preferences")}
        </p>
      </div>
      <div className="flex flex-col gap-6">
        {/* Password. Collapsed to a single button until the user opts in — the three
            fields are dead weight on a page most people open for something else. */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <IconLock className="size-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base font-medium">{translations("Password")}</h3>
                <p className="text-sm text-muted-foreground">
                  {translations("Use a strong password you do not reuse anywhere else")}.
                </p>
              </div>
            </div>
            {!isChangingPassword && (
              <Button variant="outline" size="sm" onClick={openPasswordForm}>
                {translations("Change password")}
              </Button>
            )}
          </div>

          {isChangingPassword && (
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="flex w-full max-w-md flex-col gap-4 border-t border-border pt-5"
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
                        autoComplete="current-password"
                        aria-invalid={fieldState.invalid}
                        placeholder={translations("Enter current password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((prev) => !prev)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                        aria-label={showCurrent ? "Hide password" : "Show password"}
                      >
                        {showCurrent ? (
                          <IconEyeOff className="size-4" />
                        ) : (
                          <IconEye className="size-4" />
                        )}
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
                        autoComplete="new-password"
                        aria-invalid={fieldState.invalid}
                        aria-describedby={passwordHintId}
                        placeholder={translations("Enter new password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((prev) => !prev)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                        aria-label={showNew ? "Hide password" : "Show password"}
                      >
                        {showNew ? (
                          <IconEyeOff className="size-4" />
                        ) : (
                          <IconEye className="size-4" />
                        )}
                      </button>
                    </div>
                    <p id={passwordHintId} className="text-xs text-muted-foreground">
                      {translations(
                        "Password must be at least 8 characters with uppercase, lowercase, numbers and a special character",
                      )}
                      .
                    </p>
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
                        autoComplete="new-password"
                        aria-invalid={fieldState.invalid}
                        placeholder={translations("Confirm new password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((prev) => !prev)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? (
                          <IconEyeOff className="size-4" />
                        ) : (
                          <IconEye className="size-4" />
                        )}
                      </button>
                    </div>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closePasswordForm}>
                  {translations("Cancel")}
                </Button>
                <Button disabled={isLoading} type="submit">
                  {isLoading ? translations("Updating") : translations("Update Password")}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <Card className="border-destructive/30 p-6 ring-destructive/20">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <IconAlertTriangle className="size-4 text-destructive" />
            </div>
            <div>
              <h3 className="text-base font-medium">{translations("Danger Zone")}</h3>
              <p className="text-sm text-muted-foreground">
                {translations("These actions are permanent and cannot be undone")}.
              </p>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-border border-t border-border">
            <div className="flex flex-col gap-3 pt-4 pb-4 sm:flex-row sm:items-center sm:justify-between last:pb-0">
              <div>
                <FieldTitle>{translations("Delete Account")}</FieldTitle>
                <p className="text-sm text-muted-foreground">
                  {translations("Removes your own login. Your team keeps working")}.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-52"
                onClick={() => setIsUserDeleteDialogOpen(true)}
              >
                <IconTrash className="size-4" />
                {translations("Delete Account")}
              </Button>
            </div>

            {user?.role === UserRole.SUPADM && (
              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <FieldTitle>{translations("Delete Organization")}</FieldTitle>
                  <p className="text-sm text-muted-foreground">
                    {translations(
                      "Deletes the whole company: every team member, chat, contact and integration",
                    )}
                    .
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full shrink-0 sm:w-52"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <IconTrash className="size-4" />
                  {translations("Delete Organization")}
                </Button>
              </div>
            )}
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
                  <IconAlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl text-destructive">
                    {translations("Delete Organization")}?
                  </DialogTitle>
                  <DialogDescription>
                    {translations("This action is permanent and irreversible")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>{translations("Warning: High Risk Action")}</AlertTitle>
                <AlertDescription className="text-sm">
                  {translations("Deleting your organization will permanently remove")}:
                </AlertDescription>
              </Alert>

              <div className="pl-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <IconX className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span>{translations("All team members and their access")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <IconX className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span>{translations("All chats and contacts")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <IconX className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span>{translations("All billing information")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <IconX className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span>{translations("All integrations")}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <FieldLabel htmlFor="confirm-delete" className="text-sm font-semibold">
                  Type{" "}
                  <code className="rounded bg-destructive/10 px-2 py-1 font-mono text-xs text-destructive">
                    DELETE ORGANIZATION
                  </code>{" "}
                  {translations("to confirm")}
                </FieldLabel>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type here to confirm..."
                  className="border-destructive/40 focus-visible:border-destructive"
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
                    <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                    {translations("Deleting")}
                  </>
                ) : (
                  <>
                    <IconTrash className="w-4 h-4 mr-2" />
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
                <IconAlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-xl text-destructive">
                  {translations("Delete Account")}?
                </DialogTitle>
                <DialogDescription>
                  {translations("This action is permanent and irreversible")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <IconAlertTriangle className="h-4 w-4" />
              <AlertTitle>{translations("Warning: High Risk Action")}</AlertTitle>
              <AlertDescription>
                {translations("This will permanently delete your account")}
              </AlertDescription>
            </Alert>

            {hasPassword ? (
              <div className="space-y-3">
                <FieldLabel htmlFor={`${uid}-delete-password`} className="text-sm font-semibold">
                  {translations("Enter your password to confirm")}
                </FieldLabel>

                <div className="relative">
                  <Input
                    id={`${uid}-delete-password`}
                    type={showDeletePassword ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder={translations("Enter current password")}
                    className="border-destructive/40 pr-10 focus-visible:border-destructive"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                    aria-label={showDeletePassword ? "Hide password" : "Show password"}
                  >
                    {showDeletePassword ? (
                      <IconEyeOff className="size-4" />
                    ) : (
                      <IconEye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <FieldLabel
                  htmlFor={`${uid}-type-delete-account`}
                  className="text-sm font-semibold"
                >
                  Type{" "}
                  <code className="rounded bg-destructive/10 px-2 py-1 font-mono text-xs text-destructive">
                    DELETE ACCOUNT
                  </code>{" "}
                  {translations("to confirm")}
                </FieldLabel>

                <Input
                  id={`${uid}-type-delete-account`}
                  value={userConfirmText}
                  onChange={(e) => setUserConfirmText(e.target.value)}
                  placeholder="Type here to confirm..."
                  className="border-destructive/40 focus-visible:border-destructive"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsUserDeleteDialogOpen(false);
                setUserConfirmText("");
                setDeletePassword("");
                setShowDeletePassword(false);
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
              <IconTrash className="w-4 h-4 mr-2" />
              {translations("Delete Account")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
