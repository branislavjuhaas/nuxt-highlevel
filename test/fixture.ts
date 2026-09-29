import { fileURLToPath } from "node:url";

export const fixtureRoot = fileURLToPath(new URL("./fixtures/mono", import.meta.url));
export const standaloneFixtureRoot = fileURLToPath(
  new URL("./fixtures/standalone", import.meta.url),
);
export const starterFixtureRoot = fileURLToPath(new URL("./fixtures/starter", import.meta.url));
export const legacyFixtureRoot = fileURLToPath(new URL("./fixtures/legacy", import.meta.url));
