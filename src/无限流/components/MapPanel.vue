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
.map-panel {
  width: 100%;
  max-width: 800px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #d4af37;
  border-radius: 8px;
}

.map-header {
  text-align: center;
  margin-bottom: 20px;

  h2 {
    color: #d4af37;
    font-size: 24px;
    margin: 0;
  }
}

.area-card {
  padding: 15px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #666666;
  border-radius: 4px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #d4af37;
    transform: translateY(-2px);
  }

  &.current {
    border-color: #ffd700;
    cursor: default;
  }
}

.area-name {
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 8px;
}

.area-description {
  color: #cccccc;
  font-size: 14px;
}
</style>
