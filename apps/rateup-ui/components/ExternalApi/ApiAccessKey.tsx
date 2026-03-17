"use client";

import React, { useState } from "react";

import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconKey,
  IconReload,
  IconServer,
  IconTrash,
} from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  useCreateLoyaltyApiKey,
  useDeleteLoyaltyApiKey,
  useLoyaltyApiKey,
  useRegenerateLoyaltyApiKey,
} from "../../backend/loyalty/apiKey/loyaltyApiKey.query";
import { useUser } from "../../context/UserContext";
import ConfirmationModal from "../Modal/ConfirmationModal";

export default function ApiAccessKeyPage() {
  const { data } = useLoyaltyApiKey();
  const generateMutation = useCreateLoyaltyApiKey();
  const [apiKey, setApiKey] = useState("");
  const { user } = useUser();
  const translations = useExtracted();

  const apiEndpoint =
    process.env.NEXT_PUBLIC_API_URL +
    "/api/external/" +
    "v1/" +
    user?.orgId +
    "/";

  function handleGenerateApiKey() {
    generateMutation.mutate(undefined, {
      onSuccess: (data) => {
        setApiKey(data.apiKey);
      },
    });
  }

  if (!data) return null;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
          API Configuration
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your API access keys and view connection details.
        </p>
      </div>
      <div className="grid gap-6">
        {/* API Access Key Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                <IconKey
                  size={20}
                  className="text-blue-600 dark:text-blue-400"
                />
              </div>
              <CardTitle>API Access Key</CardTitle>
            </div>
            <CardDescription>{translations("Api Access Key")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.createdAt ? (
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    readOnly
                    value={apiKey || "•".repeat(48)}
                    className="font-mono pr-24"
                  />
                  <div className="absolute right-1 top-0 h-full flex items-center gap-1 p-1">
                    {apiKey ? (
                      <ApiCopyButton value={apiKey} />
                    ) : (
                      <ApiRegenerateButton onRegenerate={setApiKey} />
                    )}
                    <ApiDeleteButton onDelete={() => setApiKey("")} />
                  </div>
                </div>
                {!apiKey && (
                  <Alert
                    variant="default"
                    className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50"
                  >
                    <IconAlertCircle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
                    <AlertDescription>
                      {translations(
                        "You can only view access key at the time of creation. If you lost the key, you can regenerate it.",
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 bg-muted/50 rounded-lg border border-dashed">
                <div className="p-3 bg-background rounded-full shadow-sm">
                  <IconKey size={24} className="text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    No API Key Found
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {translations(
                      "You have not generated an API Access Key yet. API Access Key is required to access the all API endpoints.",
                    )}
                  </p>
                </div>
                <Button
                  onClick={handleGenerateApiKey}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <IconReload className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <IconKey className="mr-2 h-4 w-4" />
                  )}
                  {translations("Generate Api Key")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Base URL Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 rounded-lg dark:bg-purple-900/20">
                <IconServer
                  size={20}
                  className="text-purple-600 dark:text-purple-400"
                />
              </div>
              <CardTitle>{translations("API Base URL")}</CardTitle>
            </div>
            <CardDescription>
              Use this base URL for all your API requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                readOnly
                value={apiEndpoint}
                className="font-mono pr-12 bg-muted/50"
              />
              <div className="absolute right-1 top-0 h-full flex items-center p-1">
                <ApiCopyButton value={apiEndpoint} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ApiCopyButton({ value }: Readonly<{ value: string }>) {
  const [copied, setCopied] = useState(false);
  const translations = useExtracted();

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleCopy}
      title={translations("Copy")}
    >
      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
    </Button>
  );
}

interface ApiRegenerateButtonProps {
  onRegenerate: (apiKey: string) => void;
}

function ApiRegenerateButton({
  onRegenerate,
}: Readonly<ApiRegenerateButtonProps>) {
  const regenerateMutation = useRegenerateLoyaltyApiKey();
  const translations = useExtracted();
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleRegenerate() {
    regenerateMutation.mutate(undefined, {
      onSuccess: (data) => {
        onRegenerate(data.apiKey);
        setIsModalOpen(false);
      },
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsModalOpen(true)}
        title={translations("Regenerate")}
      >
        <IconReload size={16} />
      </Button>
      <ConfirmationModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        confirmLabel={translations("Regenerate")}
        headerTitle={translations("Confirm API Key Regeneration")}
        onConfirm={handleRegenerate}
        headerLabel={translations(
          "Are you sure you want to regenerate the API key? The old key will be immediately invalidated and all applications using it will stop working.",
        )}
        closeLabel={translations("Cancel")}
        forDeleteFunctionality
      />
    </>
  );
}

interface ApiDeleteButtonProps {
  onDelete: () => void;
}

function ApiDeleteButton({ onDelete }: Readonly<ApiDeleteButtonProps>) {
  const deleteMutation = useDeleteLoyaltyApiKey();
  const translations = useExtracted();
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        onDelete();
        setIsModalOpen(false);
      },
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        onClick={() => setIsModalOpen(true)}
        title={translations("Delete")}
      >
        <IconTrash size={16} />
      </Button>
      <ConfirmationModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        confirmLabel={translations("Delete")}
        headerTitle={translations("Confirm API Key Deletion")}
        onConfirm={handleDelete}
        headerLabel={translations(
          "Are you sure you want to delete the API key? All applications using this key will immediately stop working.",
        )}
        closeLabel={translations("Cancel")}
        forDeleteFunctionality
      />
    </>
  );
}
