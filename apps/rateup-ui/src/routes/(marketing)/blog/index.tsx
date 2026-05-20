import { Avatar, Image } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";

import { getAuthors, getPosts, getTags } from "@/lib/posts.ts";
import Layout from "@/components/blog/Layout.tsx";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";

import PostGrid from "../../../components/(marketing)/blog/post-grid.tsx";

export const Route = createFileRoute("/(marketing)/blog/")({
  loader: async () => {
    const [posts, authors, tags] = await Promise.all([
      getPosts(),
      getAuthors(),
      getTags(),
    ]);

    return { posts, authors, tags };
  },
  component: BlogIndex,
});

export const revalidate = 60;
export const metadata = {
  alternates: {
    types: {
      "application/rss+xml": "/blog/rss.xml",
    },
  },
};

function Badge({
  children,
  className = "",
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function BlogIndex() {
  const { posts, authors, tags } = Route.useLoaderData();

  const featuredPost = posts?.[0];
  return (
    <Layout
      title="RateUp Blog"
      description="Latest insights on business reviews and customer feedback"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero section with featured post */}
        {featuredPost && (
          <section className="py-10 md:py-16">
            <PaperLayout p={0}>
              <div className="grid md:grid-cols-2">
                <div className="h-64 overflow-hidden md:h-auto">
                  {featuredPost.feature_image ? (
                    <Image
                      src={
                        featuredPost.feature_image ||
                        "https://via.placeholder.com/800x600/eee?text=RateUp+Blog"
                      }
                      alt={featuredPost.title}
                      className="h-full w-full object-cover"
                      loading="eager"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-200">
                      <span className="text-slate-400">No image</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center p-6 md:p-10">
                  {featuredPost?.primary_tag?.name && (
                    <Badge className="mb-3 self-start bg-blue-100 text-blue-700">
                      {featuredPost.primary_tag.name}
                    </Badge>
                  )}
                  <h1 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl">
                    {featuredPost.title}
                  </h1>
                  <p className="mb-6 text-slate-600">{featuredPost.excerpt}</p>
                  <div className="mb-6 flex items-center">
                    <Avatar
                      src={featuredPost?.primary_author?.profile_image}
                      name={featuredPost?.primary_author?.name}
                      color="initials"
                      size="md"
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-slate-900">
                        {featuredPost?.primary_author?.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {new Date(featuredPost.published_at).toLocaleDateString(
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
                  <Link
                    to={`/blog/${featuredPost.slug}`}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-center text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Read more
                    <svg
                      className="ml-2 -mr-1 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </PaperLayout>
          </section>
        )}

        {/* Tag & Author filter */}
        {(tags && tags.length > 0) || (authors && authors.length > 0) ? (
          <section className="py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-700">
                Browse Posts
              </h2>

              <a
                href="/blog/rss.xml"
                title="RSS Feed"
                className="text-slate-400 hover:text-orange-500 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
                </svg>
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm font-medium text-slate-700">
                Filter by tag:
              </span>
              <Link
                to={`/blog`}
                className={`rounded-full px-3 py-1 text-sm bg-blue-600 text-white`}
              >
                All
              </Link>
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/blog/tag/${encodeURIComponent(tag.slug)}`}
                  className={`rounded-full px-3 py-1 text-sm bg-slate-100 text-slate-800 hover:bg-slate-200`}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-700">
                Filter by author:
              </span>
              <Link
                to={`/blog`}
                className={`rounded-full px-3 py-1 text-sm ${"bg-blue-600 text-white"}`}
              >
                All
              </Link>
              {authors?.map((author) => (
                <Link
                  key={author.id}
                  to={`/blog/author/${encodeURIComponent(author.slug)}`}
                  className={`rounded-full px-3 py-1 text-sm ${
                    // activeAuthor === author.name
                    //   ? "bg-blue-600 text-white"
                    // :
                    "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {author.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Posts grid */}
        <PostGrid posts={posts} />

        {/* Top Authors */}
        <section className="py-10 pb-16">
          <h2 className="mb-8 text-2xl font-bold text-slate-900 pb-2">
            Our Authors
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {authors?.map((author) => (
              <Link
                to={`/blog/author/${encodeURIComponent(author.slug)}`}
                key={author.id}
              >
                <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <Avatar
                    name={author?.name}
                    src={author?.profile_image}
                    color="initials"
                    size="xl"
                    className="mb-4 h-20 w-20 rounded-full"
                  />
                  <div className="mb-1 text-lg font-semibold text-slate-900">
                    {author.name}
                  </div>
                  <div className="mb-4 line-clamp-2 text-sm text-slate-600">
                    {author.bio}
                  </div>
                  <div className="mt-auto flex space-x-3">
                    {author?.twitter && (
                      <a
                        href={`https://twitter.com/${author.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-500"
                      >
                        <span className="sr-only">Twitter</span>
                        <svg
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                        </svg>
                      </a>
                    )}
                    {author?.website && (
                      <a
                        href={author?.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-500"
                      >
                        <span className="sr-only">Website</span>
                        <svg
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm10 12c0 .685-.07 1.354-.202 2h-3.853c.121-1.295.178-2.622.156-4h4.031c-.232-2.474-1.229-4.721-2.809-6.481l-2.854 2.854c.531.826.972 1.798 1.304 3.627h-3.545c-.203-1.064-.418-2.052-.647-2.948-.23-.896-.484-1.685-.774-2.364-.276-.661-.594-1.201-.953-1.62-.365-.419-.797-.752-1.302-.997-.504.245-.937.578-1.302.997-.358.419-.676.959-.952 1.62-.291.679-.545 1.468-.775 2.364-.229.896-.444 1.884-.647 2.948h-3.544c.336-1.829.777-2.801 1.304-3.627l-2.854-2.854c-1.58 1.759-2.578 4.007-2.809 6.481h4.031c-.021 1.378.035 2.705.157 4h-3.854c-.132-.646-.202-1.315-.202-2 0-.685.07-1.354.203-2h3.977c-.036-1.259-.122-2.555-.26-3.865-.142-1.36-.354-2.587-.641-3.675l.009-.003c1.912-1.382 4.223-2.213 6.722-2.32.472.069.929.174 1.378.304-.217.868-.403 1.96-.557 3.257-.154 1.297-.24 2.595-.261 3.865h3.98c.132.646.203 1.315.203 2zm-11.641 6.697c.974-.492 1.793-1.139 2.462-1.953.664-.81 1.199-1.778 1.608-2.887.409-1.108.726-2.35.945-3.706.219-1.355.328-2.826.33-4.398-.036-.753-.098-1.478-.184-2.174-.84.06-1.645.208-2.392.421l.006.013c-.844.315-1.587.79-2.204 1.404-.624.598-1.129 1.329-1.511 2.198-.383.868-.675 1.874-.889 3.012-.214 1.138-.329 2.419-.344 3.822-.015 1.404.075 2.7.271 3.882.196 1.184.497 2.209.9 3.089.403.879.91 1.539 1.518 1.982.584.43 1.265.71 2 .839.42-.669.751-1.473.99-2.408.236-.935.36-1.99.369-3.176.011-1.201-.079-2.479-.27-3.797-.192-1.318-.499-2.613-.924-3.874-.426-1.261-.962-2.383-1.615-3.345-.653-.964-1.473-1.708-2.462-2.227 1.2-.753 2.517-1.286 3.945-1.555 1.296-.243 2.648-.277 4.037-.079-.82-.448-1.696-.818-2.612-1.118-.916-.298-1.879-.459-2.883-.459-1.768 0-3.443.423-4.926 1.169.035.011.07.023.105.034-.474.582-.882 1.325-1.226 2.225-.345.901-.614 1.936-.811 3.104-.198 1.168-.332 2.456-.405 3.85-.073 1.395-.073 2.876 0 4.428.073 1.551.23 3.004.473 4.351.241 1.347.581 2.524 1.017 3.529.436 1.006.965 1.748 1.589 2.221l.009.011c-1.313-.697-2.47-1.605-3.396-2.677-.926-1.07-1.681-2.293-2.278-3.637-.593-1.344-1.036-2.783-1.325-4.308-.289-1.525-.431-3.106-.431-4.734 0-1.627.142-3.209.431-4.734.289-1.525.732-2.964 1.325-4.308.593-1.344 1.348-2.568 2.262-3.653.914-1.084 2.072-2.007 3.438-2.723 1.351-.725 2.802-1.184 4.337-1.376 1.534-.193 3.062-.16 4.576.121 1.513.281 2.937.778 4.258 1.477 1.322.699 2.486 1.631 3.517 2.75 1.033 1.118 1.785 2.36 2.276 3.686.49 1.326.733 2.735.733 4.208 0 1.628-.142 3.209-.431 4.734-.289 1.525-.732 2.964-1.325 4.308-.597 1.344-1.352 2.567-2.278 3.637-.926 1.072-2.083 2-3.396 2.677.624-.473 1.152-1.215 1.589-2.221.436-1.005.776-2.182 1.017-3.529.241-1.347.399-2.8.473-4.351.073-1.552.073-3.033 0-4.428-.073-1.394-.208-2.682-.405-3.85-.197-1.168-.467-2.203-.811-3.104-.344-.9-.752-1.643-1.226-2.225.033-.011.07-.023.105-.034-1.483-.746-3.158-1.169-4.926-1.169-1.004 0-1.967.161-2.883.459-.916.3-1.792.67-2.612 1.118 1.388-.198 2.74-.164 4.037.079 1.428.269 2.745.802 3.945 1.555-.989.519-1.809 1.263-2.463 2.227-.652.962-1.189 2.084-1.614 3.345-.425 1.261-.731 2.556-.924 3.874-.191 1.318-.281 2.596-.27 3.797.01 1.186.134 2.241.369 3.176.238.935.57 1.739.99 2.408.734-.128 1.415-.409 1.999-.839z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
