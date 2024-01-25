import { Box } from "@mantine/core";
import styles from "./EditFlowScreenQs.module.css";
import { useContext } from "react";
import { FlowJsonObjContext } from "../EditFlow/FlowJsonObjContext";

function QuestionsList({ screenId }) {
  const { flowJsonObj, setFlowJsonObj } = useContext(FlowJsonObjContext);

  // const [questions, setQuestion]
  return <Box className={styles["questions-list"]}></Box>;
}

export default QuestionsList;
