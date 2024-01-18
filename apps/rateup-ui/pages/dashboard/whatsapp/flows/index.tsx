import { Box, Button, Group, Title } from "@mantine/core";
import styles from "./flows.module.css";
import { getWaFlows } from "../../../../backend/whatsapp/flows/waFlows.api";
import { useGetWaFlows } from "../../../../backend/whatsapp/flows/waFlows.query";

function Flows() {
  const { data, isLoading } = useGetWaFlows();

  console.log(data, "flows test.....");
  return (
    <Box className={styles["flows-list-page-container"]}>
      <Group>
        <Title>Flows</Title>
        <Button>Create a flow</Button>
      </Group>

      <Box className={styles["flows-list-div"]}></Box>
    </Box>
  );
}

export default Flows;
