import { Loader } from "@mantine/core";
import classes from "./styles.module.css";
import { useSearchParams } from "next/navigation";
import { useGetMessagesByWaContactId } from "../../../../backend/whatsapp/inbox/message/wamessage.query";
import NothingFound from "../../../NothingFound/NothingFound";
import WaInboxChatDisplayHeader from "./chatdisplayHeader";
import { useGetWaContactByWaContactId } from "../../../../backend/whatsapp/inbox/contact/wacontact.query";
import WaInboxChatDisplayFooter from "./chatdisplayFooter";
import WaInboxChatDisplayBody from "./chatdisplayBody";
export default function WaInboxChatDisplay() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get("waContactId");
  const { data, isLoading, error } = useGetMessagesByWaContactId(
    contactId as string,
  );
  const {
    data: waContactData,
    isLoading: isWaContactLoading,
    error: waContactError,
  } = useGetWaContactByWaContactId(contactId as string);
  if (isLoading || isWaContactLoading) return <Loader />;
  if (error) return <div>Error: {error.message}</div>;
  if (waContactError) return <div>Error: {waContactError.message}</div>;
  return (
    <div className={classes.wrapper}>
      {data ? (
        <>
          <WaInboxChatDisplayHeader {...waContactData} />
          <WaInboxChatDisplayBody data={data} />
          <WaInboxChatDisplayFooter waContactId={contactId} />
        </>
      ) : (
        <NothingFound text="Select a chat to see messages" />
      )}
    </div>
  );
}
