import { Flex, LoadingOverlay, Modal } from "@mantine/core";
import Button from "../Button";
import { useDisclosure } from "@mantine/hooks";
import styles from "./BookADemoContactForm.module.css";
import modalstyles from "./ModalStyles.module.css";
import { useCallback, useEffect, useState } from "react";
import { isProduction } from "../../../../utils/constants";
import { analyseEvent } from "../../../../utils/gtag";
import { fbEvent } from "../../../../utils/fbpixel";

type ButtonProps = {
  whiteBackgroundGradientText?: boolean;
};

type BookDemoContactFormProps = {
  buttonProps?: ButtonProps;
  className?: string;
};

function BookDemoContactForm({
  buttonProps,
  className = "",
}: BookDemoContactFormProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);

  useEffect(() => {
    if (opened) setIsIframeLoading(true);
  }, [opened]);

  const upadateLoadingStateOfIframe = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  return (
    <Flex className={className}>
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
            src="https://rateup.app/ws/8hKp9bb9"
          />
        )}
      </Modal>
      <Button
        className="book-a-demo-btn"
        onClick={() => {
          if (isProduction) {
            analyseEvent({
              action: "button_click",
              category: "book_demo",
              label: "Clicked on Book demo button in home page",
            });
            fbEvent("BookDemo", {
              label: "Clicked on Book demo button in home page",
            });
          }
          open();
        }}
        {...buttonProps}
      >
        Book a Demo
      </Button>
    </Flex>
  );
}

export default BookDemoContactForm;
