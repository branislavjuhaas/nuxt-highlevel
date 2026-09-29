<script setup lang="ts">
defineProps<{ todos: { title: string; done: boolean }[] }>();
</script>

<template>
  <ul>
    <li v-for="todo in todos" :key="todo.title">{{ checkbox(todo.done) }} {{ todo.title }}</li>
  </ul>
</template>
