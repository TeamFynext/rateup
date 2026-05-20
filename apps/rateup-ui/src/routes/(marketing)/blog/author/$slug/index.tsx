import { createFileRoute, notFound } from "@tanstack/react-router";

import { getPosts } from "@/lib/posts.ts";
import BlogLayout from "@/components/blog/Layout.tsx";

import PostGrid from "../../../../../components/(marketing)/blog/post-grid.tsx";

export const Route = createFileRoute("/(marketing)/blog/author/$slug/")({
  component: Author,
  loader: async ({ params }) => {
    const { slug } = params;
    if (!slug) throw notFound();
    const posts = await getPosts({ author: slug });
    if (!posts || (posts as any).meta?.pagination.total === 0) throw notFound();
    return posts;
  },
});

export const revalidate = 60;

function Author() {
  const posts = Route.useLoaderData();
  const { slug } = Route.useParams();
  return (
    <BlogLayout
      title="RateUp Blog"
      description="Latest insights on business reviews and customer feedback"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PostGrid activeAuthor={slug} posts={posts} />;
      </div>
    </BlogLayout>
  );
}
