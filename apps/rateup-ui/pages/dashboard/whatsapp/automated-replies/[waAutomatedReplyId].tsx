import React from "react";
import { useRouter } from "next/router";

import FlowEditor from "./components/flow-editor";

const WW = () => {
  const router = useRouter();
  let waAutomatedReplyId = router.query?.waAutomatedReplyId as string;
  return <FlowEditor waAutomatedReplyId={waAutomatedReplyId} />;
};

export default WW;
