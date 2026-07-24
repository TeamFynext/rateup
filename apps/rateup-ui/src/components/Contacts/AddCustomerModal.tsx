import type { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAddExistingContactMutation,
  useAddNewContactMutation,
  useContactGroup,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import { useDebouncedState } from "@/hooks/use-debounced-state.ts";
import { FilterSelect } from "@/routes/dashboard/contacts/index.tsx";
import { ContactGroupType } from "@/types/enums.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";
import { contactAddType } from "@/utils/enums/index.ts";

import RateupLoader from "../Loaders/RateupLoader.tsx";
import { Button } from "../ui/button.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { Field, FieldLabel, FieldLegend, FieldSet } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Spinner } from "../ui/spinner.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.tsx";
import ContactPagination from "./ContactPagination.tsx";
import CreateContactModal from "./CreateContactModal.tsx";

const AddCustomerModal = ({
  groupId,
  close,
  existingContactIds,
  createNewContactsFromCSV,
  type = ContactGroupType.NORMAL,
}) => {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [isCreating, setIsCreating] = useState(false);
  const [addType, setAddType] = useState(contactAddType.NEW);
  const [customerList, setCustomerList] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useDebouncedState<ColumnFiltersState>([], 200);
  const addExistingContactsMutation = useAddExistingContactMutation(groupId);
  const createNewContactMutation = useAddNewContactMutation(groupId);

  const { t: translations } = useTranslation();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const { isPending, data, refetch } = useContacts(
    pagination,
    searchTerm,
    null,
    columnFilters,
    type,
  );
  const { data: contactGroupData } = useContactGroup();
  const contactData = data?.users;

  const allContactIds = contactData?.map((customer) => customer?.id);
  const remainingContactIds = allContactIds?.filter((c) => !existingContactIds?.includes(c));

  const handleAddExistingContacts = async () => {
    setIsCreating(true);
    addExistingContactsMutation.mutate(
      {
        customerList: customerList,
        groupId: groupId,
      },
      {
        onSuccess: () => {
          setCustomerList([]);
          setIsCreating(false);
          close();
        },
        onError: () => {
          setCustomerList([]);
          setIsCreating(false);
          close();
        },
      },
    );
  };

  const rows = contactData?.map((contact) => {
    if (type === ContactGroupType.LOYALTY) {
      return (
        <TableRow
          key={contact?.loyaltyCustomer?.id}
          className={customerList.includes(contact?.loyaltyCustomer?.id) ? "bg-accent" : undefined}
        >
          <TableCell>
            <Checkbox
              aria-label={translations("Select row")}
              checked={
                customerList?.includes(contact?.loyaltyCustomer?.id) ||
                existingContactIds?.includes(contact?.loyaltyCustomer?.id)
              }
              disabled={existingContactIds?.includes(contact?.loyaltyCustomer?.id)}
              onCheckedChange={(checked) =>
                setCustomerList(
                  checked
                    ? [...customerList, contact?.loyaltyCustomer?.id]
                    : customerList.filter((id) => id !== contact?.loyaltyCustomer?.id),
                )
              }
            />
          </TableCell>
          <TableCell>{contact?.name}</TableCell>
          <TableCell>{contact?.phone}</TableCell>
          {type === ContactGroupType.LOYALTY && (
            <>
              <TableCell>{contact?.email}</TableCell>
              <TableCell>{contact?.dob && dayjs(contact?.dob)?.format("DD/MM/YYYY")}</TableCell>
            </>
          )}
        </TableRow>
      );
    } else {
      return (
        <TableRow
          key={contact?.id}
          className={customerList.includes(contact?.id) ? "bg-accent" : undefined}
        >
          <TableCell>
            <Checkbox
              aria-label={translations("Select row")}
              checked={
                customerList?.includes(contact?.id) || existingContactIds?.includes(contact?.id)
              }
              disabled={existingContactIds?.includes(contact?.id)}
              onCheckedChange={(checked) =>
                setCustomerList(
                  checked
                    ? [...customerList, contact?.id]
                    : customerList.filter((id) => id !== contact?.loyaltyCustomer?.id),
                )
              }
            />
          </TableCell>
          <TableCell>{contact?.name}</TableCell>
          <TableCell>{contact?.phone}</TableCell>
        </TableRow>
      );
    }
  });

  if (isPending) return <RateupLoader />;
  const totalPageCount = (data?.totalCount ?? 1) / pagination.pageSize;

  return (
    <FieldSet>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <FieldLegend variant="label">{translations("Choose")}</FieldLegend>
          <RadioGroup
            value={addType}
            onValueChange={(value) => setAddType(value)}
            className="flex flex-row items-center gap-4"
          >
            <Field orientation="horizontal">
              <RadioGroupItem id="add-type-new" value={contactAddType.NEW} />
              <FieldLabel htmlFor="add-type-new" className="font-normal">
                {translations("Add New Contact")}
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value={contactAddType.EXISTING} id="add-type-existing" />
              <FieldLabel htmlFor="add-type-existing" className="font-normal">
                {translations("Add Existing Contacts")}
              </FieldLabel>
            </Field>
          </RadioGroup>
        </div>

        {addType == contactAddType.NEW ? (
          <CreateContactModal
            close={close}
            type={type}
            contactClose={close}
            importCSVContactMutation={createNewContactsFromCSV}
            createNewContactMutation={createNewContactMutation}
          />
        ) : (
          <div className="flex flex-col justify-center gap-4">
            <FilterSelect
              contactArray={contactGroupData?.map((data) => ({
                value: data?.id,
                label: data?.name,
              }))}
              setFilterByTag={setColumnFilters}
              filterByTag={columnFilters}
            />
            <div className="flex items-center justify-between gap-2 px-4">
              <Field orientation="horizontal">
                <Checkbox
                  id="select-all-contacts"
                  aria-label="select all"
                  checked={remainingContactIds?.every((id) => customerList.includes(id))}
                  onCheckedChange={(checked) => {
                    setCustomerList(checked ? remainingContactIds : []);
                  }}
                  disabled={contactGroupData.every((customer) =>
                    existingContactIds.includes(customer?.id),
                  )}
                />
                <FieldLabel htmlFor="select-all-contacts" className="font-normal">
                  {translations("Select All")}
                </FieldLabel>
              </Field>
              <div className="relative w-75">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <FieldLabel htmlFor="add-customer-search" className="sr-only">
                  {translations("Search Contact")}
                </FieldLabel>
                <Input
                  id="add-customer-search"
                  type="search"
                  className="rounded-full pl-9"
                  placeholder={translations("Search Contact")}
                  defaultValue={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                />
              </div>
            </div>
            <div className="w-full overflow-auto rounded-lg bg-card p-4 shadow-md">
              <ScrollArea className="h-50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  refetch();
                                }}
                              />
                            }
                          >
                            <RefreshCw />
                          </TooltipTrigger>
                          <TooltipContent>{translations("refresh data")}</TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead>{translations("Name")}</TableHead>
                      <TableHead>{translations("Phone Number")}</TableHead>
                      {type === ContactGroupType.LOYALTY && (
                        <>
                          <TableHead>{translations("Email")}</TableHead>
                          <TableHead>{translations("Date of Birth")}</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>{rows}</TableBody>
                </Table>
              </ScrollArea>
              <ContactPagination
                pagination={pagination}
                setPagination={setPagination}
                totalPageCount={totalPageCount}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                {translations("cancel")}
              </Button>
              <Button onClick={handleAddExistingContacts} disabled={isCreating}>
                {isCreating && <Spinner />}
                {translations("Add Member")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </FieldSet>
  );
};

export default AddCustomerModal;
