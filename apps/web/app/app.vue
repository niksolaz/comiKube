<script setup lang="ts">
import { DEFAULT_FREE_DAILY_CREDITS, ROLES } from '@comikube/shared'

const ruoli = ROLES.join(', ')
</script>

<template>
  <main>
    <h1>comiKube — web</h1>
    <p>Workbench: genesi del tool di storyboard.</p>
    <p>Ruoli supportati: {{ ruoli }}</p>
    <p>Crediti AI giornalieri gratuiti (provvisorio): {{ DEFAULT_FREE_DAILY_CREDITS }}</p>
  </main>
</template>