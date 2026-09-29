<script setup lang="ts">
import { MarkerType, VueFlow, useVueFlow, type Edge, type Node } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import type { GraphView, ViewEdge, ViewNode } from "~/utils/graph-view";
import type { LayoutDirection, LayoutResult } from "~/composables/useElkLayout";

const props = defineProps<{
  view: GraphView;
  selectedId?: string;
}>();

const emit = defineEmits<{
  select: [id: string];
  selectEdge: [edge: ViewEdge];
  activate: [id: string];
  clear: [];
}>();

const container = useTemplateRef("container");
const size = useElementSize(container);
const { layout } = useElkLayout();
const { fitView, updateNodeInternals } = useVueFlow("graph");

const NODE_HEIGHT = 64;
const nodeWidth = (label: string) => Math.min(320, Math.max(210, label.length * 8 + 130));

const positions = shallowRef(new Map<string, { x: number; y: number }>());
const boxes = shallowRef<LayoutResult["boxes"]>(new Map());
const direction = ref<LayoutDirection>("RIGHT");
const laidOut = ref(false);

// Layout only when the structure changes, not on selection.
const structure = computed(() =>
  [
    props.view.nodes.map((n) => n.node.id).join(","),
    props.view.edges.map((e) => e.id).join(","),
  ].join("|"),
);

/** Ghosts go to the sides: users of this level before it, dependencies after it. */
function partition(view: GraphView["nodes"][number]) {
  if (!view.ghost) return 1;
  const usesInside = props.view.edges.some((e) => e.source === view.node.id);
  const usedByInside = props.view.edges.some((e) => e.target === view.node.id);
  return usesInside && !usedByInside ? 0 : 2;
}

/** Ghosts are boxed by the outside node they belong to, one box per side. */
const boxOf = (view: ViewNode) => view.group && `box:${view.group.id}@${partition(view)}`;

watchDebounced(
  [structure, () => size.width.value > 0],
  async () => {
    if (!size.width.value) return;
    const result = await layout(
      {
        nodes: props.view.nodes.map((n) => ({
          id: n.node.id,
          width: nodeWidth(n.node.label),
          height: NODE_HEIGHT,
          partition: partition(n),
          box: boxOf(n),
        })),
        edges: props.view.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      },
      { width: size.width.value, height: size.height.value },
    );
    positions.value = result.positions;
    boxes.value = result.boxes;
    direction.value = result.direction;
    laidOut.value = true;
    await nextTick();
    // Handles move when the direction flips, Vue Flow caches their positions.
    updateNodeInternals(props.view.nodes.map((n) => n.node.id));
    await nextTick();
    fitView({ padding: 0.15, maxZoom: 1.2 });
  },
  { debounce: 30, immediate: true },
);

// Boxes come first, Vue Flow wants parents before their children.
const nodes = computed<Node[]>(() => {
  const boxNodes = new Map<string, Node>();
  for (const view of props.view.nodes) {
    const id = boxOf(view);
    const box = id && boxes.value.get(id);
    if (!box || boxNodes.has(id)) continue;
    boxNodes.set(id, {
      id,
      type: "box",
      position: { x: box.x, y: box.y },
      width: box.width,
      height: box.height,
      selectable: false,
      draggable: false,
      focusable: false,
      data: { label: view.group!.label },
    });
  }
  return [
    ...boxNodes.values(),
    ...props.view.nodes.map((view) => {
      const box = boxOf(view);
      return {
        id: view.node.id,
        type: "graph",
        position: positions.value.get(view.node.id) ?? { x: 0, y: 0 },
        width: nodeWidth(view.node.label),
        parentNode: box && boxNodes.has(box) ? box : undefined,
        data: { ...view, direction: direction.value, selected: view.node.id === props.selectedId },
      };
    }),
  ];
});

/** Canvas position, boxed nodes are positioned relative to their box. */
function absolute(id: string) {
  const at = positions.value.get(id);
  const view = props.view.nodes.find((n) => n.node.id === id);
  const box = view && boxes.value.get(boxOf(view) ?? "");
  return at && box ? { x: at.x + box.x, y: at.y + box.y } : at;
}

/** Points against the layout direction, i.e. ELK had to reverse it to break a cycle. */
function isBackwards(edge: ViewEdge) {
  const source = absolute(edge.source);
  const target = absolute(edge.target);
  if (!source || !target) return false;
  return direction.value === "DOWN" ? target.y < source.y : target.x < source.x;
}

const edges = computed<Edge[]>(() =>
  props.view.edges.map((edge) => {
    const backwards = isBackwards(edge);
    // In a cycle, only the back-edges are flagged: they are the ones to cut.
    const color = edgeStyle(edge, edge.inCycle && backwards).stroke;
    return {
      id: edge.id,
      type: "graph",
      source: edge.source,
      target: edge.target,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 28,
        height: 28,
        markerUnits: "userSpaceOnUse",
      },
      data: {
        ...edge,
        selected: edge.id === props.selectedId,
        direction: direction.value,
        backwards,
      },
    };
  }),
);
</script>

<template>
  <div ref="container" class="relative size-full">
    <VueFlow
      id="graph"
      :nodes="nodes"
      :edges="edges"
      :nodes-connectable="false"
      :min-zoom="0.1"
      :zoom-on-double-click="false"
      :class="{ invisible: !laidOut }"
      @node-click="({ node }) => (node.type === 'box' ? emit('clear') : emit('select', node.id))"
      @node-double-click="({ node }) => node.type !== 'box' && emit('activate', node.id)"
      @edge-click="({ edge }) => emit('selectEdge', edge.data)"
      @pane-click="emit('clear')"
    >
      <template #node-graph="nodeProps">
        <GraphNodeCard :data="nodeProps.data" />
      </template>
      <template #node-box="boxProps">
        <div
          class="size-full rounded-xl border border-dashed border-accented bg-elevated/40"
          :style="{ padding: `10px ${BOX_PADDING.side}px` }"
        >
          <div class="truncate text-xs font-medium text-muted">
            {{ boxProps.data.label }}
          </div>
        </div>
      </template>
      <template #edge-graph="edgeProps">
        <GraphEdgeLine v-bind="edgeProps" @select="emit('selectEdge', edgeProps.data)" />
      </template>
      <Background :gap="24" />
      <Controls :show-interactive="false" position="top-left" />
      <MiniMap v-if="view.nodes.length > 12" pannable zoomable position="bottom-right" />
    </VueFlow>
  </div>
</template>
