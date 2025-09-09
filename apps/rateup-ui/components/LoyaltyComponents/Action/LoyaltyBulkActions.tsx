"use client";

import { useEffect, useState } from "react";

import {
  Button,
  Checkbox,
  Group,
  ScrollAreaAutosize,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDebouncedState, useDisclosure, useListState } from "@mantine/hooks";
import { useTranslations } from "next-intl";

import { ContactGroupType, LoyaltyActionType } from "@/types/enums";
import { SearchInput } from "@/app/dashboard/campaign/page";
import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import {
  useBulkLoyaltyAction,
  useGetLoyaltyActions,
} from "@/backend/loyalty/actions/actions.query";
import { useLoyaltyCustomers } from "@/backend/loyalty/customer/customer.query";
import {
  CustomerGroup,
  Individual,
} from "@/components/Campaign/AddParticipantModal";
import ContactPagination from "@/components/Contacts/ContactPagination";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import SearchBox from "@/components/input/SearchBox";
import RateupLoader from "@/components/Loaders/RateupLoader";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { PAGE_SIZE } from "@/utils/constants";
import { showSuccessToast } from "@/utils/notifications";

enum BulkActionControls {
  CUSTOMERS = "CUSTOMERS",
  GROUPS = "GROUPS",
  ACTIONS = "ACTIONS",
}

const LoyaltyBulkActions = ({ opened, close }) => {
  const [searchText, setSearchText] = useDebouncedState("", 200);
  const [selectedControl, setSelectedControl] = useState(
    BulkActionControls.CUSTOMERS,
  );
  const [selectedCustomers, selectedCustomersHanlder] = useListState([]);
  const [selectedGroups, selectedGroupsHanlder] = useListState([]);
  const [selectedActions, selectedActionsHanlder] = useListState([]);
  const [isAllCustomer, setIsAllCustomer] = useState(false);
  const [isAllGroups, setIsAllGroups] = useState(false);
  const [isAllActions, setIsAllActions] = useState(false);
  const [amount, setAmount] = useState<string | number>("");
  const [dialogMessage, setDialogMessage] = useState(null);
  const translations = useTranslations();
  const [openedFailed, { open: openFailed, close: closeFailed }] =
    useDisclosure(false);

  const bulkActionMut = useBulkLoyaltyAction();

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });

  const { isLoading: isLoadingCustomers, data: customersData } =
    useLoyaltyCustomers(pagination, searchText);
  const customers = customersData ? customersData.customers : null;
  const { isLoading: isLoadingContactgroup, data: customerGroups } =
    useContactGroup(ContactGroupType.LOYALTY);

  const { isLoading: isLoadingActions, data: loyaltyActions } =
    useGetLoyaltyActions();

  const filteredCustomers = customers
    ? searchText
      ? customers.filter((c) => c.name.includes(searchText))
      : customers
    : [];
  const filteredGroups = customerGroups
    ? searchText
      ? customerGroups.filter((g) => g.name.includes(searchText))
      : customerGroups
    : [];
  const allActions = loyaltyActions
    ? loyaltyActions.filter((a) => a.type != LoyaltyActionType.ReferralPurchase)
    : [];
  const filteredActions = searchText
    ? allActions.filter((a) => a.name.includes(searchText))
    : allActions;

  let totalPageCount = (customers?.[0]?.totalCount ?? 1) / pagination.pageSize;

  const handleSubmit = () => {
    const customerIds = selectedCustomers.map((c) => c.id);
    const groupIds = selectedGroups.map((g) => g.id);
    const actionIds = selectedActions.map((a) => a.id);
    const data = {
      customerIds,
      groupIds,
      actionIds,
      isAllCustomer,
      isAllGroups,
      isAllActions,
      amount: Number(amount),
    };
    bulkActionMut.mutate(data, {
      onSuccess: (res: any) => {
        if (res?.data?.failed?.length) {
          const MessageComp = `
                    <div>
                        <p>Failed Actions on following customer:</p>
                        <br/>
                        ${res?.data?.failed?.map(
                          (f) =>
                            `<p key=${f.phone}>${f.phone}: ${f.message}</p>`,
                        )}
                    </div>`;
          setDialogMessage(MessageComp);
          openFailed();
        } else {
          showSuccessToast("Bulk actions successfull");
          onClose();
        }
      },
    });
  };

  const handleSelectAll = (checked) => {
    switch (selectedControl) {
      case BulkActionControls.CUSTOMERS:
        setIsAllCustomer(checked);
        selectedCustomersHanlder.setState([]);
        break;
      case BulkActionControls.GROUPS:
        setIsAllGroups(checked);
        selectedGroupsHanlder.setState([]);
        break;
      case BulkActionControls.ACTIONS:
        setIsAllActions(checked);
        selectedActionsHanlder.setState([]);
        break;
    }
  };

  function onClose() {
    selectedActionsHanlder.setState([]);
    selectedGroupsHanlder.setState([]);
    selectedCustomersHanlder.setState([]);
    setIsAllActions(false);
    setIsAllCustomer(false);
    setIsAllGroups(false);
    setDialogMessage(null);
    close();
  }

  return (
    <FormModalLayout
      opened={opened}
      onClose={onClose}
      onSubmit={handleSubmit}
      buttonTitle="Apply"
      includeCancelButton
      cancelOnClick={onClose}
      title={"Bulk Customer Actions"}
      noCustomHeader
      centered
      size="xl"
      isLoading={bulkActionMut.isPending}
    >
      {isLoadingActions || isLoadingCustomers || isLoadingContactgroup ? (
        <RateupLoader />
      ) : (
        <Stack>
          <ContainedNumberInput
            value={amount}
            onChange={setAmount}
            label={"Enter amount"}
            placeholder="Eg: 1000"
            w={"50%"}
          />
          <Group justify="space-between" w={"100%"}>
            <SearchInput
              searchText={searchText}
              setSearchText={setSearchText}
              placeholder="search"
              width={300}
            />
            <SegmentedControl
              data={Object.values(BulkActionControls)}
              value={selectedControl}
              onChange={(value) =>
                setSelectedControl(value as BulkActionControls)
              }
              radius={"md"}
            />
          </Group>
          <SimpleGrid cols={2}>
            <PaperLayout>
              <Checkbox
                label={translations("Select All")}
                checked={
                  selectedControl === BulkActionControls.CUSTOMERS
                    ? isAllCustomer
                    : selectedControl === BulkActionControls.GROUPS
                      ? isAllGroups
                      : isAllActions
                }
                onChange={(e) => handleSelectAll(e.currentTarget.checked)}
              />
              <ScrollAreaAutosize h={350}>
                {selectedControl === BulkActionControls.CUSTOMERS ? (
                  filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <Individual
                        customer={c}
                        selectedContacts={selectedCustomers}
                        selectedContactsHandlers={selectedCustomersHanlder}
                        key={c.id}
                        isAlreadySelected={isAllCustomer}
                      />
                    ))
                  ) : (
                    <Text>{translations("No customer found")}</Text>
                  )
                ) : selectedControl === BulkActionControls.GROUPS ? (
                  filteredGroups.length > 0 ? (
                    filteredGroups.map((g) => (
                      <CustomerGroup
                        group={g}
                        selectedGroups={selectedGroups}
                        selectedGroupsHandlers={selectedGroupsHanlder}
                        isAlreadySelected={isAllGroups}
                        key={g.id}
                      />
                    ))
                  ) : (
                    <Text>{translations("No group found")}</Text>
                  )
                ) : filteredActions.length > 0 ? (
                  filteredActions.map((a) => (
                    <LoyaltyAction
                      action={a}
                      selectedActions={selectedActions}
                      selectedActionsHandler={selectedActionsHanlder}
                      isAlreadySelected={isAllActions}
                      key={a.id}
                    />
                  ))
                ) : (
                  <Text>{translations("No action found")}</Text>
                )}
              </ScrollAreaAutosize>
              {selectedControl === BulkActionControls.CUSTOMERS &&
                filteredCustomers?.length > 0 && (
                  <ContactPagination
                    pagination={pagination}
                    setPagination={setPagination}
                    totalPageCount={totalPageCount}
                  />
                )}
            </PaperLayout>
            <PaperLayout>
              <ScrollAreaAutosize h={350}>
                {selectedControl === BulkActionControls.CUSTOMERS
                  ? selectedCustomers.map((c) => (
                      <Individual
                        customer={c}
                        selectedContacts={selectedCustomers}
                        selectedContactsHandlers={selectedCustomersHanlder}
                        key={c.id}
                      />
                    ))
                  : selectedControl === BulkActionControls.GROUPS
                    ? selectedGroups.map((g) => (
                        <CustomerGroup
                          group={g}
                          selectedGroups={selectedGroups}
                          selectedGroupsHandlers={selectedGroupsHanlder}
                          key={g.id}
                        />
                      ))
                    : selectedActions.map((a) => (
                        <LoyaltyAction
                          action={a}
                          selectedActions={selectedActions}
                          selectedActionsHandler={selectedActionsHanlder}
                          key={a.id}
                        />
                      ))}
              </ScrollAreaAutosize>
            </PaperLayout>
          </SimpleGrid>
          <ConfirmationModal
            opened={openedFailed}
            onClose={closeFailed}
            headerLabel={dialogMessage}
            headerTitle="Result"
            onConfirm={closeFailed}
            excludeCancelButton
            confirmLabel="ok"
          />
        </Stack>
      )}
    </FormModalLayout>
  );
};

export default LoyaltyBulkActions;

const LoyaltyAction = ({
  action,
  selectedActions,
  selectedActionsHandler,
  isAlreadySelected = false,
}) => {
  const translations = useTranslations();
  const isSelected = selectedActions.some((c) => c?.id === action?.id);

  return (
    <Group justify="space-between" my={"xs"}>
      <Stack gap={0}>
        <Title order={5} lineClamp={1} maw={190}>
          {action?.name}
        </Title>
        <Text c={"dimmed"} size="sm">
          {action?.type}
        </Text>
      </Stack>
      {isSelected ? (
        <Button
          variant="outline"
          onClick={() =>
            selectedActionsHandler.filter((c) => c?.id !== action?.id)
          }
          radius={"xl"}
          size="sm"
        >
          {translations("Remove")}
        </Button>
      ) : (
        <Button
          onClick={() => selectedActionsHandler.append(action)}
          radius={"xl"}
          size="sm"
          w={90}
          disabled={isAlreadySelected}
        >
          {isAlreadySelected ? translations("Added") : translations("Add")}
        </Button>
      )}
    </Group>
  );
};
