import { IconFile, IconFileDescription, IconSearch } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSendWaTemplateToUser } from "@/backend/whatsapp/whatsapp.query";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog.tsx";
import useTemplatesAvailableForTeam from "@/hooks/team.tsx";
import { WaTemplateStatus } from "@/types/enums.ts";

import { TeamSelector } from "../../../../../input/TeamSelector.tsx";
import NothingFound from "../../../../../NothingFound/NothingFound.tsx";
import { usePhoneIdStore } from "../../../chatselect/accountSelectorStore.ts";
import { WaInboxTemplatePreviewNew } from "./templatePreview/index.tsx";

interface Props {
  sessionExpired: boolean;
  contact: ContactsData | null;
  opened: boolean;
  onClose: any;
}

function templateBodyText(templateComponent: Array<{ type?: string; text?: string }>) {
  const templateBody = templateComponent.filter((i) => i.type === "BODY");
  const text = templateBody[0]?.text || "";

  const truncated = text.length > 50 ? text.slice(0, 20) + "..." : text;

  return <div className="text-gray-500 text-sm py-4 w-full sm:max-w-[23vw]">{truncated}</div>;
}

export default function WaInboxTemplateDisplayModal({ contact, opened, onClose }: Readonly<Props>) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const sendTemplate = useSendWaTemplateToUser(contact?.phone ?? "", contact?.id);
  const [teamId, setTeamId] = useState<string>("");
  const { whatsappSettingsPhoneId } = usePhoneIdStore();
  const templatesAvailableForTeam = useTemplatesAvailableForTeam(teamId);
  const approvedTemplates = templatesAvailableForTeam?.filter(
    (template) => template?.data?.status === "APPROVED",
  );
  const [searchTerm, setSearchTerm] = useState<string>("");

  const searchFilteredTemplates = approvedTemplates?.filter((template) =>
    template.data.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredTemplates = searchFilteredTemplates;

  const hasTemplates =
    filteredTemplates &&
    filteredTemplates?.length > 0 &&
    searchFilteredTemplates?.find((data) => data.id === selectedTemplateId);
  // The preview needs the selected template itself, not just the flag above.
  const selectedTemplate = selectedTemplateId
    ? filteredTemplates.find((template) => template.id === selectedTemplateId)?.data
    : undefined;
  const { t: translations } = useTranslation();

  return (
    <Dialog
      open={opened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="z-60 max-h-[90vh] w-full overflow-auto sm:max-w-225">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-2 rounded-md flex items-center justify-center">
              <IconFile color="white" />
            </div>
            <div className="flex flex-col items-start justify-center gap-1">
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {translations("Send Template Message")}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 max-w-xl">
                {translations(
                  "Select an approved template for messages sent after 24 hours of inactivity",
                )}
              </DialogDescription>
            </div>
          </div>
        </div>
        {/* Top controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2 border rounded-xl max-w-xl w-full p-1.5">
            <IconSearch className="shrink-0 text-gray-500" />
            <input
              placeholder="Search template"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full outline-none text-sm"
            />
          </div>
          <TeamSelector value={teamId} onChange={setTeamId} className="sm:max-w-xs w-full" />
        </div>
        {/* Main content: list + divider + preview */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* LEFT: templates list */}
          <div
            className="
        w-full
        p-2
        h-[50vh]
        overflow-x-auto
        sm:w-[260px] md:w-[300px] lg:w-[340px]
        shrink-0
        flex flex-col gap-4
        sm:border-r sm:pr-4
        max-h-[40vh] sm:max-h-none 
        overflow-y-auto
      "
          >
            {filteredTemplates?.map((template, i) => {
              let color = "";
              let background = "";

              switch (template?.data?.status) {
                case WaTemplateStatus.APPROVED: {
                  color = "#16A34A"; // green-600
                  background = "#DCFCE7"; // green-100
                  break;
                }
                case WaTemplateStatus.PENDING: {
                  color = "#CA8A04"; // yellow-600
                  background = "#FEF9C3"; // yellow-100
                  break;
                }
                case WaTemplateStatus.REJECTED: {
                  color = "#DC2626"; // red-600
                  background = "#FEE2E2"; // red-100
                  break;
                }
                case WaTemplateStatus.DRAFT: {
                  color = "#2563EB"; // blue-600
                  background = "#DBEAFE"; // blue-100
                  break;
                }
                default: {
                  color = "#4B5563"; // gray-600
                  background = "#F3F4F6"; // gray-100
                }
              }

              return (
                <div
                  key={i}
                  className={`border p-3 sm:p-4 rounded-xl flex flex-col items-start justify-center gap-2 transition-all duration-200 hover:scale-[1.02] cursor-pointer shadow-sm ${
                    selectedTemplateId === template?.id ? "border-green-500 bg-green-50" : ""
                  }`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <div className="flex items-center justify-start gap-2">
                    <IconFileDescription className="text-gray-500" strokeWidth={1} size={18} />
                    <h1 className="text-sm sm:text-base font-semibold line-clamp-1">
                      {template?.data?.name}
                    </h1>
                  </div>

                  <div className="space-y-2 w-full">
                    <div className="flex flex-wrap items-center justify-start gap-2">
                      <p
                        className="border px-3 py-1 text-[11px] sm:text-xs font-medium rounded-full"
                        style={{
                          borderColor: color,
                          backgroundColor: background,
                          color: color,
                        }}
                      >
                        {template?.data?.status}
                      </p>
                      <p className="bg-blue-100 text-blue-600 border border-blue-600 px-3 py-1 text-[11px] sm:text-xs font-medium rounded-full">
                        {template?.data?.category}
                      </p>
                    </div>
                    {templateBodyText(template?.data?.components)}
                  </div>

                  <div className="text-[11px] sm:text-xs text-gray-500">
                    {dayjs(template?.createdAt).format("DD MMM YYYY")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: preview (only this scrolls on larger screens) */}
          <div
            className="
        flex-1 w-full
        max-h-none
        sm:h-[50vh]
        overflow-visible
        sm:overflow-y-auto
      "
          >
            {hasTemplates && selectedTemplate ? (
              <WaInboxTemplatePreviewNew
                teamId={teamId}
                template={selectedTemplate}
                selectedTemplateId={selectedTemplateId}
                sendTemplate={sendTemplate}
                onClose={onClose}
                setSelectedTemplateId={setSelectedTemplateId}
                whatsappSettingsPhoneId={whatsappSettingsPhoneId}
              />
            ) : (
              <div className="flex h-full items-center justify-center py-6">
                <NothingFound text={translations("No templates Selected")} />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
