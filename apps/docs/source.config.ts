import { defineDocs } from "fumadocs-mdx/config";
// import { remarkImage } from "fumadocs-core/mdx-plugins";

export const docs = defineDocs({
  dir: "src/content/docs",
});

// export default defineConfig({
//   mdxOptions: {
//     remarkPlugins: [
//       [
//         remarkImage,
//         {
//           publicDir: "https://djd7kjh9uwow0.cloudfront.net",
//         },
//       ],
//     ],
//   },
// });
