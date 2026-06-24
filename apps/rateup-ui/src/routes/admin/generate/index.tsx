import { createFileRoute } from "@tanstack/react-router";
import { Database, MessageCircle, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useGenerateResponse } from "@/backend/surveys/response/response.query";
import { useGenerateInboxResponse } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { isProduction } from "@/utils/constants.ts";

export const Route = createFileRoute("/admin/generate/")({
  component: GenerateData,
});

function GenerateData() {
  const [selectedSurveyTeamMapId, setSelectedSurveyTeamMapId] = useState("");
  const [batchSize, setBatchSize] = useState(1);
  const [numberOfContacts, setNumberOfContacts] = useState(1);
  const [messagesPerContact, setMessagesPerContact] = useState(1);
  const generateResponse = useGenerateResponse(selectedSurveyTeamMapId);
  const generateInboxResponse = useGenerateInboxResponse();
  const { t: translations } = useTranslation();

  const handleSubmit = () => {
    toast.loading(translations("Hold on, response is getting generated..."), {
      id: "generateResponse",
    });
    generateResponse.mutate({
      surveyTeamMapId: selectedSurveyTeamMapId,
      batchSize: batchSize,
    });
  };

  const handleWaChat = () => {
    toast.loading(translations("Hold on, WhatsApp chat is getting generated"), {
      id: "generateWaChat",
    });
    generateInboxResponse.mutate({
      numberOfContacts: numberOfContacts,
      messagesPerContact: messagesPerContact,
    });
  };

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Generate Test Data</h1>
          </div>
          {isProduction && (
            <Badge variant="destructive" className="text-xs">
              Production Environment - Limited Features
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Generate test data for development and testing purposes
        </p>
      </div>
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generate Survey Response Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {translations("Generate Survey Response")}
                </CardTitle>
                <CardDescription>Create test survey responses for development</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-6">
            <div className="space-y-2">
              <Label htmlFor="surveyMapId" className="text-sm font-medium">
                {translations("Enter surveyMapId")}
              </Label>
              <Input
                id="surveyMapId"
                placeholder={translations("Enter a surveyMapId")}
                value={selectedSurveyTeamMapId}
                onChange={(e) => setSelectedSurveyTeamMapId(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchSize" className="text-sm font-medium">
                {translations("Number of generated data")}
              </Label>
              <Input
                id="batchSize"
                type="number"
                placeholder={translations("Enter the number of generated data")}
                value={batchSize}
                min={1}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!selectedSurveyTeamMapId || generateResponse?.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {generateResponse?.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  {translations("Generate Survey Response")}
                </>
              )}
            </Button>

            {selectedSurveyTeamMapId && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Survey Map ID:</strong> {selectedSurveyTeamMapId}
                </div>
                <div className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                  <strong>Batch Size:</strong> {batchSize} responses
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate WhatsApp Chat Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{translations("Generate WhatsApp Chat")}</CardTitle>
                <CardDescription>Create test WhatsApp conversations for testing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-6">
            <div className="space-y-2">
              <Label htmlFor="numberOfContacts" className="text-sm font-medium">
                {translations("How many contacts to add message")}
              </Label>
              <Input
                id="numberOfContacts"
                type="number"
                placeholder={translations("Enter number of contacts")}
                value={numberOfContacts}
                min={1}
                onChange={(e) => setNumberOfContacts(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="messagesPerContact" className="text-sm font-medium">
                {translations("How many messages per contact")}
              </Label>
              <Input
                id="messagesPerContact"
                type="number"
                placeholder={translations("Enter number of messages per contact")}
                value={messagesPerContact}
                min={1}
                onChange={(e) => setMessagesPerContact(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleWaChat}
              disabled={isProduction || generateInboxResponse?.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {generateInboxResponse?.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {translations("Generate WhatsApp Chat")}
                </>
              )}
            </Button>

            {isProduction && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-xs text-red-800 dark:text-red-200">
                  <strong>Note:</strong> This feature is disabled in production environment for
                  security reasons.
                </div>
              </div>
            )}

            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xs text-green-800 dark:text-green-200">
                <strong>Contacts:</strong> {numberOfContacts}
              </div>
              <div className="text-xs text-green-800 dark:text-green-200 mt-1">
                <strong>Messages per Contact:</strong> {messagesPerContact}
              </div>
              <div className="text-xs text-green-800 dark:text-green-200 mt-1">
                <strong>Total Messages:</strong> {numberOfContacts * messagesPerContact}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Info Section */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm text-amber-800 dark:text-amber-200">
              Important Notes
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
            <li>• Generated data is for testing purposes only</li>
            <li>• Survey responses require a valid surveyMapId</li>
            <li>• WhatsApp chat generation is disabled in production</li>
            <li>• Large batch sizes may take longer to process</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
