import { useCallback } from "react";

import { Flex } from "@mantine/core";
import { modals } from "@mantine/modals";

import { gAnalyticsAndFbEvent } from "../../../../utils/gtag";
import modalStyles from "../../../Modal/ModalManagerModals/BookDemoModal/ModalStyles.module.css";
import Button from "../Button";

type ButtonProps = {
  whiteBackgroundGradientText?: boolean;
  style?: any;
  animate?: boolean;
  variant?: string;
};

type BookDemoContactFormProps = {
  buttonProps?: ButtonProps;
  className?: string;
  buttonText?: string;
  clickedFromPage?: string;
};

function BookDemoContactForm({
  buttonProps,
  className = "",
  buttonText,
  clickedFromPage,
}: BookDemoContactFormProps) {
  const handleBookDemoButton = useCallback(() => {
    modals.openContextModal({
      modal: "bookDemoModal",
      title: "Book A Demo",
      classNames: modalStyles,
      zIndex: 400,
      centered: true,
      size: "100vw",
      closeOnClickOutside: false,
      innerProps: {},
    });
    switch (clickedFromPage) {
      case "digital-menu-page":
        gAnalyticsAndFbEvent(
          "digital_menu",
          "DigitalMenuJoinNow",
          "Clicked on join now button in digital menu section of home page",
        );
        break;

      default:
        gAnalyticsAndFbEvent(
          "book_demo",
          "BookDemo",
          "Clicked on Book demo button in home page",
        );
    }
  }, [modals, clickedFromPage]);

  return (
    <Flex className={className}>
      <Button
        className="book-a-demo-btn"
        onClick={handleBookDemoButton}
        {...buttonProps}
      >
        {buttonText || "Book a Demo"}
      </Button>
    </Flex>
  );
}

export default BookDemoContactForm;
