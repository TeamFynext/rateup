import MoreStories from "./components/MoreStories";
import HeroPost from "./components/HeroPost";
import Intro from "./components/Intro";
import Head from "next/head";
import { Container, Stack } from "@mantine/core";
import styles from "./components/blog.module.css";

import React from "react";

const Blog = ({ allPosts }) => {
  const heroPost = allPosts && allPosts.length > 0 ? allPosts[0] : null;

  const morePosts = heroPost ? allPosts.slice(1) : [];

  return (
    <>
      <Head>
        <title>
          All You Need to Know About Building Your Online Reputation
        </title>
      </Head>
      <Container>
        <div>
          <Intro />
        </div>
        <Stack className={styles["main-page-heropost-container"]}>
          {heroPost && (
            <HeroPost
              title={heroPost.title}
              coverImage={heroPost.coverImage}
              date={heroPost.date}
              slug={heroPost.slug}
            />
          )}
        </Stack>

        {morePosts.length > 0 && <MoreStories posts={morePosts} />}
      </Container>
    </>
  );
};

export default Blog;
