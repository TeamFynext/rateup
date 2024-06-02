import Link from "next/link";
import markdownStyles from "./markdown-styles.module.css";
import styles from "./blog.module.css";

type Props = {
  content: string;
};

const PostBody = ({ content }: Props) => {
  return (
    <div className={styles["footer-space"]}>
      <div
        className={markdownStyles["markdown"]}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
};

export default PostBody;
