"use client";

import { useEffect, useMemo, useState } from "react";

import {
  IconFolderOpen,
  IconPlus,
  IconSearch,
  IconSend,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useCampaignData } from "../../backend/campaign/campaign.query";
import { useAddCampaignParticipants } from "../../backend/campaign/campaignParticipants/campaignParticipants.query";
import { useContactGroupsByTeamId } from "../../backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "../../backend/campaign/contacts/contacts.query";
import {
  CampaignParticipantAddStatus,
  CampaignParticipantSource,
  ContactGroupType,
} from "../../types/enums";
import { PAGE_SIZE } from "../../utils/constants";
import { showWarnToast } from "../../utils/notifications";
import StatePagination from "./CampaignContactPagination";

interface AddParticipantModalProps {
  close: () => void;
  campaign: any;
  campaignType: string;
}

const AddParticipantModal = ({
  close,
  campaign,
  campaignType,
}: AddParticipantModalProps) => {
  const t = useTranslations("campaign.addParticipants");
  const [selectedTab, setSelectedTab] = useState<CampaignParticipantSource>(
    CampaignParticipantSource.INDIVIDUAL,
  );
  const [selectedContacts, setSelectedContacts] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<any[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(
    Object.values(CampaignParticipantAddStatus) || [],
  );

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });

  const { data, isPending } = useContacts(pagination, debouncedSearch);
  const { data: contactGroup, isLoading: groupIsLoading } =
    useContactGroupsByTeamId(campaign?.teamId);
  const { data: campaignData, isPending: isAllCampaignLoading } =
    useCampaignData(campaignType);
  const addCampaignParticipants = useAddCampaignParticipants(
    campaign?.id,
    () => {
      close();
    },
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);

      // ✅ Reset to first page when searching
      setPagination((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchText]);

  const contacts = data?.users;
  const isSelectedAll = useMemo(() => {
    if (selectedTab === CampaignParticipantSource.INDIVIDUAL) {
      return (
        contacts?.length > 0 && selectedContacts.length === contacts.length
      );
    }

    if (selectedTab === CampaignParticipantSource.GROUP) {
      const selectableGroups =
        contactGroup?.data?.filter((g) => g?._count?.contacts) || [];

      return (
        selectableGroups.length > 0 &&
        selectedGroups.length === selectableGroups.length
      );
    }

    if (selectedTab === CampaignParticipantSource.CAMPAIGN) {
      const selectableCampaigns =
        campaignData?.data?.filter((c) => c?.campaignParticipantsCount) || [];

      return (
        selectableCampaigns.length > 0 &&
        selectedCampaigns.length === selectableCampaigns.length
      );
    }

    return false;
  }, [
    selectedTab,
    contacts,
    selectedContacts,
    contactGroup?.data,
    selectedGroups,
    campaignData?.data,
    selectedCampaigns,
  ]);

  const handleSubmit = () => {
    if (
      selectedContacts.length === 0 &&
      selectedGroups.length === 0 &&
      selectedCampaigns?.length === 0
    ) {
      showWarnToast(t("warnings.noSelection"));
      return;
    }
    // ✅ OLD UI LOGIC: Campaign requires message status
    if (
      selectedTab === CampaignParticipantSource.CAMPAIGN &&
      selectedCampaigns.length > 0 &&
      selectedStatus.length === 0
    ) {
      showWarnToast(t("messageStatus.required"));
      return;
    }

    const contactIds = selectedContacts.map((customer) => customer.id);
    const groupIds = selectedGroups.map((group) => group.id);
    const campaignIds = selectedCampaigns.map((campaign) => campaign.id);
    const participants = {
      contactIds,
      groupIds,
      campaignIds,
      status: selectedStatus,
    };
    addCampaignParticipants.mutate({
      data: participants,
      campaignId: campaign?.id,
    });
  };
  const selectableContacts =
    contacts?.filter(
      (c) =>
        c.phone &&
        !c?.campaignParticipants?.some((cp) => cp?.campaignId === campaign?.id),
    ) || [];

  const disableSelectAllIndividual =
    selectedTab === CampaignParticipantSource.INDIVIDUAL &&
    selectableContacts.length === 0;

  function handleSelectAll(checked: boolean) {
    switch (selectedTab) {
      case CampaignParticipantSource.INDIVIDUAL: {
        setSelectedContacts(checked ? (contacts ?? []) : []);
        break;
      }

      case CampaignParticipantSource.GROUP: {
        const selectableGroups =
          contactGroup?.data?.filter((g) => (g?._count?.contacts ?? 0) > 0) ??
          [];

        setSelectedGroups(checked ? selectableGroups : []);
        break;
      }

      case CampaignParticipantSource.CAMPAIGN: {
        const selectableCampaigns =
          campaignData?.data?.filter(
            (c) => (c?.campaignParticipantsCount ?? 0) > 0,
          ) ?? [];

        setSelectedCampaigns(checked ? selectableCampaigns : []);
        break;
      }

      default:
        break;
    }
  }

  const filteredContacts = contacts?.filter((c) => c.phone != null);
  const filteredGroups = searchText
    ? contactGroup?.data.filter((g) =>
        g.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : contactGroup?.data;
  const filteredCampaigns = searchText
    ? campaignData?.data.filter((g) =>
        g.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : campaignData?.data;
  const totalPageCount = Math.ceil(
    (data?.totalCount ?? 0) / pagination.pageSize,
  );

  const getSelectedCount = () => {
    return (
      selectedContacts.length + selectedGroups.length + selectedCampaigns.length
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-xl! sm:max-w-2xl! h-[85vh] flex flex-col overflow-hidden">
        {/* <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden"> */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUsers className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search and Tab Selection */}
          <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t("search.placeholder", {
                  type: selectedTab?.toLowerCase(),
                })}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <IconX className="h-4 w-4" />
                </button>
              )}
            </div>

            <Tabs
              value={selectedTab}
              onValueChange={(v) =>
                setSelectedTab(v as CampaignParticipantSource)
              }
            >
              <TabsList className="grid w-full grid-cols-3 h-10">
                <TabsTrigger
                  value={CampaignParticipantSource.INDIVIDUAL}
                  className="gap-2 h-9 px-3"
                >
                  <IconUsers className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {t("tabs.individual")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value={CampaignParticipantSource.GROUP}
                  className="gap-2"
                >
                  <IconFolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tabs.group")}</span>
                </TabsTrigger>
                <TabsTrigger
                  value={CampaignParticipantSource.CAMPAIGN}
                  className="gap-2"
                >
                  <IconSend className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tabs.campaign")}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden">
            {/* Left Panel - Available Items */}
            <Card className="border-slate-200 bg-slate-50 dark:bg-transparent flex flex-col overflow-hidden py-1">
              <CardContent className="p-3 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">
                    {t("select.title", { type: selectedTab?.toLowerCase() })}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={isSelectedAll}
                      disabled={disableSelectAllIndividual}
                      onCheckedChange={(checked) => {
                        if (checked === "indeterminate") return;
                        handleSelectAll(checked);
                      }}
                    />

                    <Label
                      htmlFor="select-all"
                      className="text-sm font-normal cursor-pointer"
                    >
                      {t("select.selectAll")}
                    </Label>
                  </div>
                </div>

                <Separator className="mb-4" />

                {isPending || isAllCampaignLoading || groupIsLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {selectedTab === CampaignParticipantSource.CAMPAIGN && (
                      <div className="mb-4">
                        <Label className="text-xs mb-2">
                          {t("messageStatus.label")}{" "}
                          <span className="text-red-500">*</span>
                        </Label>

                        <Select
                          value={selectedStatus[0] || ""}
                          onValueChange={(value) => setSelectedStatus([value])}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("messageStatus.placeholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(CampaignParticipantAddStatus).map(
                              (status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <ScrollArea className="flex-1 overflow-hidden">
                      <div className="space-y-2 pr-4">
                        {selectedTab ===
                          CampaignParticipantSource.INDIVIDUAL && (
                          <>
                            {filteredContacts?.length > 0 ? (
                              filteredContacts.map((contact) => {
                                const isAlreadySelected =
                                  contact?.campaignParticipants?.some(
                                    (c) => c?.campaignId === campaign?.id,
                                  );
                                return (
                                  <Individual
                                    key={contact?.id}
                                    customer={contact}
                                    selectedContacts={selectedContacts}
                                    setSelectedContacts={setSelectedContacts}
                                    isAlreadySelected={isAlreadySelected}
                                  />
                                );
                              })
                            ) : (
                              <p className="text-sm text-slate-500 text-center py-8">
                                {t("empty.contacts")}
                              </p>
                            )}
                          </>
                        )}

                        {selectedTab === CampaignParticipantSource.GROUP && (
                          <>
                            {filteredGroups?.length > 0 ? (
                              filteredGroups.map((group) => (
                                <CustomerGroup
                                  key={group.id}
                                  group={group}
                                  selectedGroups={selectedGroups}
                                  setSelectedGroups={setSelectedGroups}
                                />
                              ))
                            ) : (
                              <p className="text-sm text-slate-500 text-center py-8">
                                {t("empty.groups")}
                              </p>
                            )}
                          </>
                        )}

                        {selectedTab === CampaignParticipantSource.CAMPAIGN && (
                          <>
                            {filteredCampaigns?.length > 0 ? (
                              filteredCampaigns.map((campaign) => (
                                <CustomerCampaign
                                  key={campaign.id}
                                  campaign={campaign}
                                  selectedCampaigns={selectedCampaigns}
                                  setSelectedCampaigns={setSelectedCampaigns}
                                />
                              ))
                            ) : (
                              <p className="text-sm text-slate-500 text-center py-8">
                                {t("empty.campaigns")}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </ScrollArea>

                    {selectedTab === CampaignParticipantSource.INDIVIDUAL &&
                      filteredContacts?.length > 0 && (
                        <div className="mt-0">
                          <StatePagination
                            totalItems={data?.totalCount ?? 0}
                            pagination={pagination}
                            setPagination={setPagination}
                            pageSizeOptions={PAGE_SIZE.map(Number)}
                          />
                        </div>
                      )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Right Panel - Selected Items */}
            <Card className="border-slate-200 bg-slate-50 dark:bg-transparent flex flex-col overflow-hidden">
              <CardContent className="p-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">
                    {t("select.selected")}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="text-primary bg-primary/10"
                  >
                    {t("select.items", { count: getSelectedCount() })}
                  </Badge>
                </div>

                <Separator className="mb-4" />

                {getSelectedCount() === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                      <IconUsers className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">
                      {t("empty.selectedTitle")}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {t("empty.selectedHint")}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 overflow-hidden">
                    <div className="space-y-2 pr-4">
                      {selectedContacts?.map((customer) => {
                        const isAlreadySelected =
                          customer.campaignParticipants?.some(
                            (c) => c?.campaignId === campaign?.id,
                          );
                        return (
                          <Individual
                            key={customer?.id}
                            customer={customer}
                            selectedContacts={selectedContacts}
                            setSelectedContacts={setSelectedContacts}
                            isAlreadySelected={isAlreadySelected}
                          />
                        );
                      })}
                      {selectedGroups?.map((group) => (
                        <CustomerGroup
                          key={group?.id}
                          group={group}
                          selectedGroups={selectedGroups}
                          setSelectedGroups={setSelectedGroups}
                        />
                      ))}
                      {selectedCampaigns?.map((campaign) => (
                        <CustomerCampaign
                          key={campaign?.id}
                          campaign={campaign}
                          selectedCampaigns={selectedCampaigns}
                          setSelectedCampaigns={setSelectedCampaigns}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="mt-auto">
          <Button variant="outline" onClick={close}>
            {t("actions.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              addCampaignParticipants.isPending ||
              getSelectedCount() === 0 ||
              (selectedTab === CampaignParticipantSource.CAMPAIGN &&
                selectedCampaigns.length > 0 &&
                selectedStatus.length === 0)
            }
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            {addCampaignParticipants.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("actions.submitting")}
              </>
            ) : (
              <>
                <IconPlus className="h-4 w-4" />
                {t("actions.submit")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface IndividualProps {
  customer: any;
  selectedContacts: any[];
  setSelectedContacts: (contacts: any[]) => void;
  isAlreadySelected?: boolean;
}

export const Individual = ({
  customer,
  selectedContacts,
  setSelectedContacts,
  isAlreadySelected = false,
}: IndividualProps) => {
  const t = useTranslations("campaign.addParticipants");
  const isSelected = selectedContacts.some((c) => c?.id === customer?.id);

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-background hover:border-primary hover:bg-primary/5
 transition-all"
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate max-w-42.5">
          {customer?.name}
        </h4>
        <p className="text-xs text-slate-500 font-mono">{customer?.phone}</p>
      </div>
      {isSelected ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedContacts(
              selectedContacts.filter((c) => c?.id !== customer?.id),
            );
          }}
          className="ml-2 shrink-0"
        >
          {t("actions.remove")}
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => {
            setSelectedContacts([...selectedContacts, customer]);
          }}
          disabled={isAlreadySelected}
          className="ml-2 shrink-0 bg-[#2E5BFF] hover:bg-[#2E5BFF]/90"
        >
          {isAlreadySelected ? t("actions.added") : t("actions.add")}
        </Button>
      )}
    </div>
  );
};

interface CustomerGroupProps {
  group: any;
  selectedGroups: any[];
  setSelectedGroups: (groups: any[]) => void;
  isAlreadySelected?: boolean;
}

export const CustomerGroup = ({
  group,
  selectedGroups,
  setSelectedGroups,
  isAlreadySelected = false,
}: CustomerGroupProps) => {
  const t = useTranslations("campaign.addParticipants");
  const isSelected = selectedGroups.some((c) => c?.id === group?.id);
  const memberCount =
    group.type === ContactGroupType.NORMAL
      ? group?._count.contacts
      : group._count.LoyaltyCustomerMap;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-[#2E5BFF] hover:bg-[#2E5BFF]/5 transition-all">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate max-w-[170px]">
          {group?.name}
        </h4>
        <p className="text-xs text-slate-500">
          {t("labels.members", { count: memberCount })}
        </p>
      </div>
      {isSelected ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedGroups(
              selectedGroups.filter((c) => c?.id !== group?.id),
            );
          }}
          className="ml-2 shrink-0"
        >
          {t("actions.remove")}
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => {
            setSelectedGroups([...selectedGroups, group]);
          }}
          disabled={isAlreadySelected || !memberCount}
          className="ml-2 shrink-0 bg-[#2E5BFF] hover:bg-[#2E5BFF]/90"
        >
          {isAlreadySelected ? t("actions.added") : t("actions.add")}
        </Button>
      )}
    </div>
  );
};

interface CustomerCampaignProps {
  campaign: any;
  selectedCampaigns: any[];
  setSelectedCampaigns: (campaigns: any[]) => void;
}

const CustomerCampaign = ({
  campaign,
  selectedCampaigns,
  setSelectedCampaigns,
}: CustomerCampaignProps) => {
  const t = useTranslations("campaign.addParticipants");
  const isSelected = selectedCampaigns.some((c) => c?.id === campaign?.id);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-[#2E5BFF] hover:bg-[#2E5BFF]/5 transition-all">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate max-w-[170px]">
          {campaign?.name}
        </h4>
        <p className="text-xs text-slate-500">
          {t("labels.participants", {
            count: campaign?.campaignParticipantsCount || 0,
          })}
        </p>
      </div>
      {isSelected ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedCampaigns(
              selectedCampaigns.filter((c) => c?.id !== campaign?.id),
            );
          }}
          className="ml-2 shrink-0"
        >
          {t("actions.remove")}
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => {
            setSelectedCampaigns([...selectedCampaigns, campaign]);
          }}
          disabled={!campaign?.campaignParticipantsCount}
          className="ml-2 shrink-0 bg-[#2E5BFF] hover:bg-[#2E5BFF]/90"
        >
          {t("actions.add")}
        </Button>
      )}
    </div>
  );
};

export default AddParticipantModal;
