<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <label
        class="flex items-center gap-1.5 text-xs font-medium text-(--md-text-muted)"
      >
        {{ label }}
        <OverrideBadge :show="isOverridden" />
      </label>
      <div class="flex items-center gap-3">
        <button
          type="button"
          :aria-label="
            separate
              ? 'Use one radius for all corners'
              : 'Set each corner separately'
          "
          :aria-pressed="!separate"
          :title="
            separate
              ? 'Use one radius for all corners'
              : 'Set each corner separately'
          "
          class="w-7 h-7 flex items-center justify-center text-(--md-text-subtle) hover:text-(--md-selection) hover:bg-(--md-surface-hover) rounded-md transition-colors"
          @click="toggleMode"
        >
          <Icon
            :name="separate ? 'lock-open' : 'lock'"
            style="font-size: 13px"
          />
        </button>
        <button
          v-if="isOverridden"
          type="button"
          class="text-[11px] text-(--md-selection-fg) hover:opacity-80 transition-colors"
          @click="$emit('reset')"
        >
          ↩ Reset
        </button>
      </div>
    </div>
    <div v-if="separate" class="grid grid-cols-2 gap-3">
      <PropertyNumberSlider
        v-for="corner in corners"
        :key="corner.key"
        class="corner-input"
        :label="corner.label"
        :model-value="values[corner.key]"
        :min="0"
        :max="max"
        unit="px"
        @update:model-value="setCorner(corner.key, $event)"
      />
    </div>
    <PropertyNumberSlider
      v-else
      label="All corners"
      :model-value="values.topLeft"
      :min="0"
      :max="max"
      unit="px"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/components/ui/Icon.vue";
import {
  radiusCorners,
  type BorderRadius,
  type RadiusCorners,
} from "@/utils/borderRadius";
import OverrideBadge from "../shared/OverrideBadge.vue";
import PropertyNumberSlider from "./PropertyNumberSlider.vue";

const props = withDefaults(
  defineProps<{
    modelValue?: BorderRadius;
    label?: string;
    max?: number;
    isOverridden?: boolean;
  }>(),
  { modelValue: 0, label: "Border Radius (px)", max: 100, isOverridden: false },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: BorderRadius): void;
  (e: "reset"): void;
}>();

const corners: { key: keyof RadiusCorners; label: string }[] = [
  { key: "topLeft", label: "Top left" },
  { key: "topRight", label: "Top right" },
  { key: "bottomLeft", label: "Bottom left" },
  { key: "bottomRight", label: "Bottom right" },
];
const separate = computed(() => typeof props.modelValue === "object");
const values = computed(() => radiusCorners(props.modelValue));

function toggleMode() {
  emit(
    "update:modelValue",
    separate.value ? values.value.topLeft : values.value,
  );
}

function setCorner(corner: keyof RadiusCorners, value: number) {
  emit("update:modelValue", { ...values.value, [corner]: Math.max(0, value) });
}
</script>

<style scoped>
.corner-input :deep(input[type="range"]) {
  display: none;
}
</style>
