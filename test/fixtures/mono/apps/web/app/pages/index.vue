<script setup lang="ts">
import { formatPrice } from "@mono/utils";

const { total } = useCart();
const foo = useFoo();
</script>

<template>
  <main>
    <PromoBanner />
    <ProductList />
    <TreeNode :depth="0" />
    <p>{{ formatPrice(total) }} {{ foo }}</p>
  </main>
</template>
