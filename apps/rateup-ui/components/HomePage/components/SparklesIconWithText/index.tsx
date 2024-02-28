import styles from "./SparklesIconWithText.module.css";

function SparklesIconWithText({ text }) {
  return (
    <span className={styles["text-span-with-sparkle-icon"]}>
      <img src="images/sparkles-icon.svg" alt="sparkles" />
      <span>{text}</span>
    </span>
  );
}

export default SparklesIconWithText;
