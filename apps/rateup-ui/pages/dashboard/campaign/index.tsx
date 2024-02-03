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
  Container,
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
import NothingFound from "../../../components/NothingFound/NothingFound";

export default function () {
  const [searchText, setSearchText] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const enabled = !!selectedTeam && selectedTeam != "all";
  const {
    data: campaignDataByTeam,
    isLoading,
    isError,
    refetch,
  } = useCampaignDataByTeam(selectedTeam, enabled);

  const {
    data: campaignData,
    isLoading: isAllCampaignLoading,
    isError: isAllCampaignError,
  } = useCampaignData();

  const filteredCampaignsdata =
    selectedTeam == "all" || !selectedTeam // filtering by team
      ? campaignData?.data
      : campaignDataByTeam?.data;

  const filteredCampaigns = (
    searchText
      ? filteredCampaignsdata.filter(
          // filtering by search text
          (campaign) =>
            campaign?.name.toLowerCase().includes(searchText.toLowerCase()),
        )
      : filteredCampaignsdata
  )?.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)); // sorting by date

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
            <TeamSelector
              value={selectedTeam}
              onChange={setSelectedTeam}
              enableAll={true}
            />
          </Flex>
          <Flex justify={"center"}>
            <SearchInput
              placeholder={"Search Campaign"}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          </Flex>
          <Center>
            {isLoading && isAllCampaignLoading ? <Loader type="bars" /> : <></>}
            {isError && isAllCampaignError ? (
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
            ) : (
              <></>
            )}
          </Center>

          {filteredCampaigns?.length > 0 ? (
            <SimpleGrid cols={3} p="xl">
              {filteredCampaigns?.map((campaign) => (
                <CampaignCard campaign={campaign} key={campaign?.id} />
              ))}
            </SimpleGrid>
          ) : (
            <Container mt={"7%"}>
              <NothingFound text={"No campaigns found"} />
            </Container>
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
