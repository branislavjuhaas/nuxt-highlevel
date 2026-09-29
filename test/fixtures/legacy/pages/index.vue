<script setup lang="ts">
const { todos } = useTodos()
</script>

<template>
  <TodoList :todos="todos" />
</template>
