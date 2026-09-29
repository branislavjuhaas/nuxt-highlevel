<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@vue-flow/core";
import type { LayoutDirection } from "~/composables/useElkLayout";
import type { ViewEdge } from "~/utils/graph-view";

const props =
  defineProps<
    EdgeProps<ViewEdge & { selected: boolean; direction: LayoutDirection; backwards: boolean }>
  >();
const emit = defineEmits<{ select: [] }>();

/** Point on a cubic Bézier curve. */
function cubicAt(points: [number, number][], t: number): [number, number] {
  const [p0, p1, p2, p3] = points as [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ];
  const at = (i: 0 | 1) =>
    (1 - t) ** 3 * p0[i] +
    3 * (1 - t) ** 2 * t * p1[i] +
    3 * (1 - t) * t ** 2 * p2[i] +
    t ** 3 * p3[i];
  return [at(0), at(1)];
}

/** Edges pointing against the layout direction loop around the nodes' side instead of cutting through them. */
function backEdgePath(): [string, number, number] {
  const box = (node: typeof props.sourceNode) => ({ ...node.computedPosition, ...node.dimensions });
  const s = box(props.sourceNode);
  const t = box(props.targetNode);
  let points: [number, number][];
  if (props.data.direction === "DOWN") {
    const [sx, sy, tx, ty] = [s.x + s.width, s.y + s.height / 2, t.x + t.width, t.y + t.height / 2];
    const cx = Math.max(sx, tx) + 40 + Math.abs(sy - ty) * 0.25;
    points = [
      [sx, sy],
      [cx, sy],
      [cx, ty],
      [tx, ty],
    ];
  } else {
    const [sx, sy, tx, ty] = [s.x + s.width / 2, s.y + s.height, t.x + t.width / 2, t.y + t.height];
    const cy = Math.max(sy, ty) + 40 + Math.abs(sx - tx) * 0.25;
    points = [
      [sx, sy],
      [sx, cy],
      [tx, cy],
      [tx, ty],
    ];
  }
  const [p0, p1, p2, p3] = points.map(([x, y]) => `${x},${y}`);
  // Label off the middle, where forward edges put theirs.
  const [labelX, labelY] = cubicAt(points, 0.3);
  return [`M${p0} C${p1} ${p2} ${p3}`, labelX, labelY];
}

const cycleBreaker = computed(() => props.data.inCycle && props.data.backwards);
const path = computed(() => {
  if (props.data.backwards) return backEdgePath();
  const [d, x, y] = getBezierPath(props);
  return [d, x, y] as const;
});
const style = computed(() => edgeStyle(props.data, cycleBreaker.value));
const problem = computed(() => props.data.violations.length > 0 || cycleBreaker.value);
const showLabel = computed(() => props.data.count > 1 || problem.value || props.data.selected);
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-end="markerEnd"
    :interaction-width="16"
    :style="{
      ...style,
      opacity: data.selected ? 1 : 0.85,
      strokeWidth: style.strokeWidth + (data.selected ? 1.5 : 0),
    }"
  />
  <EdgeLabelRenderer>
    <div
      v-if="showLabel"
      class="nodrag nopan pointer-events-auto absolute"
      :style="{ transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)` }"
    >
      <UTooltip :text="edgeSummary(data)">
        <button
          class="flex cursor-pointer items-center gap-1 rounded-full border bg-default px-1.5 text-xs"
          :class="problem ? 'border-error text-error' : 'border-default text-muted'"
          @click="emit('select')"
        >
          <UIcon v-if="data.violations.length" name="i-lucide-triangle-alert" class="size-3" />
          <UIcon v-else-if="cycleBreaker" name="i-lucide-refresh-cw" class="size-3" />
          {{ data.count }}
        </button>
      </UTooltip>
    </div>
  </EdgeLabelRenderer>
</template>
