"use client";

import { useEffect, useState } from "react";

import {
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconCopy,
  IconMail,
  IconUpload,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { usePushToWaMutation } from "@/backend/whatsapp/flow/flow.query";
import ShareQR from "@/components/Survey/ShareSurvey/ShareQR";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { ShareSection } from "./ShareSection";

interface FlowShareProps {
  flowName: string;
  flowDbId: string;
  survey: any;
  surveyId: string;
}

export default function FlowShare({
  flowName,
  flowDbId,
  survey,
  surveyId,
}: FlowShareProps) {
  // Share Survey state
  const pushToWaMutation = usePushToWaMutation();
  const [selectedTeam, setSelectedTeam] = useState(
    survey?.teams?.[0]?.code || "",
  );
  const [selectedTag, setSelectedTag] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState(
    survey?.teams?.[0]?.mapId,
  );
  const [shortUrlId, setShortUrlId] = useState(survey?.teams?.[0]?.shortUrlId);

  // Start Message state
  const [startMessageBody, setStartMessageBody] = useState(
    "Send this message to start survey.",
  );
  const [startMessageSuffix, setStartMessageSuffix] = useState("");

  // Template Message state
  const [templateBody, setTemplateBody] = useState(
    "Thank you for joining us at the IEDC Summit 2025! 🎉 We hope you had an inspiring and great time at LBS College of Engineering. 🏫 🤩 We'd love to hear your thoughts! Could you please take 2 minutes to share your feedback with us? 🙏 Your input helps us make future events even better!",
  );
  const [templateFooter, setTemplateFooter] = useState("");
  const [templateCTA, setTemplateCTA] = useState("Start");

  const teamOptions =
    survey?.teams?.map((team) => ({
      value: team?.code,
      label: team?.code,
    })) || [];

  const selectedTeamObj = survey?.teams?.find(
    (team) => team?.code === selectedTeam,
  );
  const tagOptions =
    selectedTeamObj?.tags?.map((tag) => ({
      value: tag,
      label: tag,
    })) || [];

  // Update surveyTeamMapId and shortUrlId when selectedTeam changes
  useEffect(() => {
    const teamObj = survey?.teams?.find((team) => team?.code === selectedTeam);
    if (teamObj) {
      setSurveyTeamMapId(teamObj.mapId);
      setShortUrlId(teamObj.shortUrlId);
    }
  }, [selectedTeam, survey?.teams]);

  // Dynamically generate shareUrl based on shortUrlId and tag
  useEffect(() => {
    if (!surveyId || !surveyTeamMapId) return;

    if (shortUrlId) {
      const baseUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/was/${shortUrlId}`;
      const urlWithTag = selectedTag
        ? `${baseUrl}?tag=${selectedTag}`
        : baseUrl;
      setShareUrl(urlWithTag);
    } else {
      // Fallback URL if shortUrlId is not available
      setShareUrl(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/wa/${surveyTeamMapId}/redirect`,
      );
    }
  }, [surveyId, surveyTeamMapId, selectedTag, shortUrlId]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("URL copied to clipboard!");
  };

  const handleSaveToWhatsapp = () => {
    pushToWaMutation.mutate(flowDbId);
  };

  return (
    <div className="p-2 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-2">
        {/* Section 1: Share Survey */}
        <ShareSection
          title="Share Survey"
          leftContent={
            <div className="flex flex-col gap-4">
              <div className="flex flex-1 gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400">
                    Select Team
                  </Label>
                  <Select
                    value={selectedTeam}
                    onValueChange={(value) => setSelectedTeam(value)}
                  >
                    <SelectTrigger className="h-9 text-sm w-full">
                      <SelectValue placeholder="Team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamOptions.map(
                        (option: { value: string; label: string }) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400">
                    Select Tag
                  </Label>
                  <Select
                    value={selectedTag}
                    onValueChange={(value) => setSelectedTag(value)}
                  >
                    <SelectTrigger className="h-9 text-sm w-full">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {tagOptions.length > 0 ? (
                        tagOptions.map(
                          (option: { value: string; label: string }) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ),
                        )
                      ) : (
                        <div className="py-3 text-center text-xs text-gray-500">
                          No tags available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-gray-500 dark:text-gray-400">
                  Share Link
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 h-9 text-xs font-mono bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300"
                  />
                  <Button
                    onClick={handleCopyUrl}
                    size="sm"
                    variant="outline"
                    className="h-9 px-3"
                  >
                    <IconCopy size={14} className="mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="pt-1">
                <Button
                  className="w-full h-9 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white shadow-sm"
                  onClick={handleSaveToWhatsapp}
                  disabled={pushToWaMutation.isPending}
                >
                  <IconBrandWhatsapp size={16} className="mr-2" />
                  {pushToWaMutation.isPending
                    ? "Syncing..."
                    : "Push Flow to WhatsApp"}
                </Button>
              </div>
            </div>
          }
          rightTitle="How would you like to survey people?"
          rightContent={
            <div className="flex gap-4 justify-center items-center py-2">
              <button className="w-[50px] h-[50px] rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 border-2 border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <IconMail size={24} />
              </button>
              <button className="w-[50px] h-[50px] rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 bg-[#25D366] text-white">
                <IconBrandWhatsapp size={24} />
              </button>
              <button className="w-[50px] h-[50px] rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 bg-[#1877F2] text-white">
                <IconBrandFacebook size={24} />
              </button>
            </div>
          }
        />

        {/* Section 2: Edit Start Message */}
        <ShareSection
          title="Edit Start Message"
          badge={
            <div className="bg-green-100 dark:bg-emerald-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-[10px] font-medium">
              Saved
            </div>
          }
          leftContent={
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Label className="text-xs">Body</Label>
                <Textarea
                  value={startMessageBody}
                  onChange={(e) => setStartMessageBody(e.currentTarget.value)}
                  rows={3}
                  className="mt-0.5 text-sm min-h-[80px]"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                  {startMessageBody.length} / 1024
                </span>
              </div>
              <div className="relative">
                <Label className="text-xs">Suffix</Label>
                <Textarea
                  value={startMessageSuffix}
                  onChange={(e) => setStartMessageSuffix(e.currentTarget.value)}
                  rows={3}
                  className="mt-0.5 text-sm min-h-[80px]"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                  {startMessageSuffix.length} / 1024
                </span>
              </div>
            </div>
          }
          rightTitle="Preview"
          rightContent={
            <div
              className="bg-[#E5DDD5] dark:bg-gray-950 rounded min-h-[250px] flex flex-col justify-end p-4 relative"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 0, 0, 0.02) 10px, rgba(0, 0, 0, 0.02) 20px)",
              }}
            >
              <div className="bg-[#DCF8C6] dark:bg-[#005c4b] rounded-md rounded-tr-sm p-2 max-w-[85%] ml-auto mb-1 border border-[#c8e6c9] dark:border-[#064e3b] relative break-words before:content-[''] before:absolute before:right-[-6px] before:top-0 before:w-0 before:h-0 before:border-l-[6px] before:border-l-[#DCF8C6] dark:before:border-l-[#005c4b] before:border-b-[6px] before:border-b-transparent">
                <div>
                  {startMessageBody.split("\n").map((line, i) => (
                    <div
                      key={i}
                      className="text-xs"
                      style={{ lineHeight: 1.4 }}
                    >
                      {line || "\u00A0"}
                    </div>
                  ))}
                  <span className="text-[10px] mt-1 inline-block bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 px-1 py-0.5 rounded font-mono">
                    #{flowName} @{selectedTeam}
                  </span>
                  {startMessageSuffix &&
                    startMessageSuffix.split("\n").map((line, i) => (
                      <div
                        key={i}
                        className="text-xs mt-1"
                        style={{ lineHeight: 1.4 }}
                      >
                        {line || "\u00A0"}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          }
        />

        {/* Section 3: Edit Template Message */}
        <ShareSection
          title="Edit Template Message"
          badge={
            <div className="bg-green-100 dark:bg-emerald-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-[10px] font-medium">
              Saved
            </div>
          }
          leftContent={
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs">
                  <IconUpload size={14} className="mr-2" />
                  Upload Image
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Remove Image
                </Button>
              </div>

              <div className="relative">
                <Label className="text-xs">Body</Label>
                <Textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.currentTarget.value)}
                  rows={4}
                  className="mt-0.5 text-sm min-h-[100px]"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                  {templateBody.length} / 1024
                </span>
              </div>

              <div className="relative">
                <Label className="text-xs">Footer</Label>
                <Textarea
                  value={templateFooter}
                  onChange={(e) => setTemplateFooter(e.currentTarget.value)}
                  rows={1}
                  className="mt-0.5 text-sm min-h-[40px]"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                  {templateFooter.length} / 60
                </span>
              </div>

              <div className="relative">
                <Label className="text-xs">CTA</Label>
                <Input
                  value={templateCTA}
                  onChange={(e) => setTemplateCTA(e.currentTarget.value)}
                  className="mt-0.5 h-8 text-sm"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                  {templateCTA.length} / 20
                </span>
              </div>
            </div>
          }
          rightTitle="Preview"
          rightContent={
            <div
              className="bg-[#E5DDD5] dark:bg-gray-950 rounded min-h-[250px] flex flex-col justify-end p-4 relative"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 0, 0, 0.02) 10px, rgba(0, 0, 0, 0.02) 20px)",
              }}
            >
              <div className="bg-white dark:bg-gray-700 rounded-md rounded-tl-sm p-3 max-w-[85%] border border-gray-200 dark:border-gray-600 relative break-words before:content-[''] before:absolute before:left-[-6px] before:top-0 before:w-0 before:h-0 before:border-r-[6px] before:border-r-white dark:before:border-r-gray-700 before:border-b-[6px] before:border-b-transparent">
                <div className="text-xs leading-[1.4] text-[#303030] dark:text-gray-200 mb-0 whitespace-pre-wrap break-words">
                  {templateBody.split("\n").map((line, i) => (
                    <div key={i}>{line || "\u00A0"}</div>
                  ))}
                </div>
                {templateFooter && (
                  <div className="text-[0.65rem] text-[#667781] dark:text-gray-400 mt-2 leading-[1.3]">
                    {templateFooter.split("\n").map((line, i) => (
                      <div key={i}>{line || "\u00A0"}</div>
                    ))}
                  </div>
                )}
                <div className="bg-[#00A884] hover:bg-[#06cf9c] text-white py-2 px-4 rounded-xl text-center font-medium mt-2 cursor-pointer text-xs transition-colors">
                  {templateCTA}
                </div>
              </div>
            </div>
          }
        />

        {/* Section 4: QR Code */}
        <div>
          <ShareQR
            url={shareUrl}
            title={flowName}
            isPublished={true}
            id={flowDbId}
            queryKey={"flowShareSettings"}
            resourceName={"flow"}
          />
        </div>
      </div>
    </div>
  );
}
