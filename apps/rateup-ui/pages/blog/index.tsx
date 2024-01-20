import HomePage from "../../components/HomePage/index";
import { getAllPosts } from "../../components/HomePage/pages/Blog/lib/api";

function BlogPage({ allPosts }) {
  return <HomePage allPosts={allPosts} />;
}

export default BlogPage;

export const getStaticProps = async () => {
  const allPosts = getAllPosts(["title", "date", "slug", "coverImage"]);
  return {
    props: { allPosts },
  };
};
