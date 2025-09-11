import React from "react";
import Link from "next/link";

import { Avatar, Badge, Image } from "@mantine/core";

import { Post } from "@/lib/posts";

export default function PostGrid({
  posts,
  activeTag,
  activeAuthor,
}: Readonly<{
  posts: Post[];
  activeTag?: string;
  activeAuthor?: string;
}>) {
  return (
    <section className="py-10">
      <h2
        className="mb-8 text-2xl font-bold text-slate-900 pb-2"
        style={{
          fontWeight: 800,
        }}
      >
        {activeAuthor && `Posts by ${activeAuthor}`}
        {activeTag && `Posts tagged with ${activeTag}`}
        {!activeTag && !activeAuthor && "Latest Articles"}
      </h2>
      {(activeTag || activeAuthor) && (
        <div className="mb-8 text-sm text-slate-600">
          A collection of {posts?.length ?? 0} posts
        </div>
      )}
      {posts.length === 0 ? (
        <div className="py-10 text-center text-slate-600">
          No posts found for the selected tag.
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow"
            >
              <Link
                href={`/blog/${post.slug}`}
                className="block overflow-hidden"
              >
                <div className="aspect-video overflow-hidden bg-slate-100">
                  {post.feature_image ? (
                    <Image
                      src={post.feature_image}
                      alt=""
                      className="h-full w-full transform object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-200">
                      <span className="text-slate-400">No image</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {post?.primary_tag?.name && (
                    <Badge className="mb-2 self-start bg-blue-100 text-blue-700">
                      {post.primary_tag.name}
                    </Badge>
                  )}
                  <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-slate-900">
                    {post.title}
                  </h3>
                  <p className="mb-4 line-clamp-2 text-sm text-slate-600">
                    {post.excerpt}
                  </p>
                  <div className="mt-auto flex items-center">
                    <Avatar
                      name={post?.primary_author?.name}
                      src={post?.primary_author?.profile_image}
                      color="initials"
                      className="mr-3"
                    />
                    <div className="text-xs text-slate-600">
                      <span className="font-medium text-slate-900">
                        {post?.primary_author?.name}
                      </span>
                      <div>
                        {new Date(post.published_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
