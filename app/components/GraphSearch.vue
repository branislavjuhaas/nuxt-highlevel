<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from "@nuxt/ui";
import type { GraphIndex } from "~/utils/graph-view";

const props = defineProps<{ index: GraphIndex }>();
const emit = defineEmits<{ select: [id: string] }>();
const open = defineModel<boolean>("open", { default: false });

const GROUPS = [
  { id: "package", label: "Packages" },
  { id: "area", label: "Areas" },
  { id: "file", label: "Files" },
] as const;

const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() =>
  GROUPS.map((group) => ({
    ...group,
    items: props.index.model.nodes
      .filter((node) => node.kind === group.id)
      .map((node) => ({
        label: node.label,
        suffix: node.path,
        icon: nodeIcon(node),
        onSelect: () => {
          open.value = false;
          emit("select", node.id);
        },
      })),
  })),
);
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-2xl' }">
    <template #content>
      <UCommandPalette
        :groups="groups"
        :fuse="{ resultLimit: 30, fuseOptions: { keys: ['label', 'suffix'] } }"
        placeholder="Find a package, area or file…"
        close
        class="h-96"
        @update:open="open = $event"
      />
    </template>
  </UModal>
</template>
