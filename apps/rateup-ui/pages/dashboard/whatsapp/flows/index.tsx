import { Box, Button, Title, LoadingOverlay, MultiSelect } from "@mantine/core";
import { useGetWaFlows } from "../../../../backend/whatsapp/flows/waFlows.query";
import styles from "./flows.module.css";

function Flows() {
  const { data, isLoading } = useGetWaFlows();

  console.log(data, "flows test.....");
  return (
    <Box className={styles["flows-list-page-container"]}>
      <Box className={styles["flows-list-header"]}>
        <Title className={styles["flows-list-heading-h1"]}>Flows</Title>
        <Box>
          {/* <MultiSelect
            
          /> */}
          <Button>Create a flow</Button>
        </Box>
      </Box>

      <Box className={styles["flows-list-div"]}>
        <LoadingOverlay visible={isLoading} />
      </Box>
    </Box>
  );
}

export default Flows;
