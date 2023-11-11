import {
  Stack,
  Paper,
  Box,
  Title,
  SimpleGrid,
  Group,
  Avatar,
  Button,
  Text,
  TextInput,
  Center,
  Loader,
  Container,
  Badge,
} from "@mantine/core";
import ContactCard from "../../../../../components/Card/ContactCard";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../../../components/Button/RateupButtons";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../../../../../components/Modal/FormModalLayout";
import AddCustomerModal from "./AddCustomerModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  useContactGroupById,
  useDeleteGroupMutation,
} from "../../../../../backend/campaign/contactGroup/contactGroup.query";
import { getFileUrlFromKey } from "../../../../../utils/file-upload/upload";
import { modals } from "@mantine/modals";
import { useRouteParams } from "../../../../../context/RouteParamsContext";
import CreateGroupModal from "./CreateGroupModal";
import { useTeamsByUser } from "../../../../../backend/team/team.query";

export default function () {
  const [opened, { open, close }] = useDisclosure(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { groupId } = router.query;
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const { update } = useRouteParams();
  const [filteredCustomerList, setFilteredCustomerList] = useState([]);

  const {
    isLoading: isLoading,
    data: groupDetails,
    error: groupByIderror,
    refetch: refetchgroupById,
  } = useContactGroupById(groupId?.toString()) as {
    isLoading: boolean;
    data: ContactGroupwithContacts;
    error: any;
    refetch: any;
  };

  const deleteGroupMutation = useDeleteGroupMutation(() => {
    router.push("/dashboard/campaign/contacts/");
  });

  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Delete Group",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this group? This action is destructive
          and you will have to contact support to restore your data.
        </Text>
      ),
      labels: { confirm: "Ok", cancel: "cancel" },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () => deleteContactGroup(),
    });
  };
  const deleteContactGroup = () => {
    deleteGroupMutation.mutate(groupId);
  };

  useEffect(() => {
    update({ groupId: groupDetails?.name });
  }, [groupDetails?.name]);

  useEffect(() => {
    if (groupDetails?.contacts && !searchTerm.length) {
      setFilteredCustomerList(groupDetails?.contacts);
    } else {
      if (groupDetails?.contacts) {
        setFilteredCustomerList(
          groupDetails?.contacts?.filter((contact) => {
            return (
              contact?.name
                .toLowerCase()
                .startsWith(searchTerm.toLowerCase()) ||
              contact?.phone?.startsWith(searchTerm)
            );
          }),
        );
      }
    }
  }, [searchTerm, groupDetails?.contacts]);

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsData,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsByUser() as {
    isLoading: boolean;
    error: any;
    data: TeamsResponse;
    refetch: any;
  };

  const teamObj = teamsData?.data?.find((team) => {
    return team?.id === groupDetails?.teamId;
  });

  return (
    <>
      {isLoading ? (
        <Center>
          <Loader></Loader>
        </Center>
      ) : (
        <Box p="lg" pr={150}>
          <Stack>
            <Paper shadow="xl" p="xl" radius={"md"}>
              <Group justify="space-between">
                <Group>
                  <Avatar
                    src={
                      groupDetails?.icon
                        ? getFileUrlFromKey(groupDetails?.icon)
                        : null
                    }
                    size={"xl"}
                  ></Avatar>
                  <Stack>
                    <Title>{groupDetails?.name}</Title>
                    <Group>
                      <Button
                        leftSection={<IconEdit></IconEdit>}
                        onClick={openEditModal}
                        variant="default"
                      >
                        Edit Profile
                      </Button>
                      <FormModalLayout
                        centered
                        title="Edit Group"
                        opened={openedEditModal}
                        onClose={closeEditModal}
                        size="lg"
                      >
                        <CreateGroupModal
                          groupClose={closeEditModal}
                          isEdit={true}
                          groupDetails={groupDetails}
                        ></CreateGroupModal>
                      </FormModalLayout>

                      <Button
                        variant="light"
                        leftSection={<IconTrash></IconTrash>}
                        color="red"
                        onClick={openDeleteModal}
                      >
                        Delete this Group
                      </Button>
                    </Group>
                  </Stack>
                </Group>
                <Group gap={"xl"}>
                  <Badge
                    color="var(--tertiary-color)"
                    variant="outline"
                    size="xl"
                  >
                    {teamObj?.name}
                  </Badge>
                  <Stack gap={0}>
                    <Center>
                      <Title c="var(--tertiary-color)" order={3}>
                        {groupDetails?.contacts?.length}
                      </Title>
                    </Center>

                    <Text>customers</Text>
                  </Stack>
                </Group>
              </Group>
            </Paper>
            <Box py="xl">
              <Center>
                <Group>
                  <TextInput
                    leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
                    radius="xl"
                    size="md"
                    placeholder={"Search Customer"}
                    rightSectionWidth={60}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    w={500}
                  />
                  <RateupButtonSecondary
                    leftIcon={<IconEdit></IconEdit>}
                    title="Edit"
                    radius="xl"
                    size={"md"}
                  ></RateupButtonSecondary>
                  <RateupButtonBlue
                    title="New customer"
                    rightIcon={<IconPlus />}
                    radius="xl"
                    size="lg"
                    onClick={open}
                  ></RateupButtonBlue>
                </Group>
              </Center>
            </Box>
            <Box>
              <Title order={2}>Customer List</Title>
              <SimpleGrid
                mt={"md"}
                cols={{ base: 1, sm: 2, lg: 3 }}
                spacing={{ base: 10, sm: "xl", lg: "xl" }}
                verticalSpacing={{ base: "md", sm: "xl" }}
              >
                {filteredCustomerList?.length > 0 ? (
                  filteredCustomerList?.map((contact) => (
                    <ContactCard
                      contact={contact}
                      key={contact?.id}
                      groupId={groupDetails?.id}
                    ></ContactCard>
                  ))
                ) : (
                  <Container p="xl">
                    <Title order={5}>No Contacts found</Title>
                  </Container>
                )}
              </SimpleGrid>
            </Box>
          </Stack>
          <FormModalLayout
            onClose={close}
            opened={opened}
            title={`Add customer to ${groupDetails?.name}`}
            size="lg"
          >
            <AddCustomerModal
              groupId={groupDetails?.id}
              close={close}
              teamId={groupDetails?.teamId}
            ></AddCustomerModal>
          </FormModalLayout>
        </Box>
      )}
    </>
  );
}
