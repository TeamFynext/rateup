"use client";

import React from "react";

import { Button, Image } from "@mantine/core";
import { Link } from "lucide-react";

import { imagePath } from "@/components/HomePage/pages/constants";

import styles from "../../ws/[shortId]/ws.module.css";

const error = () => {
  return (
    <div className={styles["error-page"]}>
      <Link href="/">
        <Image
          w={80}
          src={`${imagePath}/rateup-logo-blue-text.svg`}
          alt="logo of rateup"
        />
      </Link>
      <p className={styles["error-text"]}>
        Unable to get landing page, please try again later
      </p>
      <Button
        className={styles["reload-btn"]}
        onClick={() => window.location.reload()}
      >
        Reload the page
      </Button>
    </div>
  );
};

export default error;
