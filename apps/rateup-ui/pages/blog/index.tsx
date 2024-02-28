import LandingPageLayout from "../../components/HomePage/LandingPageLayout";
import BlogPage from "../../components/HomePage/pages/Blog";
import { getAllPosts } from "../../components/HomePage/pages/Blog/lib/api";

function Blog({ allPosts }) {
  return (
    <LandingPageLayout>
      <BlogPage allPosts={allPosts} />
    </LandingPageLayout>
  );
}

export default Blog;

export const getStaticProps = async () => {
  const allPosts = getAllPosts(["title", "date", "slug", "coverImage"]);
  return {
    props: { allPosts },
  };
};
