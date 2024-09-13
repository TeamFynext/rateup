import styles from "./HeroSection.module.css";

function ListItemDot({ color = "var(--tertiary-color)" }) {
  return (
    <div
      className={styles["list-item-dot"]}
      style={{
        backgroundColor: color,
      }}
    ></div>
  );
}

export default ListItemDot;
