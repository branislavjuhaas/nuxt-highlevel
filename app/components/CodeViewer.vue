<script setup lang="ts">
const { target } = useCodeViewer();
const { open: openInEditor } = useOpenInEditor();

const open = computed({
  get: () => Boolean(target.value),
  set: (value) => {
    if (!value) target.value = undefined;
  },
});

const html = ref<string>();
const error = ref<string>();
const code = useTemplateRef("code");

function scrollTo(line: number) {
  code.value?.querySelectorAll(".line")[line - 1]?.scrollIntoView({ block: "center" });
}

watch(target, async (value) => {
  html.value = undefined;
  error.value = undefined;
  if (!value) return;
  try {
    const result = await $fetch("/api/source", {
      query: { path: value.path, lines: value.lines.join(",") },
    });
    if (target.value !== value) return;
    html.value = result.html;
    await nextTick();
    if (value.lines[0]) scrollTo(value.lines[0]);
  } catch (e) {
    error.value = (e as { statusMessage?: string }).statusMessage ?? String(e);
  }
});
</script>

<template>
  <UModal
    v-model:open="open"
    :title="target?.path"
    :description="target?.names?.join(', ')"
    :ui="{ content: 'max-w-5xl', body: 'p-0 sm:p-0' }"
  >
    <template #body>
      <div v-if="error" class="p-4">
        <UAlert
          color="error"
          icon="i-lucide-circle-x"
          title="Could not load the file"
          :description="error"
        />
      </div>
      <div v-else-if="!html" class="flex h-40 items-center justify-center gap-2 text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        Loading…
      </div>
      <!-- eslint-disable vue/no-v-html -- shiki output of a local repo file -->
      <div
        v-else
        ref="code"
        class="code-view max-h-[70vh] overflow-auto py-3 font-mono text-xs leading-5"
        v-html="html"
      />
      <!-- eslint-enable vue/no-v-html -->
    </template>
    <template #footer>
      <div class="flex w-full flex-wrap items-center gap-1">
        <template v-if="target && target.lines.length > 1">
          <UButton
            v-for="line in target.lines"
            :key="line"
            :label="`Line ${line}`"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="scrollTo(line)"
          />
        </template>
        <UButton
          v-if="target"
          label="Open in editor"
          icon="i-lucide-square-pen"
          size="sm"
          class="ml-auto"
          @click="openInEditor(target.path, target.lines[0])"
        />
      </div>
    </template>
  </UModal>
</template>
