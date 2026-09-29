# nuxt-highlevel

## Short Description

Architecture view of Nuxt (mono)repos: apps, layers, modules, packages, down to files

## Main Features

- Interactive architecture visualization of Nuxt applications, layers, modules, and packages.
- Detailed view down to individual files within the project.
- Support for monorepos, allowing analysis of multiple Nuxt projects within a single repository.
- Command-line interface (CLI) for analyzing projects and generating architecture graphs.
- Web-based UI for exploring the architecture graphically.
- Real-time updates during development (via HMR for the UI).

## Technology Stack

- Nuxt.js
- Vue.js
- Vue Flow
- Elk.js
- Tailwind CSS
- Iconify
- VitePress (for docs)
- ESLint
- TypeScript

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-repo/nuxt-highlevel.git
    cd nuxt-highlevel
    ```

2.  **Install dependencies (using pnpm):**

    ```bash
    pnpm install
    ```

3.  **Development Server:**

    ```bash
    pnpm run dev
    ```

    This will start the development server, and you can access the application in your browser.

4.  **Build for Production:**

    ```bash
    pnpm run build
    ```

5.  **Preview Production Build:**

    ```bash
    pnpm run preview
    ```

6.  **Run CLI:**
    ```bash
    pnpm nuxt-highlevel
    ```
    Or, if installed globally:
    ```bash
    nuxt-highlevel
    ```

## Required Configuration

The following environment variables can be set:

- `NUXT_HIGHLEVEL_PORT`: Port for the development server (default: `3000`)
- `NUXT_HIGHLEVEL_HOST`: Host for the development server (default: `localhost`)

Configuration for the CLI can be found in `nuxt.config.ts` or `app.config.ts` for the Nuxt application. The CLI also supports a `.highlevelrc` file for project-specific configurations.

## AI Tools or AI Services Used

This project does not currently use any specific AI tools or services.

## Known Limitations

- Initial load time for large repositories might be slow due to extensive file parsing.
- Complex dependency structures might not always be visualized optimally.
- Currently, primarily focused on Nuxt 3+ architecture. Older Nuxt versions might have limited support.
- CLI output can be verbose for very large projects.
