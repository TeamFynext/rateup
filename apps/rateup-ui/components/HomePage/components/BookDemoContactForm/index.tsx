import { Flex, LoadingOverlay, Modal } from "@mantine/core";
import Button from "../Button";
import { useDisclosure } from "@mantine/hooks";
import styles from "./BookADemoContactForm.module.css";
import modalstyles from "./ModalStyles.module.css";
import { useCallback, useEffect, useState } from "react";

type ButtonProps = {
  whiteBackgroundGradientText?: boolean;
};

type BookDemoContactFormProps = {
  buttonProps?: ButtonProps;
};

function BookDemoContactForm({ buttonProps }: BookDemoContactFormProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);

  useEffect(() => {
    if (opened) setIsIframeLoading(true);
  }, [opened]);

  const upadateLoadingStateOfIframe = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  return (
    <Flex>
      <Modal
        classNames={modalstyles}
        opened={opened}
        onClose={close}
        zIndex={400}
        title={"Book A Demo"}
        centered
        size={"100vw"}
        closeOnClickOutside={false}
      >
        <LoadingOverlay
          visible={isIframeLoading}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />
        {opened && (
          <iframe
            onLoad={upadateLoadingStateOfIframe}
            className={styles["contact-form-iframe"]}
            src="https://rateup.app/public/survey/89421698-e6dd-43ee-9b63-757a7614bed3"
          />
        )}
      </Modal>
      <Button className="book-a-demo-btn" onClick={open} {...buttonProps}>
        Book a Demo
      </Button>
    </Flex>
  );
}

export default BookDemoContactForm;
