import { useRouter } from "next/router";
import ErrorPage from "next/error";
import { Container } from "@mantine/core";
import PostBody from "../../components/HomePage/pages/Blog/components/PostBody";
import PostHeader from "../../components/HomePage/pages/Blog/components/PostHeader";
import {
  getPostBySlug,
  getAllPosts,
} from "../../components/HomePage/pages/Blog/lib/api";
import PostTitle from "../../components/HomePage/pages/Blog/components/PostTitle";
import Head from "next/head";
import markdownToHtml from "../../components/HomePage/pages/Blog/lib/markdownToHtml";
import PostType from "../../components/HomePage/pages/Blog/interfaces/post";
import Header from "../../components/HomePage/components/Header";
import Footer from "../../components/HomePage/components/Footer";
import BookADemoSection from "../../components/HomePage/components/BookADemoSection";

import styles from "../../components/HomePage/pages/Blog/components/blog.module.css";
import Link from "next/link";

type Props = {
  post: PostType;
  morePosts: PostType[];
  preview?: boolean;
};

export default function Post({ post, morePosts, preview }: Props) {
  const router = useRouter();
  const title = `${post.title}`;
  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />;
  }
  return (
    <div>
      <Header />
      <Container>
        {router.isFallback ? (
          <PostTitle>Loading…</PostTitle>
        ) : (
          <>
            <Container>
              <Head>
                <title>{title}</title>
              </Head>
              <PostHeader
                title={post.title}
                coverImage={post.coverImage || "/default-cover-image.jpg"}
                date={post.date}
              />
              <div className={styles["blog-content"]}>
                <PostBody content={post.content} />
              </div>
            </Container>
          </>
        )}
      </Container>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Link href="/blog" className={styles["back-to-blog-link"]}>
          Back to Blog
        </Link>
      </div>
      <BookADemoSection />
      <Footer />
    </div>
  );
}

type Params = {
  params: {
    slug: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const post = getPostBySlug(params.slug, [
    "title",
    "date",
    "slug",
    "content",
    "coverImage",
  ]);
  const content = await markdownToHtml(post.content || "");

  return {
    props: {
      post: {
        ...post,
        content,
      },
    },
  };
}

export async function getStaticPaths() {
  const posts = getAllPosts(["slug"]);

  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug,
        },
      };
    }),
    fallback: false,
  };
}
