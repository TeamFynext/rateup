import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Image } from "@unpic/react";

import Layout from "@/components/blog/Layout.tsx";
import SharePopover from "@/components/blog/ShareBlog.tsx";
import ErrorPage from "@/components/error.tsx";
import RoutePending from "@/components/Loaders/RoutePending.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { getMarkdownContent } from "@/lib/content.ts";
import { BASE_URL } from "@/lib/metadata.ts";
import { getSinglePost, GHOST_ORIGIN } from "@/lib/posts.ts";
import type { Tag } from "@/lib/posts.ts";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";
import { rateupLogoOg } from "@/utils/constants.ts";

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
  pendingComponent: RoutePending,
  errorComponent: ErrorPage,
  loader: async ({ params }) => {
    const { slug } = params;
    const post = await getSinglePost(slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData: post }) => {
    // `loaderData` rather than a second `getSinglePost` call — the head used to refetch every
    // post on every render. It is optional in the head context (client navigation computes the
    // head before the loader settles), so fall back to the root defaults for that one frame.
    if (!post) return {};

    const url = `${BASE_URL}/blog/${post.slug}`;
    // Ghost fills `canonical_url` with its own origin. Honour it only when an editor has pointed
    // it at a real third-party republication.
    const canonical =
      post.canonical_url && !post.canonical_url.startsWith(GHOST_ORIGIN) ? post.canonical_url : url;
    const description = post.meta_description || post.excerpt || undefined;
    const image = post.og_image || post.feature_image || rateupLogoOg;

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BlogPosting",
          "@id": `${url}#post`,
          headline: post.title,
          description: description,
          image,
          url,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          datePublished: post.published_at,
          dateModified: post.updated_at || post.published_at,
          author: {
            "@type": "Person",
            name: post.primary_author?.name,
            url: post.primary_author?.slug
              ? `${BASE_URL}/blog/author/${post.primary_author.slug}`
              : undefined,
          },
          publisher: {
            "@type": "Organization",
            "@id": `${BASE_URL}#organization`,
            name: "RateUp",
            url: BASE_URL,
            logo: { "@type": "ImageObject", url: rateupLogoOg },
          },
          keywords: post.tags?.map((tag: Tag) => tag.name).join(", ") || undefined,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
            { "@type": "ListItem", position: 3, name: post.title, item: url },
          ],
        },
      ],
    };

    return {
      meta: [
        // Must be a `meta` entry: TanStack never reads a top-level `title` key, which is why
        // every post rendered the blog index's title.
        { title: post.meta_title || post.title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow" },

        // OpenGraph
        { property: "og:type", content: "article" },
        { property: "og:title", content: post.og_title || post.title },
        { property: "og:description", content: post.og_description || description },
        { property: "og:image", content: image },
        { property: "og:url", content: url },
        { property: "article:published_time", content: post.published_at },
        { property: "article:modified_time", content: post.updated_at || post.published_at },

        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.twitter_title || post.title },
        { name: "twitter:description", content: post.twitter_description || description },
        { name: "twitter:image", content: post.twitter_image || image },

        { name: "author", content: post.primary_author?.name || undefined },
      ],

      links: [{ rel: "canonical", href: canonical }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
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
                <Link to="/blog/tag/$slug" params={{ slug: post.primary_tag.slug }}>
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
                  <Link to="/blog/author/$slug" params={{ slug: post.primary_author?.slug ?? "" }}>
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
                  {post.tags.map((tag: Tag) => (
                    <Link
                      key={tag.id}
                      to="/blog/tag/$slug"
                      params={{ slug: tag.slug }}
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
      <section className="mt-16 mb-20">
        <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(168deg,#061140_0%,#0C2383_42%,#1A52E8_78%,#2462FF_100%)] px-6 py-14 text-center text-white shadow-[0_20px_60px_rgba(8,24,120,0.35)] sm:px-12">
          {/* Soft glow behind the heading */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-ru-blue-400/30 blur-3xl"
          />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-100 uppercase backdrop-blur-sm">
              Get started free
            </span>
            <h2 className="font-nunito mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              Ready to improve your business reviews?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-blue-100/90">
              Join thousands of businesses using RateUp to enhance their online reputation.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#0C2383] shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(0,0,0,0.24)]"
              >
                Get Started
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  &rarr;
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
