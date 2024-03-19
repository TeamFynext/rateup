import { IconSend } from "@tabler/icons-react";
import classes from "./styles.module.css";
import { ContainedTextField } from "../../../../input/ContainedInput/ContainedInput";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { useSendNewWaMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import { useForm } from "@mantine/form";
interface Props {
  waContactId: string;
}
export default function WaInboxChatDisplayFooter(props: Props) {
  const sendnewWaMessage = useSendNewWaMessage(props.waContactId);
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
      <ContainedTextField
        flex={1}
        value={form.values.text.body}
        onChange={(e) =>
          form.setValues({
            text: { ...form.values.text, body: e.target.value },
          })
        }
      />
      <RateupButtonPrimary
        title="Send"
        rightIcon={<IconSend />}
        onClick={handleSendMessage}
      />
    </div>
  );
}
