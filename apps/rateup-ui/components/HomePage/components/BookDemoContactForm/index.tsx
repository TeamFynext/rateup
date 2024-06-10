import { Flex } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useCallback } from "react";
import { isProduction } from "../../../../utils/constants";
import { fbEvent } from "../../../../utils/fbpixel";
import { analyseEvent } from "../../../../utils/gtag";
import modalStyles from "../../../Modal/ModalManagerModals/BookDemoModal/ModalStyles.module.css";
import Button from "../Button";

type ButtonProps = {
  whiteBackgroundGradientText?: boolean;
  style?: any;
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
    if (isProduction) {
      switch (clickedFromPage) {
        case "digital-menu-page": {
          analyseEvent({
            action: "button_click",
            category: "digital_menu",
            label:
              "Clicked on join now button in digital menu section of home page",
          });
          fbEvent("DigitalMenuJoinNow", {
            label:
              "Clicked on join now button in digital menu section of home page",
          });
          break;
        }

        default: {
          analyseEvent({
            action: "button_click",
            category: "book_demo",
            label: "Clicked on Book demo button in home page",
          });
          fbEvent("BookDemo", {
            label: "Clicked on Book demo button in home page",
          });
        }
      }
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
