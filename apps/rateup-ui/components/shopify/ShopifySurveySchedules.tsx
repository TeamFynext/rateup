import {
  Stack,
  Group,
  Title,
  Table,
  ActionIcon,
  Badge,
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import RefreshButton from "../Button/RefreshButton";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { shopifyEventData } from "../../utils/constants";
import { formatIsoDateStringWithTime } from "../../utils/dateTime";
import {
  useDeleteShopifySurveySchedule,
  useGetShopifySurveySchedules,
  useUpdateShopifySurveySchedule,
} from "../../backend/shopify/shopify.query";
import { showLoadingToast } from "../../utils/notifications";
import ScheduleSurveyModal from "./ScheduleSurveyModal";
import { useDisclosure } from "@mantine/hooks";
import { ActiveStatusBadge } from "pages/dashboard/apps&services/shopify";

const ShopifySurveySchedules = ({ session }) => {
  const columns = [
    "Event",
    "WhatsApp Template",
    "Product Specific",
    "Product",
    "Status",
    "Team",
    "Created At",
  ];
  const [opened, { open, close }] = useDisclosure(false);
  const { data: shopifySurveys } = useGetShopifySurveySchedules();
  const deleteShopifySurvey = useDeleteShopifySurveySchedule();
  const updateScheule = useUpdateShopifySurveySchedule();
  const deleteSchedule = (schedule) => {
    showLoadingToast(
      "Deleting survey schedule",
      "shopify-survey",
      true,
      "Loading",
    );
    deleteShopifySurvey.mutate(schedule.id);
  };

  const updateSurveySchedule = (scheduleId, data) => {
    showLoadingToast("Updating survey schedules..", "shopify-survey", true);
    updateScheule.mutate({ scheduleId, data });
  };
  return (
    <PaperLayout>
      <Stack>
        <Group>
          <Title order={3}>Survey Delivery settings</Title>
          <RefreshButton queryKeys={["shopifySurveySchedules"]} />
          <RateupButtonBlue
            title="schedule survey"
            onClick={open}
            rightIcon={<IconPlus />}
          />
        </Group>
        <PaperLayout>
          <Table verticalSpacing={"md"} highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {columns.map((column) => (
                  <Table.Th key={column}>{column}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shopifySurveys && shopifySurveys?.length ? (
                shopifySurveys?.map((schedule, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      {
                        shopifyEventData.find(
                          (event) => schedule.event == event.value,
                        )?.label
                      }
                    </Table.Td>
                    <Table.Td>{schedule.waTemplate.data.name}</Table.Td>
                    <Table.Td>
                      {schedule.isProductSpecific ? "Yes" : "No"}
                    </Table.Td>
                    <Table.Td>
                      {schedule.productId?.length ? schedule.productId : "----"}
                    </Table.Td>
                    <Table.Td>
                      <ActiveStatusBadge active={schedule?.active} />
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="outline">{schedule.team.name}</Badge>{" "}
                    </Table.Td>
                    <Table.Td>
                      {formatIsoDateStringWithTime(schedule.createdAt)}
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        onClick={() => deleteSchedule(schedule)}
                        variant="subtle"
                        color="red"
                        size={"sm"}
                      >
                        <IconTrash />
                      </ActionIcon>
                    </Table.Td>
                    <Table.Td>
                      <RateupButtonSecondary
                        title={schedule.active ? "Deactivate" : "Activate"}
                        onClick={() =>
                          updateSurveySchedule(schedule.id, {
                            active: !schedule.active,
                          })
                        }
                      />
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={9} align="center">
                    Nothing Found
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </PaperLayout>
      </Stack>
      <ScheduleSurveyModal opened={opened} close={close} session={session} />
    </PaperLayout>
  );
};

export default ShopifySurveySchedules;
