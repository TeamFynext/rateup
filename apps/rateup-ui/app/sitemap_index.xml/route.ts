import { NextResponse } from "next/server";

// cache test
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
  try {
    const sitemaps = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/blog/sitemap.xml`,
      `${baseUrl}/blog/author/sitemap.xml`,
      `${baseUrl}/blog/tag/sitemap.xml`,
    ];

    const sitemapIndexXML = await buildSitemapIndex(sitemaps);

    return new NextResponse(sitemapIndexXML, {
      headers: {
        "Content-Type": "application/xml",
        "Content-Length": Buffer.byteLength(sitemapIndexXML).toString(),
      },
    });
  } catch (error) {
    console.error("Error generating sitemap index:", error);
    return NextResponse.error();
  }
}

async function buildSitemapIndex(sitemaps) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  for (const sitemapURL of sitemaps) {
    xml += "<sitemap>";
    xml += `<loc>${sitemapURL}</loc>`;
    xml += `<lastmod>${new Date().toISOString()}</lastmod>`;
    xml += "</sitemap>";
  }

  xml += "</sitemapindex>";
  return xml;
}
