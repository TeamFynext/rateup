import { useDisclosure } from "@mantine/hooks";
import classes from "./styles.module.css";
import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Loader,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconAlertTriangle, IconPlus } from "@tabler/icons-react";
import SimpleModalLayout from "../../../../Modal/SimpleModalLayout";
import { useContactsNotInWaContact } from "../../../../../backend/campaign/contacts/contacts.query";
import { useState } from "react";
import NothingFound from "../../../../NothingFound/NothingFound";
import { useAddMultipleWaContacts } from "../../../../../backend/whatsapp/inbox/contact/wacontact.query";

export default function AddWaContactModal() {
  const [opened, { open, close: onClose }] = useDisclosure(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const { data, isLoading, error } = useContactsNotInWaContact(opened);
  const addWaContact = useAddMultipleWaContacts();
  function addWaContacts() {
    addWaContact.mutate({ contactIds: selectedRows });
  }
  if (isLoading) return <Loader />;
  if (error) return <div>Error: {error.message}</div>;
  const contactsWithPhoneNumber = data?.filter(
    (contact) => contact.phone,
  ).length;
  return (
    <>
      <SimpleModalLayout
        opened={opened}
        onClose={onClose}
        title="Add Whatsapp Contacts"
        size="xl"
      >
        {data && data?.length > 0 ? (
          <Stack>
            <Table withColumnBorders withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Td>
                    <Checkbox
                      disabled={contactsWithPhoneNumber !== data?.length}
                      checked={selectedRows.length === data?.length}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedRows(data.map((contact) => contact.id));
                        } else {
                          setSelectedRows([]);
                        }
                      }}
                    />
                  </Table.Td>
                  <Table.Td>Name</Table.Td>
                  <Table.Td>Phone</Table.Td>
                  <Table.Td>Email</Table.Td>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data?.map((contact) => (
                  <Table.Tr key={contact.id}>
                    <Table.Td>
                      <Checkbox
                        checked={selectedRows?.includes(contact.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedRows([...selectedRows, contact.id]);
                          } else {
                            setSelectedRows(
                              selectedRows?.filter((id) => id !== contact.id),
                            );
                          }
                        }}
                      />
                    </Table.Td>
                    <Table.Td>{contact.name}</Table.Td>
                    <Table.Td>{contact.phone}</Table.Td>
                    <Table.Td>{contact.email}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Group>
              <Group>
                <IconAlertTriangle
                  color="#eed202"
                  className={classes.alert_icon}
                />
                <Text className={classes.alert_text}>
                  Contacts must have a phone number to be added to the inbox.
                </Text>
              </Group>
              <Button
                className={classes.add_button}
                disabled={selectedRows.length === 0}
                onClick={addWaContacts}
              >
                Add
              </Button>
            </Group>
          </Stack>
        ) : (
          <NothingFound text="No Contacts here" />
        )}
      </SimpleModalLayout>
      <ActionIcon className={classes.modal_target} size={"xl"} onClick={open}>
        <IconPlus />
      </ActionIcon>
    </>
  );
}
