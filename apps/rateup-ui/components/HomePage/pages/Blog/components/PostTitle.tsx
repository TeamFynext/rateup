import { ReactNode } from "react";
import { Title } from "@mantine/core";
import styles from "./blog.module.css";
type Props = {
  children?: ReactNode;
};

const PostTitle = ({ children }: Props) => {
  return (
    <Title className={styles["blog-page-main-title-container"]}>
      {children}
    </Title>
  );
};

export default PostTitle;
