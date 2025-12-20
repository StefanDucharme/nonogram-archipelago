<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

  const props = defineProps<{
    maxWidth?: string;
    maxHeight?: string;
  }>();

  const containerRef = ref<HTMLElement | null>(null);
  const contentRef = ref<HTMLElement | null>(null);

  // Scroll state
  const scrollLeft = ref(0);
  const scrollTop = ref(0);
  const containerWidth = ref(0);
  const containerHeight = ref(0);
  const contentWidth = ref(0);
  const contentHeight = ref(0);

  // Dragging state
  const isDraggingH = ref(false);
  const isDraggingV = ref(false);
  const dragStartX = ref(0);
  const dragStartY = ref(0);
  const dragStartScrollLeft = ref(0);
  const dragStartScrollTop = ref(0);

  // Computed: do we need scrollbars?
  const needsHorizontalScroll = computed(() => contentWidth.value > containerWidth.value + 2);
  const needsVerticalScroll = computed(() => contentHeight.value > containerHeight.value + 2);

  // Computed: scrollbar thumb sizes and positions
  const hThumbWidth = computed(() => {
    if (!needsHorizontalScroll.value) return 0;
    const ratio = containerWidth.value / contentWidth.value;
    return Math.max(50, containerWidth.value * ratio);
  });

  const hThumbLeft = computed(() => {
    if (!needsHorizontalScroll.value || contentWidth.value <= containerWidth.value) return 0;
    const scrollableWidth = contentWidth.value - containerWidth.value;
    const trackWidth = containerWidth.value - hThumbWidth.value;
    return (scrollLeft.value / scrollableWidth) * trackWidth;
  });

  const vThumbHeight = computed(() => {
    if (!needsVerticalScroll.value) return 0;
    const ratio = containerHeight.value / contentHeight.value;
    return Math.max(50, containerHeight.value * ratio);
  });

  const vThumbTop = computed(() => {
    if (!needsVerticalScroll.value || contentHeight.value <= containerHeight.value) return 0;
    const scrollableHeight = contentHeight.value - containerHeight.value;
    const trackHeight = containerHeight.value - vThumbHeight.value;
    return (scrollTop.value / scrollableHeight) * trackHeight;
  });

  function updateDimensions() {
    if (containerRef.value && contentRef.value) {
      containerWidth.value = containerRef.value.clientWidth;
      containerHeight.value = containerRef.value.clientHeight;
      contentWidth.value = contentRef.value.scrollWidth;
      contentHeight.value = contentRef.value.scrollHeight;
    }
  }

  function onScroll() {
    if (containerRef.value) {
      scrollLeft.value = containerRef.value.scrollLeft;
      scrollTop.value = containerRef.value.scrollTop;
    }
  }

  // Horizontal scrollbar drag
  function startHDrag(e: PointerEvent) {
    e.preventDefault();
    isDraggingH.value = true;
    dragStartX.value = e.clientX;
    dragStartScrollLeft.value = scrollLeft.value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onHDrag(e: PointerEvent) {
    if (!isDraggingH.value || !containerRef.value) return;
    e.preventDefault();

    const deltaX = e.clientX - dragStartX.value;
    const trackWidth = containerWidth.value - hThumbWidth.value;
    const scrollableWidth = contentWidth.value - containerWidth.value;
    const scrollDelta = (deltaX / trackWidth) * scrollableWidth;

    containerRef.value.scrollLeft = Math.max(0, Math.min(scrollableWidth, dragStartScrollLeft.value + scrollDelta));
  }

  function endHDrag(e: PointerEvent) {
    isDraggingH.value = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }

  // Vertical scrollbar drag
  function startVDrag(e: PointerEvent) {
    e.preventDefault();
    isDraggingV.value = true;
    dragStartY.value = e.clientY;
    dragStartScrollTop.value = scrollTop.value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onVDrag(e: PointerEvent) {
    if (!isDraggingV.value || !containerRef.value) return;
    e.preventDefault();

    const deltaY = e.clientY - dragStartY.value;
    const trackHeight = containerHeight.value - vThumbHeight.value;
    const scrollableHeight = contentHeight.value - containerHeight.value;
    const scrollDelta = (deltaY / trackHeight) * scrollableHeight;

    containerRef.value.scrollTop = Math.max(0, Math.min(scrollableHeight, dragStartScrollTop.value + scrollDelta));
  }

  function endVDrag(e: PointerEvent) {
    isDraggingV.value = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }

  // Track click to jump
  function onHTrackClick(e: MouseEvent) {
    if (!containerRef.value || e.target !== e.currentTarget) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const trackWidth = containerWidth.value - hThumbWidth.value;
    const scrollableWidth = contentWidth.value - containerWidth.value;
    const targetScroll = (clickX / trackWidth) * scrollableWidth;
    containerRef.value.scrollLeft = Math.max(0, Math.min(scrollableWidth, targetScroll - hThumbWidth.value / 2));
  }

  function onVTrackClick(e: MouseEvent) {
    if (!containerRef.value || e.target !== e.currentTarget) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = containerHeight.value - vThumbHeight.value;
    const scrollableHeight = contentHeight.value - containerHeight.value;
    const targetScroll = (clickY / trackHeight) * scrollableHeight;
    containerRef.value.scrollTop = Math.max(0, Math.min(scrollableHeight, targetScroll - vThumbHeight.value / 2));
  }

  let resizeObserver: ResizeObserver | null = null;

  onMounted(() => {
    updateDimensions();

    resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.value) {
      resizeObserver.observe(containerRef.value);
    }
    if (contentRef.value) {
      resizeObserver.observe(contentRef.value);
    }
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
  });

  // Watch for content changes
  watch([() => contentRef.value?.scrollWidth, () => contentRef.value?.scrollHeight], () => {
    updateDimensions();
  });
</script>

<template>
  <div class="scrollable-grid-wrapper">
    <!-- Main scrollable container (hidden native scrollbars) -->
    <div
      ref="containerRef"
      class="scrollable-grid-container"
      :style="{
        maxWidth: props.maxWidth || 'calc(100vw - 48px)',
        maxHeight: props.maxHeight || 'calc(100dvh - 160px)',
      }"
      @scroll="onScroll"
    >
      <div ref="contentRef" class="scrollable-grid-content">
        <slot />
      </div>
    </div>

    <!-- Custom horizontal scrollbar (below grid) -->
    <div v-if="needsHorizontalScroll" class="custom-scrollbar-h" :style="{ width: `${containerWidth}px` }" @click="onHTrackClick">
      <div
        class="custom-scrollbar-thumb-h"
        :style="{
          width: `${hThumbWidth}px`,
          left: `${hThumbLeft}px`,
        }"
        @pointerdown="startHDrag"
        @pointermove="onHDrag"
        @pointerup="endHDrag"
        @pointercancel="endHDrag"
      />
    </div>

    <!-- Custom vertical scrollbar (right of grid) -->
    <div v-if="needsVerticalScroll" class="custom-scrollbar-v" :style="{ height: `${containerHeight}px` }" @click="onVTrackClick">
      <div
        class="custom-scrollbar-thumb-v"
        :style="{
          height: `${vThumbHeight}px`,
          top: `${vThumbTop}px`,
        }"
        @pointerdown="startVDrag"
        @pointermove="onVDrag"
        @pointerup="endVDrag"
        @pointercancel="endVDrag"
      />
    </div>
  </div>
</template>

<style scoped>
  .scrollable-grid-wrapper {
    display: inline-flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
  }

  .scrollable-grid-container {
    overflow: auto;
    /* Hide native scrollbars */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .scrollable-grid-container::-webkit-scrollbar {
    display: none;
  }

  .scrollable-grid-content {
    display: inline-block;
    min-width: max-content;
  }

  /* Horizontal scrollbar track */
  .custom-scrollbar-h {
    height: 24px;
    background: #1f1f1f;
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    touch-action: none;
    flex-shrink: 0;
  }

  /* Horizontal scrollbar thumb */
  .custom-scrollbar-thumb-h {
    position: absolute;
    top: 3px;
    height: 18px;
    background: linear-gradient(180deg, #666 0%, #555 100%);
    border-radius: 9px;
    cursor: grab;
    touch-action: none;
    transition: background 0.15s;
  }

  .custom-scrollbar-thumb-h:hover,
  .custom-scrollbar-thumb-h:active {
    background: linear-gradient(180deg, #888 0%, #777 100%);
  }

  .custom-scrollbar-thumb-h:active {
    cursor: grabbing;
  }

  /* Vertical scrollbar - positioned to the right */
  .custom-scrollbar-v {
    position: absolute;
    right: -32px;
    top: 0;
    width: 24px;
    background: #1f1f1f;
    border-radius: 12px;
    cursor: pointer;
    touch-action: none;
  }

  /* Vertical scrollbar thumb */
  .custom-scrollbar-thumb-v {
    position: absolute;
    left: 3px;
    width: 18px;
    background: linear-gradient(90deg, #666 0%, #555 100%);
    border-radius: 9px;
    cursor: grab;
    touch-action: none;
    transition: background 0.15s;
  }

  .custom-scrollbar-thumb-v:hover,
  .custom-scrollbar-thumb-v:active {
    background: linear-gradient(90deg, #888 0%, #777 100%);
  }

  .custom-scrollbar-thumb-v:active {
    cursor: grabbing;
  }

  /* On desktop, hide custom scrollbars and use native */
  @media (min-width: 1025px) {
    .custom-scrollbar-h,
    .custom-scrollbar-v {
      display: none;
    }

    .scrollable-grid-container {
      scrollbar-width: auto;
      scrollbar-color: #525252 #262626;
    }

    .scrollable-grid-container::-webkit-scrollbar {
      display: block;
      width: 12px;
      height: 12px;
    }

    .scrollable-grid-container::-webkit-scrollbar-track {
      background: #262626;
      border-radius: 6px;
    }

    .scrollable-grid-container::-webkit-scrollbar-thumb {
      background: #525252;
      border-radius: 6px;
      border: 2px solid #262626;
    }

    .scrollable-grid-container::-webkit-scrollbar-thumb:hover {
      background: #737373;
    }
  }
</style>
