# Server API

Nuxt Highlevel is powered by a Nitro backend server providing a clean REST API for graph analysis and editor integration.

## Endpoints

### `GET /api/graph`

Returns the complete architecture graph model (`GraphModel`) for the analyzed repository.

**Response Structure (`GraphModel`)**:
```ts
{
  root: string              // Absolute path to the analyzed repo
  repoName: string          // Repository name
  nodes: GraphNode[]        // Array of repo, package, area, and file nodes
  edges: GraphEdge[]        // Array of import, auto, dependency, extends, module edges
  rules: TierRule[]         // Active tier rules
  rulesSource: 'default' | 'nuxt-highlevel.json'
  cycles: string[][]        // File-level dependency cycles (arrays of file IDs)
  warnings: string[]        // Analysis warnings
  generatedAt: string       // ISO timestamp
}
```

---

### `POST /api/refresh`

Forces re-analysis of the target repository (clearing the in-memory cache) and returns the updated `GraphModel`.

---

### `POST /api/open`

Opens a file or path in your local editor using `launch-editor`.

**Request Body**:
```json
{
  "path": "path/to/file.ts",
  "line": 10,
  "column": 5
}
```
*(Editor preference respects `NUXT_EDITOR` environment variable or the `--editor` CLI flag).*
