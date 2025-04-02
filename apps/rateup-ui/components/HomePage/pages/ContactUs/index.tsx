import { Box, Stack } from "@mantine/core";

import styles from "./contactus.module.css";

function ContactUs() {
  return (
    <div className={styles["contact-us-container"]}>
      <h1>Contact Us</h1>
      <Stack>
        <Box>
          <h2 className={styles["country-name-h2"]}>India:</h2>
          <p className={styles["contact-details-p"]}>
            <span>Uprate Technologies Private Limited, Cochin</span>
            <span>Kerala Startup Mission</span>
            <span>E-mail : hello@rateup.app</span>
          </p>
        </Box>
        <Box>
          <h2 className={styles["country-name-h2"]}>Germany:</h2>
          <p className={styles["contact-details-p"]}>
            <span>Duesseldorf, Germany</span>
            <span>E-mail : hello@rateup.app</span>
          </p>
        </Box>
      </Stack>
    </div>
  );
}

export default ContactUs;
