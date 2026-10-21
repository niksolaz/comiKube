import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  typescript: {
    strict: true
  },
  // Package locali del monorepo: da transpilare (Vite) e non esternalizzare in SSR
  build: {
    transpile: ['@comikube/shared']
  },
  ssr: {
    noExternal: ['@comikube/shared']
  }
})