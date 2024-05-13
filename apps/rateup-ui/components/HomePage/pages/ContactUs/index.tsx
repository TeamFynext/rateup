import styles from "./contactus.module.css";

function ContactUs() {
  return (
    <div className={styles["contact-us-container"]}>
      <h1>Contact Us</h1>
      <p className={styles["contact-details-p"]}>
        <span>Uprate Technologies</span>
        <span>Kerala Startup Mission</span>
        <span>Kasaragod - 671123 </span>
        <span>Ph:+91 8547500686</span>
        <span>E-mail : hello@rateup.app</span>
      </p>
    </div>
  );
}

export default ContactUs;
