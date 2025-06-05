import { useState } from "react";

import {
  Center,
  Flex,
  MantineProvider,
  Modal,
  Stack,
  TextInput,
} from "@mantine/core";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";

import { whatsappTheme } from "@/config/mantineTheme";
import {
  useCampaignData,
  useCampaignDataByTeam,
} from "@/backend/campaign/campaign.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import UnauthorizedPage from "@/components/404/UnAuthorizedError";
import CreateCampaignModal from "@/components/Campaign/CreateCampaignModal";
import { contactParticipentColumn } from "@/components/Contacts/utils/utils";
import { TeamSelector } from "@/components/input/TeamSelector";
import Heading from "@/components/styled/Heading/Heading";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import TanstackTable from "@/components/Table/TanstackTable";
import useTranslations from "@/dictionaries/useTranslation";

import styles from "./campaign.module.css";

export default function CampaignList() {
  const [searchText, setSearchText] = useDebouncedState("", 200);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const { translations } = useTranslations();

  const {
    data: campaignData,
    isPending: isAllCampaignLoading,
    isError: isAllCampaignError,
    isRefetching: isRefetchingAllCampaign,
    refetch: refetchAllkCampaign,
    error,
  } = useCampaignData();

  const filteredCampaignsdata =
    selectedTeam == "all" || !selectedTeam // filtering by team
      ? campaignData?.data
      : (campaignData?.data?.filter((c) => c?.teamId === selectedTeam) ?? []);
  const filteredCampaigns = (
    searchText
      ? filteredCampaignsdata.filter(
          // filtering by search text
          (campaign) =>
            campaign?.name.toLowerCase().includes(searchText.toLowerCase()),
        )
      : filteredCampaignsdata
  )?.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)); // sorting by date

  if (isAllCampaignError && (error as any)?.response?.status === 403)
    return <UnauthorizedPage />;
  if (isAllCampaignError)
    return <ErrorComponent refetch={refetchAllkCampaign} />;
  const column: ColumnDef<any>[] = contactParticipentColumn;

  return (
    <MantineProvider theme={whatsappTheme}>
      <Stack gap={"sm"} h={"100%"} mx={4}>
        <Flex justify={"space-between"}>
          <SearchInput
            placeholder={translations["Search Campaign"]}
            searchText={searchText}
            setSearchText={setSearchText}
          />
          <TeamSelector
            value={selectedTeam}
            onChange={setSelectedTeam}
            enableAll={true}
          />
        </Flex>
        <Center></Center>

        <PaperLayout p={0} h={"100%"} mah={"850px"}>
          <TanstackTable
            columns={column}
            data={filteredCampaigns}
            btnTitle={translations["Create"]}
            toggle={open}
            disableFuzzyFnCustom={true}
            detailBtn
            isPending={isAllCampaignLoading || isRefetchingAllCampaign}
          />
        </PaperLayout>
        <Modal
          opened={opened}
          onClose={close}
          centered
          size={"lg"}
          radius={"md"}
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
