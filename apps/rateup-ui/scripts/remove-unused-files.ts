import { existsSync, readdirSync, rmdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

function removeEmptyDirs(dir: string) {
  if (!existsSync(dir)) return;

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    if (statSync(fullPath).isDirectory()) {
      removeEmptyDirs(fullPath);
    }
  }

  const remaining = readdirSync(dir);

  if (remaining.length === 0) {
    rmdirSync(dir);
    console.log(`Deleted empty directory: ${dir}`);
  }
}

removeEmptyDirs(resolve(process.cwd(), "src"));
