import CoverImage from "./CoverImageHero";
import PostTitle from "./PostTitle";
import DateFormatter from "./DateFormatter";

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
        <DateFormatter dateString={date} />
      </div>
    </>
  );
};

export default PostHeader;
