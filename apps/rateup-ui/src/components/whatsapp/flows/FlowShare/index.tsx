import {
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconCopy,
  IconDeviceFloppy,
  IconMail,
  IconUpload,
} from "@tabler/icons-react";
import { useId, useEffect, useState } from "react";
import { toast } from "sonner";

import { useUpdateFlowMutation, useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import ShareQR from "@/components/Survey/ShareSurvey/ShareQR/index.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

import { ShareSection } from "./ShareSection.tsx";

interface FlowShareProps {
  flowName: string;
  flowDbId: string;
  survey: any;
  surveyId: string;
}

export default function FlowShare({ flowName, flowDbId, survey, surveyId }: FlowShareProps) {
  const uid = useId();
  // Share Survey state

  const updateFlowMutation = useUpdateFlowMutation();
  const { data: flowData } = useWaFlowFromDb(flowDbId);
  const [selectedTeam, setSelectedTeam] = useState(survey?.teams?.[0]?.code || "");
  const [selectedTag, setSelectedTag] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState(survey?.teams?.[0]?.mapId);
  const [shortUrlId, setShortUrlId] = useState(survey?.teams?.[0]?.shortUrlId);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Start Message state
  const [startMessageBody, setStartMessageBody] = useState("Send this message to start survey.");
  const [startMessageSuffix, setStartMessageSuffix] = useState("");

  // Load start message values from DB
  useEffect(() => {
    if (flowData?.startMessageConfig) {
      setStartMessageBody(
        flowData.startMessageConfig.prefix || "Send this message to start survey.",
      );
      setStartMessageSuffix(flowData.startMessageConfig.suffix || "");
    }
    if (flowData?.templateMessage) {
      setTemplateBody(flowData.templateMessage.body || "");
      setTemplateFooter(flowData.templateMessage.footer || "");
      setTemplateCTA(flowData.templateMessage.cta || "Start");
      setHeaderImage(flowData.templateMessage.headerImage || null);
    }
  }, [flowData]);

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

  const selectedTeamObj = survey?.teams?.find((team) => team?.code === selectedTeam);
  const tagOptions =
    selectedTeamObj?.tags?.map((tag: string) => ({
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
      const baseUrl = `${import.meta.env.VITE_FRONTEND_URL}/was/${shortUrlId}`;
      const urlWithTag = selectedTag ? `${baseUrl}?tag=${selectedTag}` : baseUrl;
      setShareUrl(urlWithTag);
    } else {
      // Fallback URL if shortUrlId is not available
      setShareUrl(`${import.meta.env.VITE_FRONTEND_URL}/public/wa/${surveyTeamMapId}/redirect`);
    }
  }, [surveyId, surveyTeamMapId, selectedTag, shortUrlId]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("URL copied to clipboard!");
  };

  const handleSaveStartMessage = () => {
    updateFlowMutation.mutate({
      dbFlowId: flowDbId,
      data: {
        startMessageConfig: {
          prefix: startMessageBody,
          suffix: startMessageSuffix,
        },
      },
    });
  };

  const handleSaveTemplateMessage = () => {
    updateFlowMutation.mutate({
      dbFlowId: flowDbId,
      data: {
        templateMessage: {
          body: templateBody,
          cta: templateCTA,
          footer: templateFooter,
          headerImage: headerImage,
        },
      },
    });
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
                <Field className="flex-1">
                  <FieldLabel
                    htmlFor={`${uid}-select-team`}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    Select Team
                  </FieldLabel>
                  <Select
                    value={selectedTeam}
                    onValueChange={(value) => setSelectedTeam(value)}
                    items={teamOptions}
                  >
                    <SelectTrigger id={`${uid}-select-team`} className="h-9 text-sm w-full">
                      <SelectValue placeholder="Team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamOptions.map((option: { value: string; label: string }) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex-1">
                  <FieldLabel
                    htmlFor={`${uid}-select-tag`}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    Select Tag
                  </FieldLabel>
                  <Select
                    value={selectedTag}
                    onValueChange={(value) => setSelectedTag(value)}
                    items={tagOptions}
                  >
                    <SelectTrigger id={`${uid}-select-tag`} className="h-9 text-sm w-full">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {tagOptions.length > 0 ? (
                        tagOptions.map((option: { value: string; label: string }) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))
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
                <FieldLabel
                  htmlFor={`${uid}-share-link`}
                  className="text-xs text-gray-500 dark:text-gray-400"
                >
                  Share Link
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id={`${uid}-share-link`}
                    value={shareUrl}
                    readOnly
                    className="flex-1 h-9 text-xs font-mono bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300"
                  />
                  <Button onClick={handleCopyUrl} size="sm" variant="outline" className="h-9 px-3">
                    <IconCopy size={14} className="mr-2" />
                    Copy
                  </Button>
                </div>
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
            updateFlowMutation.isPending ? (
              <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded text-[10px] font-medium">
                Saving...
              </div>
            ) : (
              <div className="bg-green-100 dark:bg-emerald-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-[10px] font-medium">
                Saved
              </div>
            )
          }
          leftContent={
            <div className="flex flex-col gap-2">
              <Field className="relative">
                <FieldLabel htmlFor={`${uid}-body`} className="text-xs">
                  Body
                </FieldLabel>
                <Textarea
                  id={`${uid}-body`}
                  value={startMessageBody}
                  onChange={(e) => setStartMessageBody(e.currentTarget.value)}
                  rows={3}
                  className="mt-0.5 text-sm min-h-[80px]"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                  {startMessageBody.length} / 1024
                </span>
              </Field>
              <Field className="relative">
                <FieldLabel htmlFor={`${uid}-suffix`} className="text-xs">
                  Suffix
                </FieldLabel>
                <Textarea
                  id={`${uid}-suffix`}
                  value={startMessageSuffix}
                  onChange={(e) => setStartMessageSuffix(e.currentTarget.value)}
                  rows={3}
                  className="mt-0.5 text-sm min-h-[80px]"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                  {startMessageSuffix.length} / 1024
                </span>
              </Field>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveStartMessage}
                  disabled={updateFlowMutation.isPending}
                  className="h-8 text-xs"
                >
                  <IconDeviceFloppy size={14} className="mr-1.5" />
                  {updateFlowMutation.isPending ? "Saving..." : "Save"}
                </Button>
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
                    <div key={i} className="text-xs" style={{ lineHeight: 1.4 }}>
                      {line || "\u00A0"}
                    </div>
                  ))}
                  <span className="text-[10px] mt-1 inline-block bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 px-1 py-0.5 rounded font-mono">
                    #{flowName} @{selectedTeam}
                  </span>
                  {startMessageSuffix &&
                    startMessageSuffix.split("\n").map((line, i) => (
                      <div key={i} className="text-xs mt-1" style={{ lineHeight: 1.4 }}>
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
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="flow-image-upload"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      setImageUploading(true);
                      const url = await uploadFile(file);
                      setHeaderImage(url);
                      toast.success("Image uploaded");
                    } catch {
                      toast.error("Upload failed");
                    } finally {
                      setImageUploading(false);
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  disabled={imageUploading}
                  onClick={() => document.getElementById("flow-image-upload")?.click()}
                >
                  <IconUpload size={14} className="mr-2" />
                  {imageUploading ? "Uploading..." : headerImage ? "Change Image" : "Upload Image"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setHeaderImage(null)}
                >
                  Remove Image
                </Button>
              </div>

              <Field className="relative">
                <FieldLabel htmlFor={`${uid}-body-2`} className="text-xs">
                  Body
                </FieldLabel>
                <Textarea
                  id={`${uid}-body-2`}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.currentTarget.value)}
                  rows={4}
                  className="mt-0.5 text-sm min-h-[100px]"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                  {templateBody.length} / 1024
                </span>
              </Field>

              <Field className="relative">
                <FieldLabel htmlFor={`${uid}-footer`} className="text-xs">
                  Footer
                </FieldLabel>
                <Textarea
                  id={`${uid}-footer`}
                  value={templateFooter}
                  onChange={(e) => setTemplateFooter(e.currentTarget.value)}
                  rows={1}
                  className="mt-0.5 text-sm min-h-[40px]"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                  {templateFooter.length} / 60
                </span>
              </Field>

              <Field className="relative">
                <FieldLabel htmlFor={`${uid}-cta`} className="text-xs">
                  CTA
                </FieldLabel>
                <Input
                  id={`${uid}-cta`}
                  value={templateCTA}
                  onChange={(e) => setTemplateCTA(e.currentTarget.value)}
                  className="mt-0.5 h-8 text-sm"
                />
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 px-1 py-0.5 rounded pointer-events-none">
                  {templateCTA.length} / 20
                </span>
              </Field>
              <div className="flex w-full justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveTemplateMessage}
                  disabled={updateFlowMutation.isPending}
                  className="h-8 text-xs"
                >
                  <IconDeviceFloppy size={14} className="mr-1.5" />
                  {updateFlowMutation.isPending ? "Saving..." : "Save"}
                </Button>
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
              <div className="bg-white dark:bg-gray-700 rounded-md rounded-tl-sm p-3 max-w-[85%] border border-gray-200 dark:border-gray-600 relative wrap-break-words before:content-[''] before:absolute before:left-[-6px] before:top-0 before:w-0 before:h-0 before:border-r-[6px] before:border-r-white dark:before:border-r-gray-700 before:border-b-[6px] before:border-b-transparent">
                {imageUploading ? (
                  <div className="w-full h-30 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md mb-2">
                    <span className="text-xs text-gray-500">Uploading image...</span>
                  </div>
                ) : (
                  headerImage && (
                    <img
                      src={getFileUrlFromKey(headerImage)}
                      alt="header"
                      className="max-w-50 h-auto rounded-md mb-2 object-contain"
                    />
                  )
                )}
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
