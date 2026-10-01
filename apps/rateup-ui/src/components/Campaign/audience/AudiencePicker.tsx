import {
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconFolderOpen,
  IconListSearch,
  IconSearch,
  IconSend,
  IconUsers,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useCallback, useId, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useCampaignData } from "@/backend/campaign/campaign.query";
import {
  useAddCampaignParticipants,
  useCampaignParticipants,
  useClearCampaignParticipants,
  useRemoveCampaignParticipant,
} from "@/backend/campaign/campaignParticipants/campaignParticipants.query";
import {
  useContactGroupsByTeamId,
  useGroupMatchCounts,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import { pressable } from "@/components/common/pressable.ts";
import {
  ContactListFilters,
  toContactListQuery,
  useContactListFilters,
} from "@/components/Contacts/ContactListFilters.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { ContactAvatar } from "@/components/ui/contact-avatar.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { cn } from "@/lib/utils";
import {
  CampaignParticipantAddStatus,
  CampaignParticipantSource,
  ContactGroupType,
} from "@/types/enums.ts";
import type { Campaign } from "@/types/global";
import { PAGE_SIZE, WHATSAPP_CONTACT_CHANNEL } from "@/utils/constants.ts";

/**
 * The audience picker: three tabs (individual contacts, contact groups, previous
 * campaigns), an available panel and a selected panel.
 *
 * The one place an audience is chosen. It replaced `AddParticipantModal`, a
 * near-identical copy that the detail page opened as a dialog — the two drifted,
 * and only this one shows who is already on the campaign or lets them be
 * removed. Adding recipients now goes through the wizard's Audience step, so
 * there is a single picker and a single set of row components.
 */
export interface AudiencePickerProps {
  campaign: Campaign;
  campaignType: string;
  /** Called once participants have been added. */
  onAdded?: () => void;
  /**
   * Renders the picker's actions. The wizard puts them in its own footer and the
   * dialog in a DialogFooter, so the picker describes what it can do and lets
   * the caller place the buttons.
   */
  footer?: (state: {
    submit: () => Promise<boolean>;
    selectedCount: number;
    isPending: boolean;
    canSubmit: boolean;
  }) => ReactNode;
  /**
   * Handed the picker's commit whenever it changes, or `null` when there is
   * nothing selected to commit.
   *
   * For a caller whose button is not inside the picker: the wizard drives this
   * step from the shell's shared footer, so it has no `footer` to render and
   * needs the commit itself. Without it the wizard's Next simply advanced, and
   * everything picked here was dropped.
   */
  onSubmitChange?: (submit: (() => Promise<boolean>) | null) => void;
  /**
   * Which source tab is showing. Pass it (with `onTabChange`) to place the tabs
   * yourself — the wizard puts them beside the step heading, as the design does,
   * rather than on a row of their own. Left out, the picker owns the tabs and
   * renders them above the panels.
   */
  tab?: CampaignParticipantSource;
  onTabChange?: (tab: CampaignParticipantSource) => void;
}

/**
 * How many enrolled recipients the Selected panel lists by name.
 *
 * A campaign can hold thousands, and a wall of chips is neither readable nor
 * cheap to render — past this the panel says how many more there are and points
 * at the Participants tab, which is built for the whole list.
 */
const ENROLLED_PAGE_SIZE = 50;

export function AudiencePicker({
  campaign,
  campaignType,
  onAdded,
  footer,
  onSubmitChange,
  tab,
  onTabChange,
}: Readonly<AudiencePickerProps>) {
  const uid = useId();
  const { t } = useTranslation("campaign.addParticipants");
  // The filter bar's strings, shared with the group dialog, live in the default namespace.
  const { t: tc } = useTranslation();
  const [ownTab, setOwnTab] = useState<CampaignParticipantSource>(
    CampaignParticipantSource.INDIVIDUAL,
  );
  const selectedTab = tab ?? ownTab;
  const setSelectedTab = onTabChange ?? setOwnTab;
  const [selectedContacts, setSelectedContacts] = useState<ContactsData[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<ContactGroup[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Campaign[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(
    Object.values(CampaignParticipantAddStatus) || [],
  );

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });

  // Label, stage, source and custom-field filters for the Individual tab. Applied by the
  // server, so "Add all matching" can enrol everyone they match, not just the page shown.
  const listFilters = useContactListFilters(() =>
    setPagination((prev) => ({ ...prev, pageIndex: 0 })),
  );
  const [showFilters, setShowFilters] = useState(false);
  // Campaigns message over WhatsApp, so only WhatsApp contacts can take part: the contact list is
  // filtered to them, and each group's member count reports only the members it can reach.
  const contactFilters = useMemo(
    () => [{ id: "channel", value: WHATSAPP_CONTACT_CHANNEL }, ...listFilters.filters],
    [listFilters.filters],
  );
  const { data, isPending } = useContacts(pagination, debouncedSearch, undefined, contactFilters);
  // On the Group tab the same filters narrow which members a group contributes, applied to
  // every group picked (see handleSubmit). Each group then shows how many members match.
  const groupFilterQuery = useMemo(
    () => (listFilters.filters.length > 0 ? toContactListQuery(listFilters.filters) : null),
    [listFilters.filters],
  );
  const { data: matchCounts } = useGroupMatchCounts(campaign?.teamId, groupFilterQuery);
  // What a group would add right now: its matching members while filtering (undefined until the
  // counts arrive), otherwise every member.
  const groupReach = (group: ContactGroup) =>
    groupFilterQuery ? (matchCounts ? (matchCounts[group.id] ?? 0) : undefined) : undefined;
  const contributes = (group: ContactGroup) =>
    (groupReach(group) ?? group?._count?.contacts ?? 0) > 0;
  const { data: contactGroup, isLoading: groupIsLoading } = useContactGroupsByTeamId(
    campaign?.teamId,
    WHATSAPP_CONTACT_CHANNEL,
  );
  const { data: campaignData, isPending: isAllCampaignLoading } = useCampaignData(campaignType);

  // Who is already on the campaign. Without this the Selected panel only ever
  // showed the picks made in this sitting, so reopening a draft that already had
  // recipients showed an empty panel and no way to take any of them off again.
  const { data: enrolledData } = useCampaignParticipants(
    campaign?.id ?? "",
    { pageIndex: 0, pageSize: ENROLLED_PAGE_SIZE },
    "",
    [],
    [],
  );
  const enrolled = enrolledData?.participants ?? [];
  const enrolledTotal = enrolledData?.totalCount ?? 0;
  const removeParticipant = useRemoveCampaignParticipant(campaign?.id ?? "");
  const clearParticipants = useClearCampaignParticipants(campaign?.id ?? "");
  const confirm = useConfirm();
  // Enrolling is how the wizard's Audience step advances, so its toast fired on
  // Next and covered the button. The step's own progress tick is the feedback.
  const addCampaignParticipants = useAddCampaignParticipants(
    campaign?.id,
    () => {
      onAdded?.();
    },
    { silent: true },
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
      return (contacts?.length ?? 0) > 0 && selectedContacts.length === contacts?.length;
    }

    if (selectedTab === CampaignParticipantSource.GROUP) {
      const selectableGroups = contactGroup?.data?.filter(contributes) || [];

      return selectableGroups.length > 0 && selectedGroups.length === selectableGroups.length;
    }

    if (selectedTab === CampaignParticipantSource.CAMPAIGN) {
      const selectableCampaigns =
        campaignData?.data?.filter((c: Campaign) => c?.campaignParticipantsCount) || [];

      return (
        selectableCampaigns.length > 0 && selectedCampaigns.length === selectableCampaigns.length
      );
    }

    return false;
  }, [
    selectedTab,
    contacts,
    selectedContacts,
    contactGroup?.data,
    // `contributes` reads these.
    groupFilterQuery,
    matchCounts,
    selectedGroups,
    campaignData?.data,
    selectedCampaigns,
  ]);

  /**
   * Enrol what is selected. Resolves whether the participants were actually
   * written, so a caller can decide whether to move on — the wizard must not
   * advance past an audience that failed to save.
   */
  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (
      selectedContacts.length === 0 &&
      selectedGroups.length === 0 &&
      selectedCampaigns?.length === 0
    ) {
      toast.warning(t("You have not selected any participant"));
      return false;
    }
    // ✅ OLD UI LOGIC: Campaign requires message status
    if (
      selectedTab === CampaignParticipantSource.CAMPAIGN &&
      selectedCampaigns.length > 0 &&
      selectedStatus.length === 0
    ) {
      toast.warning(t("Please select message status"));
      return false;
    }

    const contactIds = selectedContacts.map((customer) => customer.id);
    const groupIds = selectedGroups.map((group) => group.id);
    // Option A: the filters on screen when this commits apply to every picked group.
    const groupFilter = groupIds.length > 0 && groupFilterQuery ? groupFilterQuery : undefined;
    const campaignIds = selectedCampaigns.map((campaign) => campaign.id);
    const participants = {
      contactIds,
      groupIds,
      groupFilter,
      campaignIds,
      status: selectedStatus,
    };
    try {
      await addCampaignParticipants.mutateAsync({
        data: participants,
        campaignId: campaign?.id,
      });
      return true;
    } catch {
      // The mutation's own onError has already told the user.
      return false;
    }
  }, [
    addCampaignParticipants,
    campaign?.id,
    selectedCampaigns,
    selectedContacts,
    selectedGroups,
    selectedStatus,
    selectedTab,
    groupFilterQuery,
    t,
  ]);
  const selectableContacts =
    contacts?.filter(
      (c) => c.phone && !c?.campaignParticipants?.some((cp) => cp?.campaignId === campaign?.id),
    ) || [];

  const disableSelectAllIndividual =
    selectedTab === CampaignParticipantSource.INDIVIDUAL && selectableContacts.length === 0;

  function handleSelectAll(checked: boolean) {
    switch (selectedTab) {
      case CampaignParticipantSource.INDIVIDUAL: {
        setSelectedContacts(checked ? (contacts ?? []) : []);
        break;
      }

      case CampaignParticipantSource.GROUP: {
        const selectableGroups = contactGroup?.data?.filter(contributes) ?? [];

        setSelectedGroups(checked ? selectableGroups : []);
        break;
      }

      case CampaignParticipantSource.CAMPAIGN: {
        const selectableCampaigns =
          campaignData?.data?.filter((c: Campaign) => (c?.campaignParticipantsCount ?? 0) > 0) ??
          [];

        setSelectedCampaigns(checked ? selectableCampaigns : []);
        break;
      }

      default:
        break;
    }
  }

  const filteredContacts = contacts?.filter((c) => c.phone != null);
  const filteredGroups = searchText
    ? contactGroup?.data.filter((g) => g.name.toLowerCase().includes(searchText.toLowerCase()))
    : contactGroup?.data;
  const filteredCampaigns = searchText
    ? campaignData?.data.filter((g: Campaign) =>
        g.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : campaignData?.data;

  const getSelectedCount = () => {
    return selectedContacts.length + selectedGroups.length + selectedCampaigns.length;
  };
  const totalAvailable = data?.totalCount ?? 0;
  const pageStart = pagination.pageIndex * pagination.pageSize + 1;
  const pageEnd = Math.min(pageStart + (contacts?.length ?? 0) - 1, totalAvailable);
  const selectedCount = getSelectedCount();
  const loading = isPending || isAllCampaignLoading || groupIsLoading;

  // What the campaign's audience adds up to: already enrolled, plus what is
  // picked and not yet written.
  const audienceTotal = enrolledTotal + selectedCount;

  const canSubmit =
    selectedCount > 0 &&
    !(
      selectedTab === CampaignParticipantSource.CAMPAIGN &&
      selectedCampaigns.length > 0 &&
      selectedStatus.length === 0
    );

  // Report the commit upward for a caller placing its own button. Null while
  // there is nothing to write, which is how the wizard tells "leave the audience
  // for later" — a legitimate choice — from "this failed".
  useEffect(() => {
    onSubmitChange?.(canSubmit ? handleSubmit : null);
  }, [onSubmitChange, canSubmit, handleSubmit]);

  /**
   * Empty the panel — both the picks waiting to be written and the recipients
   * already on the campaign.
   *
   * The enrolled half is a real deletion, so it asks first. Before this the link
   * only appeared while something was picked, which meant that the moment a
   * selection was saved there was no way to undo it from here at all.
   */
  const clearAll = async () => {
    if (enrolledTotal > 0) {
      const confirmed = await confirm({
        title: t("Remove every recipient?"),
        description: t(
          "This takes all {count} recipients off the campaign. Contacts and groups themselves are not deleted.",
          { count: enrolledTotal },
        ),
        confirmText: t("Remove all"),
        cancelText: t("Cancel"),
      });
      if (!confirmed) return;
      await clearParticipants.mutateAsync();
    }
    setSelectedContacts([]);
    setSelectedGroups([]);
    setSelectedCampaigns([]);
  };

  const isNarrowed = listFilters.filters.length > 0 || debouncedSearch.trim().length > 0;

  /**
   * Enrol every contact the current search and filters match, across all pages. Written
   * straight away rather than staged as picks: the selection could be thousands of contacts,
   * and the server resolves the filter itself, so there are no rows here to stage.
   */
  const addAllMatching = async () => {
    const confirmed = await confirm({
      title: tc("Add all matching contacts"),
      description: t(
        "{count, plural, one {# WhatsApp contact matches} other {# WhatsApp contacts match}} these filters. Anyone already on the campaign is skipped.",
        { count: totalAvailable },
      ),
      confirmText: tc("Add all"),
      cancelText: t("Cancel"),
    });
    if (!confirmed) return;
    try {
      await addCampaignParticipants.mutateAsync({
        data: {
          contactIds: [],
          groupIds: [],
          campaignIds: [],
          status: selectedStatus,
          filter: toContactListQuery(contactFilters, debouncedSearch),
        },
        campaignId: campaign?.id,
      });
      toast.success(t("Matching contacts added to the campaign"));
    } catch {
      // The mutation's own onError has already told the user.
    }
  };

  const tabLabel =
    selectedTab === CampaignParticipantSource.INDIVIDUAL
      ? t("contacts")
      : selectedTab === CampaignParticipantSource.GROUP
        ? t("groups")
        : t("campaigns");

  // No `overflow-hidden` on the root: the two panels carry their hairline as a
  // `ring`, which is painted outside the border box, so clipping at this level
  // shaved the outer edge off both cards and left them looking half-bordered.
  // The panels clip their own contents, and `min-h-0` is what contains them.
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {tab === undefined ? (
        <div className="flex justify-end">
          <AudienceTabs value={selectedTab} onChange={setSelectedTab} />
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-5">
        {/* ── Available ──────────────────────────────────────────────────── */}
        <div className="bg-card ring-foreground/10 flex min-h-0 flex-col overflow-hidden rounded-xl shadow-xs ring-1">
          <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3.5">
            <span className="font-display text-sm font-semibold">
              {t("Available")}
              {""}
              <span className="text-muted-foreground/70 font-medium tabular-nums">
                · {totalAvailable.toLocaleString()}
              </span>
            </span>
            <div className="relative w-60">
              <IconSearch
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id={`${uid}-search`}
                type="search"
                aria-label={t("Search {type}...", { type: tabLabel })}
                placeholder={t("Search {type}...", { type: tabLabel })}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-8 pl-8 text-[13px]"
              />
            </div>
          </div>

          {selectedTab !== CampaignParticipantSource.CAMPAIGN ? (
            <div className="border-border border-b px-4 py-2">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[12.5px]"
                  aria-expanded={showFilters}
                  onClick={() => setShowFilters((open) => !open)}
                >
                  <IconFilter className="size-3.5" aria-hidden />
                  {t("Filters")}
                  {listFilters.filters.length > 0 ? (
                    <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[11px] tabular-nums">
                      {listFilters.filters.length}
                    </span>
                  ) : null}
                </Button>
                {listFilters.filters.length > 0 ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-[12.5px]"
                    onClick={listFilters.clear}
                  >
                    {tc("Clear filters")}
                  </Button>
                ) : null}
              </div>
              {showFilters ? (
                <ContactListFilters controls={listFilters.controls} className="pt-2" />
              ) : null}
            </div>
          ) : null}

          <div className="border-border/60 bg-muted flex items-center justify-between gap-3 border-b px-4 py-2">
            <Field orientation="horizontal">
              <Checkbox
                id={`${uid}-select-all`}
                checked={isSelectedAll}
                disabled={disableSelectAllIndividual}
                onCheckedChange={handleSelectAll}
              />
              <FieldLabel
                htmlFor={`${uid}-select-all`}
                className="cursor-pointer text-[12.5px] font-normal"
              >
                {t("Select all on this page")}
              </FieldLabel>
            </Field>
            {selectedTab === CampaignParticipantSource.CAMPAIGN ? (
              <div className="flex items-center gap-2">
                <FieldLabel htmlFor={`${uid}-status`} className="text-[12px] font-normal">
                  {t("Message Status")}
                </FieldLabel>
                <Select
                  value={selectedStatus[0] || ""}
                  onValueChange={(value) => setSelectedStatus([value ?? ""])}
                  items={Object.values(CampaignParticipantAddStatus).map((status) => ({
                    value: status,
                    label: status,
                  }))}
                >
                  <SelectTrigger id={`${uid}-status`} size="sm" className="h-7 w-40">
                    <SelectValue placeholder={t("Pick status")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CampaignParticipantAddStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : selectedTab === CampaignParticipantSource.INDIVIDUAL &&
              isNarrowed &&
              totalAvailable > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[12.5px]"
                loading={addCampaignParticipants.isPending}
                onClick={() => void addAllMatching()}
              >
                {tc("{count, plural, one {Add # matching contact} other {Add all # matching}}", {
                  count: totalAvailable,
                })}
              </Button>
            ) : (
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <IconListSearch className="size-3.5" aria-hidden />
                {t("WhatsApp contacts only")}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
              </div>
            ) : (
              <>
                {selectedTab === CampaignParticipantSource.INDIVIDUAL &&
                  (filteredContacts?.length ? (
                    filteredContacts.map((contact) => {
                      // The row this contact already has on *this* campaign, which
                      // is what unticking it deletes.
                      const enrolledOn = contact?.campaignParticipants?.find(
                        (c: { id?: string; campaignId?: string }) => c?.campaignId === campaign?.id,
                      );
                      return (
                        <Individual
                          key={contact?.id}
                          customer={contact}
                          selectedContacts={selectedContacts}
                          setSelectedContacts={setSelectedContacts}
                          isAlreadySelected={Boolean(enrolledOn)}
                          enrolledParticipantId={enrolledOn?.id}
                          onRemoveEnrolled={(participantId) =>
                            removeParticipant.mutate({ participantId, campaignId: campaign.id })
                          }
                          isRemoving={removeParticipant.isPending}
                        />
                      );
                    })
                  ) : (
                    <EmptyRow label={t("No contacts found")} />
                  ))}

                {selectedTab === CampaignParticipantSource.GROUP &&
                  (filteredGroups?.length ? (
                    filteredGroups.map((group) => (
                      <CustomerGroup
                        matchCount={groupReach(group)}
                        key={group?.id}
                        group={group}
                        selectedGroups={selectedGroups}
                        setSelectedGroups={setSelectedGroups}
                      />
                    ))
                  ) : (
                    <EmptyRow label={t("No groups found")} />
                  ))}

                {selectedTab === CampaignParticipantSource.CAMPAIGN &&
                  (filteredCampaigns?.length ? (
                    filteredCampaigns.map((c: Campaign) => (
                      <CustomerCampaign
                        key={c?.id}
                        campaign={c}
                        selectedCampaigns={selectedCampaigns}
                        setSelectedCampaigns={setSelectedCampaigns}
                      />
                    ))
                  ) : (
                    <EmptyRow label={t("No campaigns found")} />
                  ))}
              </>
            )}
          </div>

          {selectedTab === CampaignParticipantSource.INDIVIDUAL ? (
            <div className="border-border text-muted-foreground flex items-center justify-between border-t px-4 py-2.5 text-[12.5px]">
              <span className="tabular-nums">
                {t("{from}–{to} of {total}", {
                  from: pageStart,
                  to: Math.max(pageEnd, 0),
                  total: totalAvailable.toLocaleString(),
                })}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.pageIndex === 0}
                  onClick={() =>
                    setPagination((p) => ({ ...p, pageIndex: Math.max(p.pageIndex - 1, 0) }))
                  }
                >
                  <IconChevronLeft className="size-4" aria-hidden />
                  {t("Prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageEnd >= totalAvailable}
                  onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                >
                  {t("Next")}
                  <IconChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Selected ───────────────────────────────────────────────────── */}
        <div className="bg-card ring-foreground/10 flex min-h-0 flex-col overflow-hidden rounded-xl shadow-xs ring-1">
          <div className="border-border flex h-15 shrink-0 items-center justify-between gap-3 border-b px-4">
            <span className="font-display text-sm font-semibold">
              {t("Selected")}
              {""}
              {/* Enrolled plus picked: the audience the campaign will have. Counting
                  only the unsaved picks meant the panel read "· 0" the moment a
                  selection was written, with the recipients listed right below it. */}
              <span className="text-muted-foreground/70 font-medium tabular-nums">
                · {audienceTotal}
              </span>
            </span>
            {audienceTotal > 0 ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                loading={clearParticipants.isPending}
                onClick={() => void clearAll()}
              >
                {t("Clear all")}
              </Button>
            ) : null}
          </div>

          {audienceTotal === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="bg-accent text-primary border-primary/20 flex size-10 items-center justify-center rounded-[10px] border">
                <IconUsers className="size-5" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-display text-[15px] font-semibold">
                  {t("No recipients yet")}
                </span>
                <span className="text-muted-foreground max-w-75 text-[13px] leading-relaxed">
                  {t(
                    "Tick contacts on the left or pick a group. You can also save this draft and add recipients later.",
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
              {/* Already on the campaign, and removable from here. Listed first
                  because it is the campaign as it stands; everything below it is
                  a change that has not been written yet. */}
              <SelectedGroup
                label={t("Already added · {count}", { count: enrolledTotal })}
                hidden={enrolledTotal === 0}
              >
                {enrolled.map((participant) => (
                  <SelectedChip
                    key={participant.id}
                    tone="plain"
                    label={
                      participant.contact?.name ||
                      participant.contact?.phone ||
                      t("Unnamed contact")
                    }
                    contactName={participant.contact?.name || participant.contact?.phone || null}
                    disabled={removeParticipant.isPending}
                    onRemove={() =>
                      removeParticipant.mutate({
                        participantId: participant.id,
                        campaignId: campaign.id,
                      })
                    }
                  />
                ))}
                {enrolledTotal > enrolled.length ? (
                  <span className="text-muted-foreground self-center text-[12.5px]">
                    {t("+{count} more", { count: enrolledTotal - enrolled.length })}
                  </span>
                ) : null}
              </SelectedGroup>

              <SelectedGroup
                label={t("Groups · {count}", { count: selectedGroups.length })}
                hidden={selectedGroups.length === 0}
              >
                {selectedGroups.map((group) => (
                  <SelectedChip
                    key={group.id}
                    tone="accent"
                    label={group.name}
                    meta={groupReach(group) ?? group?._count?.contacts}
                    onRemove={() =>
                      setSelectedGroups((prev) => prev.filter((g) => g.id !== group.id))
                    }
                  />
                ))}
              </SelectedGroup>

              <SelectedGroup
                label={t("Campaigns · {count}", { count: selectedCampaigns.length })}
                hidden={selectedCampaigns.length === 0}
              >
                {selectedCampaigns.map((c) => (
                  <SelectedChip
                    key={c.id}
                    tone="accent"
                    label={c.name}
                    meta={c.campaignParticipantsCount}
                    onRemove={() =>
                      setSelectedCampaigns((prev) => prev.filter((x) => x.id !== c.id))
                    }
                  />
                ))}
              </SelectedGroup>

              <SelectedGroup
                label={t("Individual contacts · {count}", { count: selectedContacts.length })}
                hidden={selectedContacts.length === 0}
              >
                {selectedContacts.map((contact) => (
                  <SelectedChip
                    key={contact.id}
                    tone="plain"
                    label={contact.name || contact.phone || ""}
                    contactName={contact.name || contact.phone || null}
                    onRemove={() =>
                      setSelectedContacts((prev) => prev.filter((c) => c.id !== contact.id))
                    }
                  />
                ))}
              </SelectedGroup>

              {/* About the picks waiting to be written, so it stays out of the way
                  when the panel is only showing who is already on the campaign. */}
              {selectedCount > 0 ? (
                <div className="bg-muted text-secondary-foreground mt-auto flex justify-between rounded-lg px-3.5 py-3 text-[12.5px]">
                  <span>
                    {t("Groups and campaigns are added as individual recipients when saved")}
                  </span>
                  <span className="text-foreground font-semibold tabular-nums">
                    {t("{count} selected", { count: selectedCount })}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {footer?.({
        submit: handleSubmit,
        selectedCount,
        isPending: addCampaignParticipants.isPending,
        canSubmit,
      })}
    </div>
  );
}

/** The picker's three sources. Exported so a caller can place them itself. */
export function AudienceTabs({
  value,
  onChange,
}: Readonly<{
  value: CampaignParticipantSource;
  onChange: (tab: CampaignParticipantSource) => void;
}>) {
  const { t } = useTranslation("campaign.addParticipants");
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as CampaignParticipantSource)}>
      <TabsList>
        <TabsTrigger value={CampaignParticipantSource.INDIVIDUAL}>
          <IconUsers className="size-4" aria-hidden />
          {t("Individual")}
        </TabsTrigger>
        <TabsTrigger value={CampaignParticipantSource.GROUP}>
          <IconFolderOpen className="size-4" aria-hidden />
          {t("Group")}
        </TabsTrigger>
        <TabsTrigger value={CampaignParticipantSource.CAMPAIGN}>
          <IconSend className="size-4" aria-hidden />
          {t("Campaign")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function EmptyRow({ label }: Readonly<{ label: string }>) {
  return <p className="text-muted-foreground py-8 text-center text-[13px]">{label}</p>;
}

function SelectedGroup({
  label,
  hidden,
  children,
}: Readonly<{ label: string; hidden: boolean; children: ReactNode }>) {
  if (hidden) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground/70 text-[11.5px] font-semibold tracking-wider uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function SelectedChip({
  tone,
  label,
  meta,
  contactName,
  onRemove,
  disabled = false,
}: Readonly<{
  tone: "accent" | "plain";
  label: string;
  meta?: number;
  /** Set for a contact chip; a group chip has none and shows the group icon. */
  contactName?: string | null;
  onRemove: () => void;
  disabled?: boolean;
}>) {
  return (
    <span
      className={
        tone === "accent"
          ? "bg-accent text-primary inline-flex h-7.5 items-center gap-1.5 rounded-lg py-0 pr-1.5 pl-2.5 text-[12.5px] font-medium"
          : "bg-muted text-foreground ring-foreground/10 inline-flex h-7.5 items-center gap-1.5 rounded-lg py-0 pr-1.5 pl-1 text-[12.5px] font-medium ring-1"
      }
    >
      {contactName !== undefined ? (
        <ContactAvatar name={contactName} size="2xs" variant="light-blue" />
      ) : (
        <IconUsersGroup className="size-3.5" aria-hidden />
      )}
      <span className="max-w-40 truncate">{label}</span>
      {typeof meta === "number" ? <span className="tabular-nums opacity-70">{meta}</span> : null}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${label}`}
        className="cursor-pointer opacity-60 hover:opacity-100 disabled:cursor-default disabled:opacity-30"
      >
        <IconX className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

interface IndividualProps {
  customer: ContactsData;
  selectedContacts: ContactsData[];
  setSelectedContacts: (contacts: ContactsData[]) => void;
  isAlreadySelected?: boolean;
  /** This contact's participant row on the campaign, when it is already enrolled. */
  enrolledParticipantId?: string;
  /**
   * Takes an enrolled contact back off the campaign. Given only where removal is
   * possible; without it an enrolled row stays ticked and inert, as it was.
   */
  onRemoveEnrolled?: (participantId: string) => void;
  isRemoving?: boolean;
}

/**
 * One selectable contact.
 *
 * A contact already enrolled in this campaign is shown ticked rather than
 * hidden — hiding it would make the list look wrong to anyone who knows the
 * contact is there. Unticking one removes it from the campaign, so the checkbox
 * means the same thing on every row: whether this person is in the audience.
 */
export const Individual = ({
  customer,
  selectedContacts,
  setSelectedContacts,
  isAlreadySelected = false,
  enrolledParticipantId,
  onRemoveEnrolled,
  isRemoving = false,
}: IndividualProps) => {
  const { t } = useTranslation("campaign.addParticipants");
  const isSelected = selectedContacts.some((c) => c?.id === customer?.id);
  const canRemoveEnrolled = Boolean(isAlreadySelected && onRemoveEnrolled && enrolledParticipantId);

  const toggle = () => {
    if (isAlreadySelected) {
      if (canRemoveEnrolled && !isRemoving && enrolledParticipantId) {
        onRemoveEnrolled?.(enrolledParticipantId);
      }
      return;
    }
    setSelectedContacts(
      isSelected
        ? selectedContacts.filter((c) => c?.id !== customer?.id)
        : [...selectedContacts, customer],
    );
  };

  return (
    <div
      className={cn(
        "border-border/60 flex items-center gap-3 border-b px-4 py-2.5",
        isAlreadySelected && !canRemoveEnrolled ? "opacity-55" : "hover:bg-muted cursor-pointer",
        (isSelected || isAlreadySelected) && "bg-accent/60",
      )}
      {...pressable(toggle)}
    >
      <Checkbox
        checked={isSelected || isAlreadySelected}
        disabled={(isAlreadySelected && !canRemoveEnrolled) || isRemoving}
        onCheckedChange={toggle}
        onClick={(event) => event.stopPropagation()}
        aria-label={customer?.name ?? customer?.phone ?? ""}
      />
      <ContactAvatar name={customer?.name || customer?.phone} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-medium">
          {customer?.name || t("Unnamed contact")}
        </span>
        <span className="text-muted-foreground truncate text-xs tabular-nums">
          {customer?.phone}
        </span>
      </div>
      {isAlreadySelected ? (
        <span className="text-muted-foreground/70 shrink-0 text-[11.5px]">
          {canRemoveEnrolled ? t("On this campaign") : t("Added")}
        </span>
      ) : null}
    </div>
  );
};

interface CustomerGroupProps {
  group: ContactGroup;
  selectedGroups: ContactGroup[];
  setSelectedGroups: (groups: ContactGroup[]) => void;
  /** While filters are on: how many of the group's WhatsApp members match them. */
  matchCount?: number;
}

/**
 * A saved contact group. Groups with no reachable members cannot be picked — with filters on,
 * that means no matching members. One already picked can still be unticked.
 */
export const CustomerGroup = ({
  group,
  selectedGroups,
  setSelectedGroups,
  matchCount,
}: CustomerGroupProps) => {
  const { t } = useTranslation("campaign.addParticipants");
  const isSelected = selectedGroups.some((g) => g?.id === group?.id);
  const count = group?._count?.contacts ?? 0;
  const empty = (matchCount ?? count) === 0 && !isSelected;

  const toggle = () => {
    if (empty) return;
    setSelectedGroups(
      isSelected ? selectedGroups.filter((g) => g?.id !== group?.id) : [...selectedGroups, group],
    );
  };

  return (
    <div
      className={cn(
        "border-border/60 flex items-center gap-3 border-b px-4 py-2.5",
        empty ? "opacity-55" : "hover:bg-muted cursor-pointer",
        isSelected && "bg-accent/60",
      )}
      {...pressable(toggle)}
    >
      <Checkbox
        checked={isSelected}
        disabled={empty}
        onCheckedChange={toggle}
        onClick={(event) => event.stopPropagation()}
        aria-label={group?.name}
      />
      <span className="bg-accent text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
        <IconUsersGroup className="size-4" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-medium">{group?.name}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {matchCount === undefined
            ? t("{count} contacts", { count })
            : t("{match} of {count} match", { match: matchCount, count })}
        </span>
      </div>
      {group?.type === ContactGroupType.LOYALTY ? (
        <span className="text-muted-foreground/70 shrink-0 text-[11.5px]">{t("Loyalty")}</span>
      ) : null}
    </div>
  );
};

interface CustomerCampaignProps {
  campaign: Campaign;
  selectedCampaigns: Campaign[];
  setSelectedCampaigns: (campaigns: Campaign[]) => void;
}

/** A past campaign, reused as an audience. */
export const CustomerCampaign = ({
  campaign,
  selectedCampaigns,
  setSelectedCampaigns,
}: CustomerCampaignProps) => {
  const { t } = useTranslation("campaign.addParticipants");
  const isSelected = selectedCampaigns.some((c) => c?.id === campaign?.id);
  const count = campaign?.campaignParticipantsCount ?? 0;
  const empty = count === 0;

  const toggle = () => {
    if (empty) return;
    setSelectedCampaigns(
      isSelected
        ? selectedCampaigns.filter((c) => c?.id !== campaign?.id)
        : [...selectedCampaigns, campaign],
    );
  };

  return (
    <div
      className={cn(
        "border-border/60 flex items-center gap-3 border-b px-4 py-2.5",
        empty ? "opacity-55" : "hover:bg-muted cursor-pointer",
        isSelected && "bg-accent/60",
      )}
      {...pressable(toggle)}
    >
      <Checkbox
        checked={isSelected}
        disabled={empty}
        onCheckedChange={toggle}
        onClick={(event) => event.stopPropagation()}
        aria-label={campaign?.name}
      />
      <span className="bg-accent text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
        <IconSend className="size-4" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-medium">{campaign?.name}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {t("{count} participants", { count })}
        </span>
      </div>
    </div>
  );
};
