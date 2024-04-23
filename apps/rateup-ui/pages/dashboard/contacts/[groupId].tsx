import {
  Stack,
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
  Badge,
} from "@mantine/core";
import {
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import AddCustomerModal from "../../../components/Contacts/AddCustomerModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  useContactGroupById,
  useDeleteGroupMutation,
} from "../../../backend/campaign/contactGroup/contactGroup.query";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { modals } from "@mantine/modals";
import { useRouteParams } from "../../../context/RouteParamsContext";
import CreateGroupModal from "../../../components/Contacts/CreateGroupModal";
import { useTeamsByUser } from "../../../backend/team/team.query";
import GroupParticipant from "../../../components/Contacts/GroupParticipant";
import RemovePartcipantModal from "../../../components/Contacts/RemovePartcipantModal";
import NothingFound from "../../../components/NothingFound/NothingFound";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { useGetContactTags } from "../../../backend/whatsapp/settings/waSettings.query";

export default function ContactGroup() {
  const [opened, { open, close }] = useDisclosure(false);
  const [
    openedEditCustomer,
    { open: openEditCustomer, close: closeEditCustomer },
  ] = useDisclosure(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { groupId } = router.query;
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const { update } = useRouteParams();
  const { isPending, data: cTags } = useGetContactTags();

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

  const deleteGroupMutation = useDeleteGroupMutation();

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
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        router.push("/dashboard/contacts?tab=groups");
      },
    });
  };

  useEffect(() => {
    update({ groupId: groupDetails?.name });
  }, [groupDetails?.name]);

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

  const filteredCustomerList = searchTerm
    ? groupDetails?.contacts?.filter((contact) => {
        return (
          contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact?.phone?.startsWith(searchTerm)
        );
      })
    : groupDetails?.contacts;
  console.log(groupDetails, "gd");

  return (
    <>
      {isLoading || isPending ? (
        <Center>
          <Loader type="bars" />
        </Center>
      ) : (
        <Box p="lg" pr={150}>
          <Stack>
            <PaperLayout p="xl">
              <Group justify="space-between">
                <Group>
                  <Avatar
                    src={
                      groupDetails?.icon &&
                      getFileUrlFromKey(groupDetails?.icon)
                    }
                    alt="profile pic"
                    size={"xl"}
                    radius={"md"}
                  >
                    <IconUsersGroup size={40} />
                  </Avatar>
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
                        />
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

                    <Text>members</Text>
                  </Stack>
                </Group>
              </Group>
            </PaperLayout>
            <Box py="xl">
              <Center>
                <Group>
                  <TextInput
                    leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
                    radius="xl"
                    size="md"
                    placeholder={"Search member"}
                    rightSectionWidth={60}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    w={500}
                  />
                  <RateupButtonSecondary
                    title="Edit"
                    leftIcon={<IconEdit />}
                    radius={"xl"}
                    size="md"
                    onClick={openEditCustomer}
                  />
                  <RateupButtonBlue
                    title="Add member"
                    rightIcon={<IconPlus />}
                    radius="xl"
                    size="md"
                    onClick={open}
                  ></RateupButtonBlue>
                </Group>
              </Center>
            </Box>
            <Box>
              <Title order={2}>Members</Title>
              <SimpleGrid
                mt={"md"}
                cols={{ base: 1, sm: 2, lg: 3 }}
                spacing={{ base: 10, sm: "xl", lg: "xl" }}
                verticalSpacing={{ base: "md", sm: "xl" }}
              >
                {filteredCustomerList?.length > 0 ? (
                  filteredCustomerList?.map((contact) => (
                    <GroupParticipant
                      contact={contact}
                      key={contact?.id}
                      groupId={groupDetails?.id}
                    />
                  ))
                ) : (
                  <NothingFound text="No members found" />
                )}
              </SimpleGrid>
            </Box>
          </Stack>
          <FormModalLayout
            onClose={close}
            opened={opened}
            title={`Add members`}
            size="xl"
            centered
          >
            <AddCustomerModal
              groupId={groupDetails?.id}
              close={close}
              teamId={groupDetails?.teamId}
              existingContactIds={groupDetails?.contacts?.map((c) => c.id)}
              tags={cTags?.contactTags}
            />
          </FormModalLayout>
          <FormModalLayout
            centered
            onClose={closeEditCustomer}
            title="Remove members"
            size="lg"
            opened={openedEditCustomer}
          >
            <RemovePartcipantModal
              customerList={groupDetails?.contacts}
              groupId={groupDetails?.id}
              close={closeEditCustomer}
            />
          </FormModalLayout>
        </Box>
      )}
    </>
  );
}
