import { IconCircleCheckFilled } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { rateupLogoStackedWhiteTransparent } from "@/utils/constants";

import styles from "./ResponseSubmitted.module.css";

export function ResponseSubmitted({ isSurveyPreview = false }) {
  const navigate = useNavigate();

  return (
    <div
      className={`flex flex-col gap-4 ${styles["response-submitted-root-div"]} ${isSurveyPreview ? styles["survey-preview"] : ""}`}
    >
      <div
        className={`flex flex-col gap-4 ${styles["check-icon-container-and-thankyou-message-container"]}`}
      >
        <div className={styles["check-icon-container"]}>
          {<IconCircleCheckFilled size={"6rem"} />}
        </div>
        <p className={styles["thankyou-message-p"]}>Thank You, your response has been Submitted!</p>
      </div>
      <div
        className={`flex flex-col gap-4 ${styles["create-surveys-text-and-try-now-btn-container"]}`}
      >
        <div className={`flex items-center gap-2 ${styles["create-surveys-text-container"]}`}>
          <p className={styles["create-surveys-text"]}>
            Create Surveys for free using
            <a href="https://www.rateup.app" style={{ width: "fit-content" }}>
              <img
                src={rateupLogoStackedWhiteTransparent}
                style={{ height: 60, width: 60, objectFit: "contain" }}
              />
            </a>
          </p>
        </div>
        <Button
          className={styles["try-now-btn"]}
          onClick={() => {
            navigate({
              to: "https://www.rateup.app",
              replace: true,
            });
          }}
        >
          Try Now
        </Button>
      </div>
    </div>
  );
}
