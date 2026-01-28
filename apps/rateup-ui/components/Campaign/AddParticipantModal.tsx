"use client";

import { useEffect, useState } from "react";

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
import ContactPagination from "../Contacts/ContactPagination";

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
  const translations = useTranslations();
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
    }, 200);

    return () => clearTimeout(timer);
  }, [searchText]);

  const contacts = data?.users;
  const isSelectedAll =
    selectedTab === CampaignParticipantSource.INDIVIDUAL
      ? selectedContacts.length === contacts?.length
      : selectedGroups.length === contactGroup?.data.length;

  const handleSubmit = () => {
    if (
      selectedContacts.length === 0 &&
      selectedGroups.length === 0 &&
      selectedCampaigns?.length === 0
    ) {
      showWarnToast(translations("You have not selected any participant"));
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

  function handleSelectAll(checked: boolean) {
    switch (selectedTab) {
      case CampaignParticipantSource.INDIVIDUAL:
        setSelectedContacts(checked ? contacts || [] : []);
        break;
      case CampaignParticipantSource.GROUP:
        setSelectedGroups(
          checked
            ? contactGroup?.data?.filter((data) => data?._count.contacts) || []
            : [],
        );
        break;
      case CampaignParticipantSource.CAMPAIGN:
        setSelectedCampaigns(
          checked
            ? campaignData?.data?.filter(
                (data) => data?.campaignParticipantsCount,
              ) || []
            : [],
        );
        break;
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
  const totalPageCount = (data?.totalCount ?? 1) / pagination.pageSize;

  const getSelectedCount = () => {
    return (
      selectedContacts.length + selectedGroups.length + selectedCampaigns.length
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className=" max-w-6xl min-w-3/6 flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUsers className="h-5 w-5 text-[#2E5BFF]" />
            Add Participants
          </DialogTitle>
          <DialogDescription>
            Select contacts, groups, or campaigns to add as participants
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden space-y-4">
          {/* Search and Tab Selection */}
          <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={`Search ${selectedTab?.toLowerCase()}...`}
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
                  <span className="hidden sm:inline">Individual</span>
                </TabsTrigger>
                <TabsTrigger
                  value={CampaignParticipantSource.GROUP}
                  className="gap-2"
                >
                  <IconFolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Group</span>
                </TabsTrigger>
                <TabsTrigger
                  value={CampaignParticipantSource.CAMPAIGN}
                  className="gap-2"
                >
                  <IconSend className="h-4 w-4" />
                  <span className="hidden sm:inline">Campaign</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-2 gap-3 h-full">
            {/* Left Panel - Available Items */}
            <Card className="border-slate-200  bg-slate-50 dark:bg-transparent  h-full flex flex-col">
              <CardContent className="p-3 flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">
                    Select {selectedTab?.toLowerCase()}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={isSelectedAll}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label
                      htmlFor="select-all"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Select All
                    </Label>
                  </div>
                </div>

                <Separator className="mb-4" />

                {isPending || isAllCampaignLoading || groupIsLoading ? (
                  <div className="flex items-center justify-center h-[350px]">
                    <div className="w-8 h-8 border-4 border-[#2E5BFF] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {selectedTab === CampaignParticipantSource.CAMPAIGN && (
                      <div className="mb-4">
                        <Label className="text-xs mb-2">Message Status</Label>
                        <Select
                          value={selectedStatus[0] || ""}
                          onValueChange={(value) => setSelectedStatus([value])}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pick status" />
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

                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-2">
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
                                {translations("No contacts found")}
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
                                {translations("No group found")}
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
                                {translations("No campaigns found")}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </ScrollArea>

                    {selectedTab === CampaignParticipantSource.INDIVIDUAL &&
                      filteredContacts?.length > 0 && (
                        <div className="mt-4">
                          <ContactPagination
                            pagination={pagination}
                            setPagination={setPagination}
                            totalPageCount={totalPageCount}
                          />
                        </div>
                      )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Right Panel - Selected Items */}
            <Card className="border-slate-200  bg-slate-50 dark:bg-transparent h-full flex flex-col">
              <CardContent className="p-4 flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Selected</h3>
                  <Badge
                    variant="secondary"
                    className="bg-[#2E5BFF]/10 text-[#2E5BFF]"
                  >
                    {getSelectedCount()} items
                  </Badge>
                </div>

                <Separator className="mb-4" />

                {getSelectedCount() === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[390px] text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                      <IconUsers className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No items selected</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Select contacts, groups, or campaigns to add
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-2">
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

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {translations("Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              addCampaignParticipants.isPending || getSelectedCount() === 0
            }
            className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/90 gap-2"
          >
            {addCampaignParticipants.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <IconPlus className="h-4 w-4" />
                {translations("Add Participants")}
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
  const isSelected = selectedContacts.some((c) => c?.id === customer?.id);
  const translations = useTranslations();

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-background hover:border-[#2E5BFF] hover:bg-[#2E5BFF]/5 transition-all">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{customer?.name}</h4>
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
          {translations("Remove")}
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
          {isAlreadySelected ? translations("Added") : translations("Add")}
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
  const isSelected = selectedGroups.some((c) => c?.id === group?.id);
  const translations = useTranslations();
  const memberCount =
    group.type === ContactGroupType.NORMAL
      ? group?._count.contacts
      : group._count.LoyaltyCustomerMap;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-[#2E5BFF] hover:bg-[#2E5BFF]/5 transition-all">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{group?.name}</h4>
        <p className="text-xs text-slate-500">{memberCount} members</p>
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
          {translations("Remove")}
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
          {isAlreadySelected ? translations("Added") : translations("Add")}
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
  const isSelected = selectedCampaigns.some((c) => c?.id === campaign?.id);
  const translations = useTranslations();

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-[#2E5BFF] hover:bg-[#2E5BFF]/5 transition-all">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{campaign?.name}</h4>
        <p className="text-xs text-slate-500">
          {campaign?.campaignParticipantsCount || 0} participants
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
          {translations("Remove")}
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
          {translations("Add")}
        </Button>
      )}
    </div>
  );
};

export default AddParticipantModal;
