import CoverImage from "./CoverImageSub";
import PostTitle from "./PostTitle";
import DateFormatter from "./DateFormatter";
import { Flex } from "@mantine/core";

type Props = {
  title: string;
  coverImage: string;
  date: string;
};

const PostHeader = ({ title, coverImage, date }: Props) => {
  return (
    <>
      <PostTitle>{title}</PostTitle>

      <CoverImage title={title} src={coverImage} />
      <div>
        <Flex
          style={{ marginTop: "1rem", marginBottom: "2rem", fontSize: "18px" }}
        >
          Published on:
          <DateFormatter dateString={date} />
        </Flex>
      </div>
    </>
  );
};

export default PostHeader;
