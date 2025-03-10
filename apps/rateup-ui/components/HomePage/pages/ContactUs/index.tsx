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
            <span>Uprate Technologies</span>
            <span>Kerala Startup Mission</span>
            <span>Kasaragod - 671123 </span>
            <span>Ph:+91 8547500686</span>
            <span>E-mail : hello@rateup.app</span>
          </p>
        </Box>
        <Box>
          <h2 className={styles["country-name-h2"]}>Germany:</h2>
          <p className={styles["contact-details-p"]}>
            <span>Drishya Technlogies UG</span>
            <span>Duesseldorf, Germany</span>
          </p>
        </Box>
      </Stack>
    </div>
  );
}

export default ContactUs;
