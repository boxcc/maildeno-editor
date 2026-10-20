<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-(--md-text-muted)">
        {{ modelValue.sides ? "Individual sides" : "All sides" }}
        <OverrideBadge :show="isOverridden" />
      </span>
      <div class="flex items-center gap-3">
        <button
          type="button"
          :aria-label="
            modelValue.sides
              ? 'Use top border for all sides'
              : 'Set each border separately'
          "
          :title="
            modelValue.sides
              ? 'Use top border for all sides'
              : 'Set each border separately'
          "
          :aria-pressed="!modelValue.sides"
          class="w-7 h-7 flex items-center justify-center text-(--md-text-subtle) hover:text-(--md-selection) hover:bg-(--md-surface-hover) rounded-md transition-colors"
          @click="$emit('update:modelValue', toggleBorderMode(modelValue))"
        >
          <Icon
            :name="modelValue.sides ? 'lock-open' : 'lock'"
            style="font-size: 13px"
          />
        </button>
        <button
          v-if="isOverridden"
          type="button"
          class="text-xs text-(--md-selection-fg) hover:opacity-80"
          @click="$emit('reset')"
        >
          ↩ Reset
        </button>
      </div>
    </div>
    <div
      v-for="side in visibleSides"
      :key="side"
      class="space-y-3"
      :class="{ 'border-t border-(--md-border) pt-3': modelValue.sides }"
    >
      <h4
        v-if="modelValue.sides"
        class="text-xs font-medium text-(--md-text-muted) capitalize"
      >
        {{ side }}
      </h4>
      <PropertyNumberSlider
        :is-overridden="fieldOverridden(side, 'width')"
        @reset="setSide(side, 'width', desktopSides[side].width)"
        label="Width"
        :model-value="values[side].width"
        :min="0"
        :max="max"
        :step="1"
        unit="px"
        @update:model-value="setSide(side, 'width', $event)"
      />
      <div class="grid grid-cols-2 gap-3">
        <div v-for="field in ['color', 'style'] as const" :key="field">
          <div class="flex items-center justify-between mb-1.5">
            <label
              class="flex items-center gap-1.5 text-xs font-medium text-(--md-text-muted) capitalize"
            >
              {{ field }} <OverrideBadge :show="fieldOverridden(side, field)" />
            </label>
            <button
              v-if="fieldOverridden(side, field)"
              type="button"
              class="text-[11px] text-(--md-selection-fg) hover:opacity-80"
              @click="setSide(side, field, desktopSides[side][field])"
            >
              ↩ Reset
            </button>
          </div>
          <PropertyColor
            v-if="field === 'color'"
            bare
            show-input
            :model-value="values[side].color"
            @update:model-value="setSide(side, 'color', $event)"
          />
          <Select
            v-else
            :model-value="values[side].style"
            :options="styleOptions"
            option-label="label"
            option-value="value"
            class="w-full text-sm capitalize"
            @update:model-value="setStyle(side, $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/components/ui/Icon.vue";
import {
  borderDirections,
  borderSides,
  toggleBorderMode,
  type BorderDirection,
  type BorderSide,
  type BorderValue,
} from "@/utils/border";
import OverrideBadge from "../shared/OverrideBadge.vue";
import PropertyNumberSlider from "./PropertyNumberSlider.vue";
import PropertyColor from "./PropertyColor.vue";
import Select from "@/components/ui/primitives/Select.vue";

const props = withDefaults(
  defineProps<{
    modelValue: BorderValue;
    desktopValue?: BorderValue;
    isMobileEdit?: boolean;
    max?: number;
    isOverridden?: boolean;
  }>(),
  { max: 10, isOverridden: false },
);
const emit = defineEmits<{
  (event: "update:modelValue", value: BorderValue): void;
  (event: "reset"): void;
}>();
const values = computed(() => borderSides(props.modelValue));
const desktopSides = computed(() => borderSides(props.desktopValue));
const fieldOverridden = (side: BorderDirection, key: keyof BorderSide) =>
  !!props.isMobileEdit &&
  values.value[side][key] !== desktopSides.value[side][key];
const visibleSides = computed(() =>
  props.modelValue.sides ? borderDirections : (["top"] as const),
);
const styleOptions = [
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" },
];

function setStyle(side: BorderDirection, value: unknown) {
  if (typeof value === "string") setSide(side, "style", value);
}

function setSide<K extends keyof BorderSide>(
  side: BorderDirection,
  key: K,
  value: BorderSide[K],
) {
  const border = props.modelValue;
  emit(
    "update:modelValue",
    border.sides
      ? {
          ...border,
          sides: {
            ...values.value,
            [side]: { ...values.value[side], [key]: value },
          },
        }
      : { ...border, [key]: value },
  );
}
</script>
