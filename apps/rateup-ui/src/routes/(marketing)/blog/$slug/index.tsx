import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Image } from "@unpic/react";

import Layout from "@/components/blog/Layout.tsx";
import SharePopover from "@/components/blog/ShareBlog.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { getMarkdownContent } from "@/lib/content.ts";
import { getSinglePost } from "@/lib/posts.ts";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

export const Route = createFileRoute("/(marketing)/blog/$slug/")({
  server: {
    middleware: [
      createMarkdownMiddleware(async ({ request }) => {
        const pathname = new URL(request.url).pathname;
        const slugPath = pathname.replace(/^\/(?:[a-z]{2}\/)?blog\//i, "").replace(/\/$/, "");
        const content = await getMarkdownContent(slugPath);

        if (!content) {
          return new Response("Not Found", { status: 404 });
        }

        return content;
      }),
    ],
  },
  component: Page,
  loader: async ({ params }) => {
    const { slug } = params;
    const post = await getSinglePost(slug);
    if (!post) throw notFound();
    return post;
  },
  head: async ({ params }) => {
    const post = await getSinglePost(params.slug);

    if (!post) return {};

    return {
      title: post.meta_title || post.title,
      meta: [
        {
          name: "description",
          content: post.meta_description || post.excerpt || undefined,
        },

        // OpenGraph
        { property: "og:title", content: post.og_title || post.title },
        {
          property: "og:description",
          content: post.og_description || post.excerpt || undefined,
        },
        {
          property: "og:image",
          content: post.og_image || post.feature_image || undefined,
        },
        { property: "og:url", content: post.canonical_url || post.url },

        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.twitter_title || post.title },
        {
          name: "twitter:description",
          content: post.twitter_description || post.excerpt || undefined,
        },
        {
          name: "twitter:image",
          content: post.twitter_image || post.feature_image || undefined,
        },

        // Authors (optional meta)
        {
          name: "author",
          content: post.primary_author.name || undefined,
        },
      ],

      links: [
        {
          rel: "canonical",
          href: post.canonical_url || post.url || undefined,
        },
      ],
    };
  },
});

function getInitials(name?: string) {
  if (!name) return "";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// For rendering post content
function PostContent({ html }: Readonly<{ html: string }>) {
  return (
    <div
      className="prose prose-slate max-w-none lg:prose-lg"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function Page() {
  const post = Route.useLoaderData();
  return (
    <Layout title={post.title} description={post.meta_description || post.excerpt}>
      <article>
        {/* Hero section with featured image */}
        {post.feature_image && (
          <div className="relative h-64 w-full bg-slate-900 sm:h-96 lg:h-[500px]">
            <Image
              layout="fullWidth"
              src={post.feature_image}
              alt={post.feature_image_alt || post.title}
              className="h-full w-full object-cover opacity-80"
            />
            {post.feature_image_caption && (
              <div
                className="absolute bottom-0 right-0 bg-slate-900 bg-opacity-75 p-2 text-xs text-white"
                dangerouslySetInnerHTML={{ __html: post.feature_image_caption }}
              />
            )}
          </div>
        )}

        {/* Post content */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Post header */}
          <header className="py-8 md:py-12">
            {post.primary_tag && (
              <div className="mb-4">
                <Link to={`/blog/tag/${post.primary_tag?.slug}`}>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                    {post.primary_tag?.name}
                  </span>
                </Link>
              </div>
            )}
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              {post.title}
            </h1>
            <div className="mt-6 flex items-center">
              <Avatar size="lg" className="mr-4">
                <AvatarImage
                  src={post.primary_author?.profile_image}
                  alt={post.primary_author?.name}
                />
                <AvatarFallback>{getInitials(post.primary_author?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Link to={`/blog/author/${post.primary_author?.slug}`}>
                    <div className="font-medium text-slate-900">{post.primary_author?.name}</div>
                  </Link>
                  <div className="text-sm text-slate-500">
                    {new Date(post.published_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {post.updated_at !== post.published_at && (
                      <span>
                        {" "}
                        · Updated:{" "}
                        {new Date(post.updated_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <SharePopover />
                </div>
              </div>
            </div>
          </header>

          {/* Post body */}
          <div className="pb-16">
            <PostContent html={post.html} />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 border-t border-slate-200 pt-8">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      to={`/blog?tag=${tag.slug}`}
                      className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-200"
                    >
                      {tag?.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Author bio */}
            <div className="mt-12 rounded-xl bg-slate-50 p-6">
              <div className="flex flex-col items-center sm:flex-row">
                <Avatar size="lg" className="mb-4 size-20 rounded-full sm:mb-0 sm:mr-6">
                  <AvatarImage
                    src={post.primary_author?.profile_image}
                    alt={post.primary_author?.name}
                  />
                  <AvatarFallback>{getInitials(post.primary_author?.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-900">
                    About {post.primary_author?.name}
                  </h3>
                  <p className="text-slate-600">
                    {post.primary_author?.bio ||
                      `${post.primary_author?.name} is a contributor to the RateUp Blog.`}
                  </p>
                  <div className="mt-4 flex space-x-4">
                    {post.primary_author?.twitter && (
                      <a
                        href={`https://twitter.com/${post.primary_author?.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Twitter
                      </a>
                    )}
                    {post.primary_author?.website && (
                      <a
                        href={post.primary_author.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Related posts */}
      {/* {relatedPosts.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-2xl font-bold text-slate-900">
              Related Posts
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <article
                  key={relatedPost.id}
                  className="group flex flex-col overflow-hidden rounded-xl bg-white shadow transition hover:shadow-md"
                >
                  <Link
                    to={`/blog/${relatedPost.slug}`}
                    className="block overflow-hidden"
                  >
                    {relatedPost.feature_image && (
                      <div className="aspect-video overflow-hidden">
                        <Image
                          src={relatedPost.feature_image}
                          alt=""
                          className="h-full w-full transform object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-slate-900">
                        {relatedPost.title}
                      </h3>
                      <p className="mb-4 line-clamp-2 text-sm text-slate-600">
                        {relatedPost.excerpt}
                      </p>
                      <div className="mt-auto text-sm font-medium text-blue-600">
                        Read more →
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )} */}

      {/* CTA section */}
      <section className="bg-blue-700 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to improve your business reviews?
          </h2>
          <p className="mx-auto pt-4 text-xl text-blue-100">
            Join thousands of businesses using RateUp to enhance their online reputation.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/login"
              className="rounded-lg bg-white px-8 py-3 text-lg font-medium text-blue-700 shadow-sm hover:bg-blue-50"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
