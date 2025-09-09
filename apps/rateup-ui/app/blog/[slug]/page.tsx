import type { Metadata } from "next";
import Link from "next/link";

import { Avatar, Image } from "@mantine/core";

import { getSinglePost } from "@/lib/posts";
import Layout from "@/components/blog/Layout";
import NothingFound from "@/components/NothingFound/NothingFound";

type Props = {
  params: Promise<{ slug: string }>;
};

// Dynamic metatags
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getSinglePost(slug);
  return {
    title: post?.meta_title || post?.title,
    description: post?.meta_description || post?.excerpt,
    openGraph: {
      title: post?.og_title || post?.meta_title || post?.title,
      description:
        post?.og_description || post?.meta_description || post?.excerpt,
      images: post?.og_image || post?.feature_image,
      url: post?.canonical_url || post?.url,
    },
    twitter: {
      title: post?.twitter_title || post?.meta_title || post?.title,
      description:
        post?.twitter_description || post?.meta_description || post?.excerpt,
      images: post?.twitter_image || post?.feature_image,
      card: "summary_large_image",
    },
    alternates: {
      canonical: post?.canonical_url || post?.url,
    },
    authors: {
      name: post?.primary_author?.name,
    },
  };
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

// Main page export
export default async function Page({ params }: Readonly<Props>) {
  const { slug } = await params;
  const post = await getSinglePost(slug);
  if (!post)
    return (
      <div className="h-screen">
        <NothingFound text="Post not found" />;
      </div>
    );
  return (
    <Layout
      title={post.title}
      description={post.meta_description || post.excerpt}
    >
      <article>
        {/* Hero section with featured image */}
        {post.feature_image && (
          <div className="relative h-64 w-full bg-slate-900 sm:h-96 lg:h-[500px]">
            <Image
              src={post.feature_image}
              alt={post.feature_image_alt || post.title}
              className="h-full w-full object-cover opacity-80"
            />
            {post.feature_image_caption && (
              <div className="absolute bottom-0 right-0 bg-slate-900 bg-opacity-75 p-2 text-xs text-white">
                {post.feature_image_caption}
              </div>
            )}
          </div>
        )}

        {/* Post content */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Post header */}
          <header className="py-8 md:py-12">
            {post.primary_tag && (
              <div className="mb-4">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                  {post.primary_tag?.name}
                </span>
              </div>
            )}
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              {post.title}
            </h1>
            <div className="mt-6 flex items-center">
              <Avatar
                src={post.primary_author?.profile_image}
                name={post.primary_author?.name}
                color="initials"
                size="md"
                className="mr-4"
              />
              <div>
                <div className="font-medium text-slate-900">
                  {post.primary_author?.name}
                </div>
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
            </div>
          </header>

          {/* Post body */}
          <div className="pb-16">
            <PostContent html={post.html} />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 border-t border-slate-200 pt-8">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/blog?tag=${tag.slug}`}
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
                <Avatar
                  src={post.primary_author?.profile_image}
                  name={post.primary_author?.name}
                  color="initials"
                  size="xl"
                  className="mb-4 h-20 w-20 rounded-full sm:mb-0 sm:mr-6"
                />
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
                    href={`/blog/${relatedPost.slug}`}
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
            Join thousands of businesses using RateUp to enhance their online
            reputation.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/login"
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

export const dynamic = "force-static";
