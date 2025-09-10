import React from "react";
import { notFound } from "next/navigation";

import { getPosts } from "@/lib/posts";
import BlogLayout from "@/components/blog/Layout";

import PostGrid from "../../post-grid";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Tag({ params }: Readonly<Props>) {
  const { slug } = await params;
  if (!slug) notFound();
  const posts = await getPosts({ tag: slug });
  if (!posts || (posts as any).meta?.pagination.total === 0) notFound();
  return (
    <BlogLayout
      title="RateUp Blog"
      description="Latest insights on business reviews and customer feedback"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PostGrid activeTag={slug} posts={posts} />;
      </div>
    </BlogLayout>
  );
}
