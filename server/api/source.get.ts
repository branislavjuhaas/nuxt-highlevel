import { readFile } from "node:fs/promises";

export default defineEventHandler(async (event) => {
  const { path, lines } = getQuery(event);
  const file = repoFile(path);
  const highlight = (typeof lines === "string" ? lines : "")
    .split(",")
    .map(Number)
    .filter(Number.isInteger);
  // Without the final newline, which would render as an extra empty line.
  const code = (await readFile(file, "utf8")).replace(/\r?\n$/, "");
  return { html: await highlightSource(file, code, highlight) };
});
