import Link from "next/link";
import { Image } from "@mantine/core";
import styles from "./blog.module.css";
type Props = {
  title: string;
  src: string;
  slug?: string;
};

const CoverImage = ({ title, src, slug }: Props) => {
  const image = (
    <Image
      src={src}
      alt={`Cover Image for ${title}`}
      fit="contain"
      h={450}
      className={styles["image-container"]}
    />
  );
  return (
    <div>
      {slug ? (
        <Link as={`/blog/${slug}`} href="/blog/[slug]" aria-label={title}>
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  );
};

export default CoverImage;
