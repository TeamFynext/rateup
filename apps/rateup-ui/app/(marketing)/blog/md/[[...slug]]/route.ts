import { getMarkdownContent } from "@/lib/content";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;

  const slugPath = slug?.join("/") ?? "";

  console.log("Slug:", slugPath);

  const content = await getMarkdownContent(slugPath);

  if (!content) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
}
