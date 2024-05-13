import styles from "./contactus.module.css";
import { Group, Stack } from "@mantine/core";

function ContactUs() {
  return (
    <div className={styles["contact-us-container"]}>
      {/* <h1>Contact Us</h1>
      <p className={styles["contact-details-p"]}>
        <span>Uprate Technologies</span>
        <span>Kerala Startup Mission</span>
        <span>Kasaragod - 671123 </span>
        <span>Ph:+91 8547500686</span>
        <span>E-mail : hello@rateup.app</span>
      </p> */}

      <Group justify="center">
        <Stack>
          <h1>Contact Us</h1>

          <p>
            <span>
              Uprate Technologies Pvt Ltd <br />
              Door No Xii 154, Anish Bh, Mattappalliyil <br />
              Paduppu, Sankarampady <br /> Kasaragod , Kerala, India - 671541{" "}
              <br />
            </span>{" "}
            <br />
            <span>Ph:+91 8547500686</span> <br />
            <span>E-mail : hello@rateup.app</span>
          </p>
        </Stack>
      </Group>
    </div>
  );
}

export default ContactUs;
