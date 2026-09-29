import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Nuxt Highlevel',
  description: 'Architecture view of Nuxt (mono)repos: apps, layers, modules and packages down to files',
  lang: 'en-US',
  cleanUrls: true,
  themeConfig: {
    logo: '/favicon.ico',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Reference', link: '/reference/cli' },
      { text: 'Development', link: '/development/' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Getting Started', link: '/guide/getting-started' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Tiers & Rules', link: '/guide/tiers-and-rules' },
            { text: 'Auto-Imports & Registries', link: '/guide/auto-imports' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'CLI Usage', link: '/reference/cli' },
            { text: 'Server API', link: '/reference/api' },
            { text: 'Analyzer Architecture', link: '/reference/architecture' }
          ]
        }
      ],
      '/development/': [
        {
          text: 'Development',
          items: [
            { text: 'Contributing & Testing', link: '/development/' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/nuxt-highlevel/nuxt-highlevel' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Nuxt Highlevel'
    },
    search: {
      provider: 'local'
    }
  }
})
