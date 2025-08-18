import { Button, CopyButton, TextInput } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import styles from "./LinkWithCopyBtn.module.css";

function LinkWithCopyBtn({ link, label }: { link: string; label?: string }) {
  const { translations } = useTranslations();
  return (
    <div className={styles["link-input-copy-btn-container"]}>
      <TextInput
        value={link}
        readOnly
        label={label}
        classNames={{
          wrapper: styles["link-input-wrapper"],
          input: styles["link-input"],
          label: styles.link_input,
        }}
      />

      <CopyButton value={link}>
        {({ copied, copy }) => (
          <Button
            variant={copied ? "outline" : "filled"}
            onClick={copy}
            rightSection={<IconCopy />}
            mt={label ? 25 : 0}
          >
            {copied ? translations["Copied url"] : translations["Copy url"]}
          </Button>
        )}
      </CopyButton>
    </div>
  );
}

export default LinkWithCopyBtn;
