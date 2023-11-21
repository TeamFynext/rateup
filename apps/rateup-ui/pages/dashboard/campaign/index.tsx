import {
  Button,
  Flex,
  Group,
  Loader,
  MantineProvider,
  Modal,
  SimpleGrid,
  Stack,
  TextInput,
  Title,
  Text,
  Center,
} from "@mantine/core";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { useEffect, useState } from "react";
import { IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react";
import styles from "./campaign.module.css";
import CampaignCard from "../../../components/Card/CampaignCard";
import { useDisclosure } from "@mantine/hooks";
import CreateCampaignModal from "./CreateCampaignModal";
import {
  useCampaignData,
  useCampaignDataByTeam,
} from "../../../backend/campaign/campaign.query";
import { whatsappTheme } from "../../../config/mantineTheme";
import Heading from "../../../components/styled/Heading/Heading";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";

export default function () {
  const [searchText, setSearchText] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const {
    data: campaignDataByTeam,
    isLoading,
    isError,
    refetch,
  } = useCampaignDataByTeam(selectedTeam);

  const filteredCampaigns = searchText
    ? campaignDataByTeam?.data?.filter(
        (campaign) =>
          campaign?.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : campaignDataByTeam?.data;

  return (
    <>
      <MantineProvider theme={whatsappTheme}>
        <Stack gap={"lg"}>
          <Flex justify={"space-between"}>
            <Group>
              <Heading title="Campaigns" titleprops={{ w: "fit-content" }} />
              <RateupButtonBlue
                title="Create Campaign"
                rightIcon={<IconPlus />}
                onClick={open}
              />
            </Group>
            <TeamSelector value={selectedTeam} onChange={setSelectedTeam} />
          </Flex>
          <Flex justify={"center"}>
            <SearchInput
              placeholder={"Search Campaign"}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          </Flex>
          <Center>
            {isLoading && <Loader />}
            {isError && (
              <Stack>
                <Text>Something went wrong</Text>
                <Button
                  variant="outline"
                  leftSection={<IconRefresh />}
                  onClick={() => refetch}
                >
                  Retry
                </Button>
              </Stack>
            )}
          </Center>

          {filteredCampaigns?.length > 0 ? (
            <SimpleGrid cols={3} p="xl">
              {filteredCampaigns?.map((campaign) => (
                <CampaignCard campaign={campaign} key={campaign?.id} />
              ))}
            </SimpleGrid>
          ) : (
            <Flex justify={"center"} align={"center"}>
              <Title c="dimmed" order={3}>
                No Campaigns Found
              </Title>
            </Flex>
          )}
          <Modal opened={opened} onClose={close} centered size={"lg"}>
            <CreateCampaignModal close={close} isEdit={false} />
          </Modal>
        </Stack>
      </MantineProvider>
    </>
  );
}

export const SearchInput = ({ placeholder, searchText, setSearchText }) => {
  return (
    <TextInput
      value={searchText}
      onChange={(e) => setSearchText(e.currentTarget.value)}
      size="md"
      radius={"xl"}
      w={500}
      placeholder={placeholder}
      leftSection={<IconSearch size={"1rem"} />}
      classNames={{ input: styles.input }}
    />
  );
};
