<template>
  <div v-if="component" class="space-y-3">
    <DeviceTabs v-model="editMode" />

    <!-- Content (desktop only) -->
    <PropertySection v-if="editMode === 'desktop'" title="Content">
      <!-- Video URL -->
      <div>
        <label class="block text-xs font-medium text-(--md-text-muted) mb-1"
          >Video URL</label
        >
        <InputText
          ref="srcInputRef"
          class="w-full"
          placeholder="https://vimeo.com/... or {{ video_url }}"
          @click="trackCursor('src', $event)"
          @keyup="trackCursor('src', $event)"
          :model-value="component.props.src"
          @update:model-value="onSrcInput"
        />
        <PreviewBadge
          :active="linkTagPreviewActive"
          :resolved="resolvedSrc"
          :raw="component.props.src"
        />
        <p class="text-xs text-(--md-text-subtle) mt-1">
          Supports YouTube, Vimeo, or direct video links
        </p>
      </div>

      <!-- Fallback Link -->
      <div>
        <label class="block text-xs font-medium text-(--md-text-muted) mb-1">
          Fallback Link
          <span class="font-normal text-(--md-text-subtle)"
            >(YouTube, Vimeo, or any URL)</span
          >
        </label>
        <InputText
          ref="fallbackInputRef"
          class="w-full"
          placeholder="https://youtube.com/watch?v=... or {{ fallback_link }}"
          @click="trackCursor('fallbackLink', $event)"
          @keyup="trackCursor('fallbackLink', $event)"
          :model-value="component.props.fallbackLink"
          @update:model-value="onFallbacklinkInput"
        />
        <PreviewBadge
          :active="linkTagPreviewActive"
          :resolved="resolvedFallbackLink"
          :raw="component.props.fallbackLink"
        />
      </div>

      <!-- Cover Image -->
      <div>
        <label class="block text-xs font-medium text-(--md-text-muted) mb-1">
          Cover Image URL
          <span class="font-normal text-(--md-text-subtle)">(optional)</span>
        </label>
        <InputText
          ref="coverInputRef"
          class="w-full"
          placeholder="https://example.com/thumbnail.jpg or {{ cover_image }}"
          @click="trackCursor('coverImage', $event)"
          @keyup="trackCursor('coverImage', $event)"
          :model-value="component.props.coverImage"
          @update:model-value="onCoverImageInput"
        />
        <PreviewBadge
          :active="linkTagPreviewActive"
          :resolved="resolvedCoverImage"
          :raw="component.props.coverImage"
        />
        <p class="text-xs text-(--md-text-subtle) mt-1">
          Email clients cannot play video — a cover image with a play button
          will be shown as a fallback.
        </p>
      </div>

      <!-- Alt Text -->
      <div>
        <label class="block text-xs font-medium text-(--md-text-muted) mb-1"
          >Alt Text</label
        >
        <InputText
          ref="altInputRef"
          class="w-full"
          placeholder="Watch video or {{ video_title }}"
          @click="trackCursor('alt', $event)"
          @keyup="trackCursor('alt', $event)"
          :model-value="component.props.alt"
          @update:model-value="onAltInput"
        />
        <PreviewBadge
          :active="linkTagPreviewActive"
          :resolved="resolvedAlt"
          :raw="component.props.alt"
        />
      </div>

      <LinkFieldMergeTags
        :last-focused-field="lastFocusedField"
        :default-tags="videoDefaultTags"
        :available-fields="['src', 'fallbackLink', 'coverImage', 'alt']"
        :field-labels="{
          src: 'Video URL',
          fallbackLink: 'Fallback Link',
          coverImage: 'Cover Image',
          alt: 'Alt Text',
        }"
        @insert="handleTagInsert"
        @focus="lastFocusedField = $event"
      />
    </PropertySection>

    <!-- Layout -->
    <PropertySection title="Layout">
      <PropertyNumberSlider
        label="Width (%)"
        :model-value="displayValue('width')"
        :min="8"
        :max="100"
        :step="1"
        unit="%"
        :is-overridden="isOverridden('width')"
        @update:model-value="setProp('width', $event)"
        @reset="resetProp('width')"
      />
      <BorderRadiusControl
        label="Border Radius (px)"
        :model-value="displayValue('borderRadius')"
        :is-overridden="isOverridden('borderRadius')"
        @update:model-value="setProp('borderRadius', $event)"
        @reset="resetProp('borderRadius')"
      />
      <PropertyAlignment
        :model-value="displayValue('align')"
        :is-overridden="isOverridden('align')"
        @update:model-value="setProp('align', $event)"
        @reset="resetProp('align')"
      />
    </PropertySection>

    <!-- Border -->
    <PropertySection title="Border">
      <BorderControl
        :model-value="displayValue('border')"
        :desktop-value="component.props.border"
        :is-mobile-edit="editMode === 'mobile'"
        :is-overridden="isBorderOverridden()"
        @update:model-value="setProp('border', $event)"
        @reset="resetBorder"
      />
    </PropertySection>

    <!-- Spacing -->
    <PropertySection title="Spacing">
      <SpacingControl
        label="Margin"
        :model-value="
          editMode === 'mobile'
            ? component.props.mobile.margin
            : component.props.margin
        "
        :desktop-value="component.props.margin"
        :is-mobile-edit="editMode === 'mobile'"
        @update:model-value="onSpacingUpdate('margin', $event)"
      />
      <SpacingControl
        label="Padding"
        :model-value="
          editMode === 'mobile'
            ? component.props.mobile.padding
            : component.props.padding
        "
        :desktop-value="component.props.padding"
        :is-mobile-edit="editMode === 'mobile'"
        @update:model-value="onSpacingUpdate('padding', $event)"
      />
    </PropertySection>

    <PropertyVisibility :visibility="component.props.visibility" />

    <PropertySection
      :title="editMode === 'desktop' ? 'Desktop Settings' : 'Mobile Settings'"
    >
      <PropertyToggle
        v-if="editMode === 'desktop'"
        label="Hide on Desktop"
        description="Block will hide on screens ≥600px"
        :model-value="component.props.desktopHide"
        @update:model-value="toggleDesktopHide"
      />
      <PropertyToggle
        v-else
        label="Hide on Mobile"
        description="Block will hide on screens ≤600px"
        :model-value="component.props.mobileHide"
        @update:model-value="toggleMobileHide"
      />
    </PropertySection>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useEmailBuilder } from "@/composables/emailBuilder/core/useEmailBuilder";
import { useComponentStyleEditor } from "@/composables/emailBuilder/components/useComponentStyleEditor";
import { useLinkTagInsert } from "@/composables/emailBuilder/core/link-tags/useLinkTagInsert";
import { resolveString } from "@/composables/emailBuilder/core/merge-tags/mergeTagDefinitions";

import InputText from "@/components/ui/primitives/InputText.vue";

import OverrideBadge from "./shared/OverrideBadge.vue";
import DeviceTabs from "./shared/DeviceTabs.vue";
import LinkFieldMergeTags from "./shared/LinkFieldMergeTags.vue";
import PreviewBadge from "./shared/PreviewBadge.vue";
import PropertySection from "./ui/PropertySection.vue";
import PropertyNumberSlider from "./ui/PropertyNumberSlider.vue";
import BorderRadiusControl from "./ui/BorderRadiusControl.vue";
import BorderControl from "./ui/BorderControl.vue";
import PropertyAlignment from "./ui/PropertyAlignment.vue";
import PropertyToggle from "./ui/PropertyToggle.vue";
import PropertyVisibility from "./ui/PropertyVisibility.vue";
import SpacingControl from "./ui/SpacingControl.vue";

// ─── Store ────────────────────────────────────────────────────────────────────

const {
  rows,
  findComponent,
  selectedId,
  previewMode,
  saveToHistory,
  linkTagPreviewContext,
  linkTagPreviewActive,
} = useEmailBuilder();

const component = computed(() => {
  // Reactive dep on tree so this computed re-evaluates after structural ops
  // (drag-drop, undo/redo) which can swap the node reference under our ID.
  void rows.value;
  return findComponent(selectedId.value);
});

// Writable computed — always in sync with the global preview mode, no watcher needed.
type EditMode = "desktop" | "mobile";

const editMode = computed<EditMode>({
  get: () => previewMode.value as EditMode,
  set: (v: EditMode) => {
    previewMode.value = v;
  },
});

const {
  displayValue,
  isOverridden,
  setProp,
  resetProp,
  isBorderOverridden,
  resetBorder,
  toggleDesktopHide,
  toggleMobileHide,
} = useComponentStyleEditor(component, editMode);

// ─── Props mutation handlers (each calls saveToHistory) ─────────────────

const onSrcInput = (value: string) => {
  component.value.props.src = value.trim();
  saveToHistory("video-src");
};

const onFallbacklinkInput = (value: string) => {
  component.value.props.fallbackLink = value.trim();
  saveToHistory("video-fallbacklink");
};

const onCoverImageInput = (value: string) => {
  component.value.props.coverImage = value.trim();
  saveToHistory("video-cover-image");
};

const onAltInput = (value: string) => {
  component.value!.props.alt = value.trim();
  saveToHistory("video-alt");
};

// ─── Merge tag insert ─────────────────────────────────────────────────────────

const srcInputRef = ref<any>(null);
const fallbackInputRef = ref<any>(null);
const coverInputRef = ref<any>(null);
const altInputRef = ref<any>(null);

const {
  lastFocusedField,
  trackCursor,
  handleTagInsert: _handleTagInsert,
} = useLinkTagInsert(component, "src");

const handleTagInsert = (payload: { tag: string; default?: string }) =>
  _handleTagInsert(payload, {
    src: srcInputRef.value,
    fallbackLink: fallbackInputRef.value,
    coverImage: coverInputRef.value,
    alt: altInputRef.value,
  });

// ─── Live resolved values ─────────────────────────────────────────────────────

const resolve = (val: string) =>
  resolveString(
    val ?? "",
    linkTagPreviewContext.value,
    linkTagPreviewActive.value,
  );

const resolvedSrc = computed(() => resolve(component.value?.props?.src));
const resolvedAlt = computed(() => resolve(component.value?.props?.alt));
const resolvedFallbackLink = computed(() =>
  resolve(component.value?.props?.fallbackLink),
);
const resolvedCoverImage = computed(() =>
  resolve(component.value?.props?.coverImage),
);

// ─── Spacing update with history ──────────────────────────────────────────────

const onSpacingUpdate = (field: "margin" | "padding", value: any) => {
  if (editMode.value === "mobile") {
    component.value!.props.mobile[field] = value;
  } else {
    component.value!.props[field] = value;
  }
  saveToHistory(`set-${field}`);
};

// ─── Options ──────────────────────────────────────────────────────────────────

const videoDefaultTags = [
  "video_url",
  "fallback_link",
  "cover_image",
  "video_title",
  "promo_link",
];
</script>
