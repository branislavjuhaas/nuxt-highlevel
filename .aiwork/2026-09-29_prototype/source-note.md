## Use cases

- visualize main parts of the app
- visualize relationships between apps, nuxt modules, nuxt layers, node packages
- visualize lower level dependencies between components
- allows for high level view and dig deeper into particular parts
- allows to overview good practices like dependency direction, deep modules, clean architecture etc.
- should work with monorepos, might contain multiple apps, the repo might be split into internal Node package
- have a way to connect actual files to graph nodes

## Typical issues with current tools

- not all dependencies are covered (auto imports, or otherwise hidden)
- visualization is not useful, too small, very wide or tall
- badly named nodes on graphs, like whole paths in the name
- too many choices in the UI
- too much configuration needed
- no grouping or other way to understand the high level meaning of modules

## Resources

- https://research.lukastrumm.com/nuxt-dependency-visualization/
- Nuxt DevTools → Components → Graph
- https://github.com/antoine-coulon/skott
