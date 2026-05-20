import blogRedirects from "./redirects-blog.ts";
import pageRedirects from "./redirects-pages.ts";

const redirects = [...blogRedirects, ...pageRedirects];

export default redirects;
