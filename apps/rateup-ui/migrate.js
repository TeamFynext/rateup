// migrateDashboard.js
const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "pages");

function processDir(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let modified = false;

      // 1. Replace router import
      const replacedContent = content.replace(
        /import\s+\{\s*useRouter\s*\}\s+from\s+["']next\/router["'];?/g,
        `import { useRouter } from "next/navigation";`,
      );
      if (replacedContent !== content) {
        content = replacedContent;
        modified = true;
      }

      // 2. Add "use client" if a hook is detected
      const hasHook = /\buse[A-Z]\w*\b/.test(content); // matches useSomething
      const hasUseClient = /^\s*["']use client["'];?/m.test(content);

      if (hasHook && !hasUseClient) {
        content = `"use client";\n\n` + content.trimStart();
        modified = true;
        console.log(`⚡ Added "use client" to: ${fullPath}`);
      }

      // Save updates if needed
      if (modified) {
        fs.writeFileSync(fullPath, content, "utf8");
        console.log(`🔄 Updated: ${fullPath}`);
      }

      // 3. Rename index.tsx → page.tsx
      if (entry.name === "index.tsx") {
        const newPath = path.join(dir, "page.tsx");
        fs.renameSync(fullPath, newPath);
        console.log(`📄 Renamed: ${fullPath} → ${newPath}`);
      }
    }
  });
}

processDir(baseDir);
console.log(
  "✅ Migration complete: renamed files, updated imports, and added 'use client' where needed.",
);
