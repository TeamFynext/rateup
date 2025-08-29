"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Flex } from "@mantine/core";
import { modals } from "@mantine/modals";

import { useCheckSession } from "@/hooks/checkSession";
import { useRateupPaymentsPlans } from "@/backend/payment/payment.query";

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

export const JoinNowButton = ({ buttonProps }) => {
  const { data: plans, isPending, isError } = useRateupPaymentsPlans();
  const menuFreePlan = plans
    ? plans.find(
        (plan) => plan.name.includes("FREE") && plan.name.includes("MENU"),
      )
    : null;

  const session = useCheckSession();

  const router = useRouter();

  const handleFreeMenuPlan = () => {
    if (session) {
      router.push("/login");
      return;
    }
    if (menuFreePlan) {
      localStorage.setItem("selected_plan", JSON.stringify(menuFreePlan));
      router.push("/signup");
    } else {
      router.push("/pricing");
    }
  };
  return (
    <Button
      className="book-a-demo-btn"
      onClick={handleFreeMenuPlan}
      {...buttonProps}
    >
      Join Now
    </Button>
  );
};
