import { useRef } from "react";

import { useForm } from "@mantine/form";
import { IconSend } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import { useSendNewWaMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import { isInboxSessionExpired } from "../../../../../utils/whatsapp/inbox";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { ContainedTextField } from "../../../../input/ContainedInput/ContainedInput";
import { PopoverEmojiPicker } from "../../../templates/Details/TextFormateToolBar";
import WaInboxFooterMenu from "./footerMenu";
import classes from "./styles.module.css";

export default function WaInboxChatDisplayFooter({
  contact,
}: {
  contact: ContactsWithLastMessage;
}) {
  const inputRef = useRef(null);
  const { translations } = useTranslations();
  const sendnewWaMessage = useSendNewWaMessage(contact.id);
  const form = useForm({
    initialValues: {
      type: "text",
      text: { body: "" },
    },
    validate: {
      text: (value) => {
        if (value.body.length === 0) {
          return translations["Message can't be empty"];
        }
      },
    },
  });
  function handleSendMessage(values: typeof form.values) {
    sendnewWaMessage.mutate(values, {
      onSuccess: () => {
        form.reset();
      },
    });
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

  const isSessionExpired = isInboxSessionExpired(
    contact?.userInitiatedFinalTimeStamp,
  );
  return (
    <div className={classes.wrapper}>
      <WaInboxFooterMenu sessionExpired={isSessionExpired} contact={contact} />
      <form
        onSubmit={form.onSubmit((values) => handleSendMessage(values))}
        className={classes.form}
      >
        <ContainedTextField
          ref={inputRef}
          disabled={isSessionExpired}
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
          disabled={isSessionExpired}
          type={"submit"}
          title={translations["Send"]}
          rightIcon={<IconSend />}
        />
      </form>
    </div>
  );
}
