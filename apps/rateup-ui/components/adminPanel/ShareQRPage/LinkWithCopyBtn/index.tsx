import { Button, CopyButton, TextInput } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import styles from "./LinkWithCopyBtn.module.css";

function LinkWithCopyBtn({ link }) {
  const { translations } = useTranslations();
  return (
    <div className={styles["link-input-copy-btn-container"]}>
      <TextInput
        value={link}
        readOnly
        classNames={{
          wrapper: styles["link-input-wrapper"],
          input: styles["link-input"],
        }}
      />

      <CopyButton value={link}>
        {({ copied, copy }) => (
          <Button
            variant={copied ? "outline" : "filled"}
            onClick={copy}
            rightSection={<IconCopy />}
          >
            {copied ? translations["Copied url"] : translations["Copy url"]}
          </Button>
        )}
      </CopyButton>
    </div>
  );
}

export default LinkWithCopyBtn;
