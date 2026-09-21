// Extracted verbatim from the `/admin/referrals/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconCheck, IconCopy, IconRefresh, IconTrash, IconUsers } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { referralKeys } from "@/backend/campaign/campaign.keys";
import type { IReferral } from "@/backend/referrals/referrals.api";
import {
  useAllReferralsQuery,
  useCreateReferralMutation,
  useDeleteReferralMutation,
} from "@/backend/referrals/referrals.query";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";

function ReferralActionsCell({ id, code }: { id: string; code: string }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { t: translations } = useTranslation();
  const deleteMutation = useDeleteReferralMutation();

  const websiteUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  const finalUrl = `${websiteUrl}?ref=${code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(translations("Referral code copied!"));
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(finalUrl);
    setCopiedLink(true);
    toast.success(translations("Referral link copied!"));
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDelete = () => {
    setIsConfirmOpen(true);
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations("Delete referral")}</DialogTitle>
            <DialogDescription>
              {translations(
                "Are you sure you want to delete this referral? This cannot be undone.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <DialogClose render={<Button variant="outline" />}>
              {translations("Cancel")}
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate(id, {
                  onSuccess: () => setIsConfirmOpen(false),
                });
              }}
              loading={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <IconRefresh className="mr-2 h-4 w-4 animate-spin" />
                  {translations("Deleting...")}
                </>
              ) : (
                translations("Delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              aria-label={translations("Copy")}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            />
          }
        >
          <IconCopy className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-black dark:text-white leading-none">
              Share Referral
            </h4>
            <p className="text-xs text-muted-foreground">
              Copy the code or the direct referral tracking link.
            </p>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Referral Code
              </span>
              <div className="flex items-center gap-1.5">
                <Input
                  value={code}
                  readOnly
                  className="h-8 font-mono text-xs text-black dark:text-white bg-white dark:bg-black"
                />
                <Button
                  aria-label={translations("Copy")}
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  onClick={copyCode}
                >
                  {copiedCode ? (
                    <IconCheck className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <IconCopy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Referral Link
              </span>
              <div className="flex items-center gap-1.5">
                <Input
                  value={finalUrl}
                  readOnly
                  className="h-8 font-mono text-[10px] text-black dark:text-white bg-white dark:bg-black"
                />
                <Button
                  aria-label={translations("Copy")}
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  onClick={copyLink}
                >
                  {copiedLink ? (
                    <IconCheck className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <IconCopy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        aria-label={translations("Delete")}
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        loading={deleteMutation.isPending}
      >
        <IconTrash className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ReferralsPage() {
  const uid = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { t: translations } = useTranslation();
  const queryClient = useQueryClient();

  const { data: referrals, isLoading, isFetching, refetch } = useAllReferralsQuery();

  const createReferralMutation = useCreateReferralMutation({
    onSuccess: (data) => {
      const { referral_code } = data;
      setGeneratedCode(referral_code);

      const websiteUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
      const finalUrl = `${websiteUrl}?ref=${referral_code}`;
      setGeneratedLink(finalUrl);

      // Invalidate query to refresh the list
      queryClient.invalidateQueries({ queryKey: referralKeys.all() });
    },
  });

  const handleCreateReferral = () => {
    if (!name.trim()) {
      toast.error(translations("Name is required"));
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error(translations("A valid email is required"));
      return;
    }
    createReferralMutation.mutate({ name, email });
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    toast.success(translations("Referral code copied!"));
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    toast.success(translations("Referral link copied!"));
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const columns: ColumnDef<IReferral>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: createSortableHeader(translations("Partner Name")),
        cell: ({ row }) => (
          <div className="font-medium text-black dark:text-white">{row.getValue("name")}</div>
        ),
        meta: { title: translations("Partner Name") },
      },
      {
        accessorKey: "email",
        header: createSortableHeader(translations("Email")),
        cell: ({ row }) => (
          <div className="text-black dark:text-white">{row.getValue("email")}</div>
        ),
        meta: { title: translations("Email") },
      },
      {
        accessorKey: "referral_code",
        header: createSortableHeader(translations("Referral Code")),
        cell: ({ row }) => (
          <div className="font-mono text-sm text-black dark:text-white">
            {row.getValue("referral_code")}
          </div>
        ),
        meta: { title: translations("Referral Code") },
      },
      {
        accessorKey: "visit_count",
        header: createSortableHeader(translations("Visits")),
        cell: ({ row }) => (
          <div className="text-black dark:text-white">{row.getValue("visit_count")}</div>
        ),
        meta: { title: translations("Visits") },
      },
      {
        accessorKey: "signup_count",
        header: createSortableHeader(translations("Signups")),
        cell: ({ row }) => (
          <div className="text-black dark:text-white">{row.getValue("signup_count")}</div>
        ),
        meta: { title: translations("Signups") },
      },
      {
        accessorKey: "created_at",
        header: createSortableHeader(translations("Date Created")),
        cell: ({ row }) => (
          <div className="text-muted-foreground text-sm">
            {dayjs(row.getValue("created_at")).format("YYYY-MM-DD HH:mm")}
          </div>
        ),
        meta: { title: translations("Date Created") },
      },
      {
        id: "actions",
        header: () => <div>{translations("Actions")}</div>,
        cell: ({ row }) => (
          <ReferralActionsCell id={row.original.id} code={row.original.referral_code} />
        ),
        meta: { title: translations("Actions") },
      },
    ],
    [translations],
  );

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <IconUsers className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-white">
            Referrals
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Create tracking links and referral codes for your marketing partners
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card
          className={`relative overflow-hidden transition-all duration-300 ${generatedCode ? "lg:col-span-2" : ""}`}
        >
          <div className="absolute inset-0 bg-linear-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/10 dark:to-pink-950/10" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <IconUsers className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-black dark:text-white">
                  Generate Referral Link
                </CardTitle>
                <CardDescription>Enter name to generate a unique referral link</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent
            className={`relative transition-all duration-300 ${generatedCode ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "space-y-6"}`}
          >
            <div className="space-y-6">
              <Field>
                <FieldLabel htmlFor="influencerName" className="text-sm font-medium">
                  Name
                </FieldLabel>
                <Input
                  id="influencerName"
                  placeholder="e.g. John"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-black dark:text-white bg-white dark:bg-black"
                  disabled={createReferralMutation.isPending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="influencerEmail" className="text-sm font-medium">
                  Email
                </FieldLabel>
                <Input
                  id="influencerEmail"
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-black dark:text-white bg-white dark:bg-black"
                  disabled={createReferralMutation.isPending}
                />
              </Field>

              <Button
                onClick={handleCreateReferral}
                disabled={createReferralMutation.isPending || !name.trim() || !email.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 dark:hover:bg-purple-300"
                size="lg"
              >
                {createReferralMutation.isPending ? (
                  <>
                    <IconRefresh className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Referral Code"
                )}
              </Button>
            </div>

            {generatedCode && (
              <div className="space-y-6 pt-6 md:pt-0 md:pl-8">
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor={`${uid}-generated-referral-code`}
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Generated Referral Code
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id={`${uid}-generated-referral-code`}
                      value={generatedCode}
                      readOnly
                      className="bg-muted /50 font-mono text-sm text-black dark:text-white"
                    />
                    <Button
                      aria-label={translations("Copy referral code")}
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyCodeToClipboard}
                      title="Copy referral code"
                    >
                      {copiedCode ? (
                        <IconCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <IconCopy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor={`${uid}-final-referral-link`}
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Final Referral Link
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id={`${uid}-final-referral-link`}
                      value={generatedLink}
                      readOnly
                      className="bg-muted /50 font-mono text-xs text-black dark:text-white"
                    />
                    <Button
                      aria-label={translations("Copy referral link")}
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyLinkToClipboard}
                      title="Copy referral link"
                    >
                      {copiedLink ? (
                        <IconCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <IconCopy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referrals List Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg text-black dark:text-white">Referrals List</CardTitle>
            <CardDescription>
              View and monitor all active referral codes, visits, and signups.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching || isLoading}
          >
            <IconRefresh
              className={`mr-2 h-4 w-4 ${isFetching || isLoading ? "animate-spin" : ""}`}
            />
            {translations("Refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <IconRefresh className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable columns={columns} data={referrals || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
