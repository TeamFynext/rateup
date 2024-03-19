import { useRouter } from "next/router";
import { useWaAutomatedReplyById } from "../../../../backend/whatsapp/automated-reply/automatedReply.query";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import { Stack, Title } from "@mantine/core";
import { AutomatedReplyForm } from "./create";

export default function WaAutomatedReplyDetailedViewPage() {
  const router = useRouter();
  const waAutomatedReplyId = router.query.waAutomatedReplyId as string;
  const { data: automation } = useWaAutomatedReplyById(waAutomatedReplyId);

  if (!automation) return <RateupLoader />;

  return (
    <Stack>
      <Title>{automation.name}</Title>
      <AutomatedReplyForm initialValues={automation} editMode />
    </Stack>
  );
}
