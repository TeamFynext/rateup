import {
  Button,
  Center,
  Flex,
  MantineProvider,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { IconRefresh, IconSearch } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import {
  useCampaignData,
  useCampaignDataByTeam,
} from "../../../backend/campaign/campaign.query";
import CreateCampaignModal from "../../../components/Campaign/CreateCampaignModal";
import { contactParticipentColumn } from "../../../components/Contacts/utils/utils";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import TanstackTable from "../../../components/Table/TanstackTable";
import { TeamSelector } from "../../../components/input/TeamSelector";
import Heading from "../../../components/styled/Heading/Heading";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { whatsappTheme } from "../../../config/mantineTheme";
import styles from "./campaign.module.css";

export default function CampaignList() {
  const [searchText, setSearchText] = useDebouncedState("", 200);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const enabled = !!selectedTeam && selectedTeam != "all";
  const {
    data: campaignDataByTeam,
    isPending,
    isError,
    refetch,
  } = useCampaignDataByTeam(selectedTeam, enabled);

  const {
    data: campaignData,
    isPending: isAllCampaignLoading,
    isError: isAllCampaignError,
  } = useCampaignData();

  const filteredCampaignsdata =
    selectedTeam == "all" || !selectedTeam // filtering by team
      ? campaignData?.data
      : campaignDataByTeam?.data ?? [];
  const filteredCampaigns = (
    searchText
      ? filteredCampaignsdata.filter(
          // filtering by search text
          (campaign) =>
            campaign?.name.toLowerCase().includes(searchText.toLowerCase()),
        )
      : filteredCampaignsdata
  )?.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)); // sorting by date

  if (isPending && isAllCampaignLoading) return <RateupLoader h={"90dvh"} />;

  const column: ColumnDef<any>[] = contactParticipentColumn;

  return (
    <MantineProvider theme={whatsappTheme}>
      <Stack gap={"sm"} h={"100%"}>
        <Flex justify={"space-between"}>
          <Heading title="Campaigns" titleprops={{ w: "fit-content" }} />
          <SearchInput
            placeholder={"Search Campaign"}
            searchText={searchText}
            setSearchText={setSearchText}
          />
          <TeamSelector
            value={selectedTeam}
            onChange={setSelectedTeam}
            enableAll={true}
          />
        </Flex>
        <Center>
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

        <PaperLayout p={0} h={"100%"} mah={"800px"}>
          <TanstackTable
            columns={column}
            data={filteredCampaigns}
            btnTitle="Create"
            toggle={open}
            disableFuzzyFnCustom={true}
            topHeight={280}
          />
        </PaperLayout>
        <Modal
          opened={opened}
          onClose={close}
          centered
          size={"lg"}
          radius={"lg"}
        >
          <CreateCampaignModal close={close} isEdit={false} />
        </Modal>
      </Stack>
    </MantineProvider>
  );
}

export const SearchInput = ({
  placeholder,
  searchText,
  setSearchText,
  width = 500,
  size = "md",
}) => {
  return (
    <TextInput
      defaultValue={searchText}
      onChange={(e) => setSearchText(e.currentTarget.value)}
      size={size}
      radius={"xl"}
      w={width}
      placeholder={placeholder}
      leftSection={<IconSearch size={"1rem"} />}
      classNames={{ input: styles.input }}
    />
  );
};
