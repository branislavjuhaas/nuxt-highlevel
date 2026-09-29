import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { dirname, join } from "pathe";
import { discoverWorkspace } from "./workspace";

const run = promisify(execFile);

/** The target's own Nuxt CLI, so the registry matches its Nuxt version. */
function nuxtBin(dir: string): string | undefined {
  try {
    const pkgFile = createRequire(join(dir, "package.json")).resolve("nuxt/package.json");
    const pkg = JSON.parse(readFileSync(pkgFile, "utf8")) as {
      bin?: string | Record<string, string>;
    };
    const entry = typeof pkg.bin === "string" ? pkg.bin : (pkg.bin?.nuxt ?? pkg.bin?.nuxi);
    return entry ? join(dirname(pkgFile), entry) : undefined;
  } catch {
    return undefined;
  }
}

/** Our own Nuxt/Nitro env would leak into the target's Nuxt. */
function cleanEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^(?:_*NUXT|NITRO|NUXI)/i.test(key)),
  );
}

/**
 * Runs `nuxi prepare` in every app of the target repo that has Nuxt installed, so `.nuxt/` is fresh.
 * Layers and modules borrow the registry of their app. Returns warnings for failed runs.
 */
export async function prepareApps(root: string): Promise<string[]> {
  const { packages } = discoverWorkspace(root);
  const warnings: string[] = [];
  for (const app of packages.filter((p) => p.kind === "app")) {
    const bin = nuxtBin(app.dir);
    if (!bin) continue;
    try {
      await run(process.execPath, [bin, "prepare"], {
        cwd: app.dir,
        env: cleanEnv(),
        timeout: 120_000,
      });
    } catch (error) {
      const { stderr, message } = error as { stderr?: string; message: string };
      const detail = (stderr?.trim() || message).split("\n").filter(Boolean).at(-1);
      warnings.push(
        `${app.relDir}: nuxi prepare failed, using the existing .nuxt/ if any. ${detail}`,
      );
    }
  }
  return warnings;
}
