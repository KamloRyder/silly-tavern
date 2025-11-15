<template>
  <div class="map-panel">
    <div class="map-header">
      <h2>地图</h2>
      <div v-if="instanceStore.currentInstance" class="instance-name">
        {{ instanceStore.currentInstance.name }}
      </div>
    </div>

    <div v-if="instanceStore.currentArea" class="current-area">
      <h3>当前位置</h3>
      <div class="area-card current">
        <div class="area-name">{{ instanceStore.currentArea.name }}</div>
        <div v-if="instanceStore.currentArea.description" class="area-description">
          {{ instanceStore.currentArea.description }}
        </div>
      </div>
    </div>

    <div v-if="instanceStore.connectedAreas.length > 0" class="connected-areas">
      <h3>可前往的区域</h3>
      <div class="areas-list">
        <div
          v-for="area in instanceStore.connectedAreas"
          :key="area.id"
          class="area-card"
          :class="{ discovered: area.isDiscovered }"
          @click="moveToArea(area)"
        >
          <div class="area-name">
            {{ area.isDiscovered ? area.name : '???' }}
          </div>
          <div v-if="area.isDiscovered && area.description" class="area-description">
            {{ area.description }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { streamService } from '../services/streamService';
import { useInstanceStore } from '../stores/instanceStore';
import type { Area } from '../types/instance';

const instanceStore = useInstanceStore();
const isMoving = ref(false);

async function moveToArea(area: Area): Promise<void> {
  if (isMoving.value) return;

  if (area.id === instanceStore.currentArea?.id) {
    toastr.info('你已经在这个区域了');
    return;
  }

  try {
    isMoving.value = true;
    await instanceStore.updatePlayerLocation(area.id);

    if (!area.isDiscovered) {
      await instanceStore.discoverArea(area.id);
    }

    await streamService.generateAreaEvent(area.name);
  } catch (error) {
    console.error('[Map Panel] 移动失败:', error);
    toastr.error('移动失败');
  } finally {
    isMoving.value = false;
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.map-panel {
  @include modal-container;
  width: 100%;
  max-width: 800px;
}

.map-header {
  text-align: center;
  margin-bottom: $spacing-lg;

  @include mobile {
    margin-bottom: $spacing-md;
  }

  h2 {
    @include modal-title;
    margin: 0;
    margin-bottom: $spacing-xs;
  }
}

.instance-name {
  font-size: $font-size-base;
  color: $color-text-secondary;

  @include mobile {
    font-size: $font-size-sm;
  }
}

.current-area,
.connected-areas {
  margin-bottom: $spacing-lg;

  @include mobile {
    margin-bottom: $spacing-md;
  }

  h3 {
    font-size: $font-size-lg;
    color: $color-text-gold;
    margin-bottom: $spacing-md;

    @include mobile {
      font-size: $font-size-base;
      margin-bottom: $spacing-sm;
    }
  }
}

.areas-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.area-card {
  padding: $spacing-md;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid $color-border-dark;
  border-radius: $border-radius-md;
  cursor: pointer;
  transition: all $transition-fast;

  @include mobile {
    padding: $spacing-sm;
    border-width: 1px;
  }

  &:hover {
    border-color: $color-border-gold;
    transform: translateY(-2px);
    box-shadow: $shadow-gold;
  }

  &.current {
    border-color: $color-primary-gold;
    cursor: default;
    background: rgba(212, 175, 55, 0.1);

    &:hover {
      transform: none;
    }
  }

  &.discovered {
    border-color: $color-border-gold;
  }
}

.area-name {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;

  @include mobile {
    font-size: $font-size-base;
  }
}

.area-description {
  color: $color-text-secondary;
  font-size: $font-size-sm;
  line-height: 1.5;

  @include mobile {
    font-size: $font-size-xs;
  }
}
</style>
