import { getAllPosts } from "../../components/HomePage/pages/Blog/lib/api";
import ExplorePosts from "../../components/HomePage/pages/Blog/components/ExplorePosts";
import PostType from "../../components/HomePage/pages/Blog/interfaces/post";

function BlogAllPages({ allPosts }: { allPosts: PostType[] }): JSX.Element {
  return <ExplorePosts posts={allPosts} />;
}

export default BlogAllPages;

export const getStaticProps = async () => {
  const allPosts = getAllPosts(["title", "date", "slug", "coverImage"]);
  console.log(allPosts);
  return {
    props: { allPosts },
  };
};
