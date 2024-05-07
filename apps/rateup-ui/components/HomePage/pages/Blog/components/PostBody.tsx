import Link from "next/link";
import markdownStyles from "./markdown-styles.module.css";
import styles from "./blog.module.css";

type Props = {
  content: string;
};

const PostBody = ({ content }: Props) => {
  return (
    <div>
      <div
        className={markdownStyles["markdown"]}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <Link href="/blog">
        <h1
          style={{
            marginBottom: "1rem",
            marginTop: "1rem",
            fontSize: "20px",
            color: "inherit",
          }}
        >
          Back to Blog page
        </h1>
      </Link>
    </div>
  );
};

export default PostBody;
