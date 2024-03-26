import { IconSend } from "@tabler/icons-react";
import classes from "./styles.module.css";
import { ContainedTextField } from "../../../../input/ContainedInput/ContainedInput";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { useSendNewWaMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import { useForm } from "@mantine/form";
import { WaContact } from "../../../../../types/global";
import { isInboxSessionExpired } from "../../../../../utils/whatsapp/inbox";
import WaInboxTemplateDisplayModal from "./templateDisplayModal";

export default function WaInboxChatDisplayFooter(props: WaContact) {
  const timeStamp = props.userInitiatedFinalTimeStamp;
  const sendnewWaMessage = useSendNewWaMessage(props?.id);
  const form = useForm({
    initialValues: {
      type: "text",
      text: { body: "" },
    },
  });
  function handleSendMessage() {
    sendnewWaMessage.mutate(form.values);
    form.reset();
  }
  return (
    <div className={classes.wrapper}>
      <WaInboxTemplateDisplayModal
        sessionExpired={isInboxSessionExpired(timeStamp)}
        waContact={props}
      />
      <ContainedTextField
        disabled={isInboxSessionExpired(timeStamp)}
        flex={1}
        value={form.values.text.body}
        onChange={(e) =>
          form.setValues({
            text: { ...form.values.text, body: e.target.value },
          })
        }
      />
      <RateupButtonPrimary
        disabled={isInboxSessionExpired(timeStamp)}
        title="Send"
        rightIcon={<IconSend />}
        onClick={handleSendMessage}
      />
    </div>
  );
}
