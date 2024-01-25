import { Badge, Box } from "@mantine/core";
import styles from "./FlowCard.module.css";
import { useRouter } from "next/router";

function FlowCard({ name, status, id }) {
  const router = useRouter();
  return (
    <Box
      className={styles["flow-card-div"]}
      onClick={() => router.push(`/dashboard/whatsapp/flows/${id}`)}
    >
      <Box className={styles["flow-card-content"]}>
        <h2 className={styles["flow-name-h2"]}>{name}</h2>
        <Badge className={styles[`${status.toLowerCase()}-badge`]}>
          {status}
        </Badge>
      </Box>
    </Box>
  );
}

export default FlowCard;
