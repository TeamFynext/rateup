import { Button, CopyButton, TextInput } from "@mantine/core";
import styles from "./LinkWithCopyBtn.module.css";
import { IconCopy } from "@tabler/icons-react";

function LinkWithCopyBtn({ link }) {
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
            {copied ? "Copied url" : "Copy url"}
          </Button>
        )}
      </CopyButton>
    </div>
  );
}

export default LinkWithCopyBtn;
