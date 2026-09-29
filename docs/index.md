---
layout: home

hero:
  name: "Nuxt Highlevel"
  text: "Architecture visibility for Nuxt monorepos and apps"
  tagline: Drill down from apps, layers, modules, and packages all the way to individual files with auto-import and tier rule intelligence.
  image:
    src: /screenshot-file-graph.png
    alt: "Nuxt Highlevel file graph: folders of a standalone app with dependency edges to sibling layers and modules"
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: View CLI Reference
      link: /reference/cli

features:
  - title: 🏗️ Multi-Tier Architecture
    details: Automatically categorize packages into base, feature, and app tiers with customizable rules and instant violation detection.
  - title: ⚡ Auto-Import Intelligence
    details: Trace implicit auto-import edges across Nuxt layers and internal modules by inspecting generated registries in .nuxt/.
  - title: 🔍 Drillable File Graph
    details: Seamlessly transition from high-level package topologies down to individual files, surface areas, and lines of code.
  - title: 🚨 Cycle & Violation Detection
    details: Spot circular dependencies and architecture boundary violations immediately with red-highlighted edges and warning badges.
  - title: 🖥️ Modern Interactive UI
    details: Powered by Nuxt 4, Vue Flow, and ELK.js layout with keyboard navigation, quick search (Cmd+K), and direct editor launching.
  - title: 🚀 Fast CLI & Nitro API
    details: Run instantly via zero-config CLI or integrate with the robust Nitro server API backend for programmatic analysis.
---
