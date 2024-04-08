import { IconSend } from "@tabler/icons-react";
import classes from "./styles.module.css";
import { ContainedTextField } from "../../../../input/ContainedInput/ContainedInput";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { useSendNewWaMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import { useForm } from "@mantine/form";
import { WaContact } from "../../../../../types/global";
import { isInboxSessionExpired } from "../../../../../utils/whatsapp/inbox";
import WaInboxTemplateDisplayModal from "./templateDisplayModal";
import { PopoverEmojiPicker } from "../../../templates/Details/TextFormateToolBar";
import { useRef } from "react";

export default function WaInboxChatDisplayFooter(props: WaContact) {
  const timeStamp = props.userInitiatedFinalTimeStamp;
  const inputRef = useRef(null);
  const sendnewWaMessage = useSendNewWaMessage(props?.id);
  const form = useForm({
    initialValues: {
      type: "text",
      text: { body: "" },
    },
  });
  function handleSendMessage(e) {
    e.preventDefault();
    sendnewWaMessage.mutate(form.values);
    form.reset();
  }
  function insertEmoji(value: string) {
    const { selectionStart, selectionEnd } = inputRef.current;
    const text = form.values.text.body;
    const before = text.substring(0, selectionStart);
    const after = text.substring(selectionEnd);
    const updatedText = before + value + after;
    form.setValues({
      text: { ...form.values.text, body: updatedText },
    });
    setTimeout(() => {
      const newPosition = before.length + value.length;
      inputRef.current.selectionStart = newPosition;
      inputRef.current.selectionEnd = newPosition;
    }, 0);
  }
  return (
    <div className={classes.wrapper}>
      <WaInboxTemplateDisplayModal
        sessionExpired={isInboxSessionExpired(timeStamp)}
        waContact={props}
      />
      <form action="" onSubmit={handleSendMessage} className={classes.form}>
        <ContainedTextField
          ref={inputRef}
          disabled={isInboxSessionExpired(timeStamp)}
          leftSection={<PopoverEmojiPicker onEmojiClick={insertEmoji} />}
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
          type={"submit"}
          title="Send"
          rightIcon={<IconSend />}
        />
      </form>
    </div>
  );
}
