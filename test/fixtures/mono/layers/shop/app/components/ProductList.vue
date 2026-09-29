<script setup lang="ts">
import { formatPrice } from "@mono/utils";

const theme = useTheme();
const prices = [10, 20];
</script>

<template>
  <ul :class="theme">
    <li v-for="price in prices" :key="price">
      {{ formatPrice(price) }}
    </li>
  </ul>
</template>
