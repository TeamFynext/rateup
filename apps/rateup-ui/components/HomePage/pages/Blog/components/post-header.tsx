//import DateFormatter from "./date-formatter";
import CoverImage from "./cover-image-hero";
import PostTitle from "./post-title";
import styles from "./blog.module.css";
import { Title } from "@mantine/core";

type Props = {
  title: string;
  coverImage: string;
};

const PostHeader = ({ title, coverImage }: Props) => {
  return (
    <>
      <PostTitle>{title}</PostTitle>

      <CoverImage title={title} src={coverImage} />
      {/* <div  className={styles["sfdhfdhfk"]}>
          <DateFormatter dateString={date} />
        </div>  */}
    </>
  );
};

export default PostHeader;
