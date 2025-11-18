<template>
  <div class="character-creator">
    <div class="creator-header">
      <h2 class="creator-title">{{ editingCharacter ? '编辑角色' : '角色创建' }}</h2>
      <p class="creator-subtitle">根据 COC7 规则{{ editingCharacter ? '编辑' : '创建' }}你的角色</p>
    </div>

    <div class="creator-content">
      <!-- 基本信息 -->
      <section class="section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">姓名 *</label>
            <input v-model="formData.name" type="text" class="form-input" placeholder="输入角色姓名" />
          </div>

          <div class="form-group">
            <label class="form-label">年龄</label>
            <input
              v-model.number="formData.age"
              type="number"
              class="form-input"
              placeholder="输入年龄"
              min="15"
              max="90"
            />
          </div>

          <div class="form-group">
            <label class="form-label">职业</label>
            <select v-model="selectedOccupation" class="form-select" @change="handleOccupationChange">
              <option value="">选择职业</option>
              <option v-for="occupation in occupations" :key="occupation" :value="occupation">
                {{ occupation }}
              </option>
            </select>
          </div>

          <div v-if="selectedOccupation === '其他'" class="form-group">
            <label class="form-label">自定义职业名称</label>
            <input v-model="customOccupation" type="text" class="form-input" placeholder="输入职业名称" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">背景故事</label>
          <textarea
            v-model="formData.background"
            class="form-textarea"
            placeholder="输入角色的背景故事..."
            rows="3"
          ></textarea>
        </div>
      </section>

      <!-- COC7 属性 -->
      <section class="section">
        <div class="section-header">
          <h3 class="section-title">COC7 属性</h3>
          <button class="btn-secondary" @click="randomizeAttributes">
            <span class="btn-icon">🎲</span>
            随机生成
          </button>
        </div>

        <div class="attributes-grid">
          <div v-for="(_, key) in formData.attributes" :key="key" class="attribute-item">
            <label class="attribute-label">{{ getAttributeName(key) }}</label>
            <input
              v-model.number="formData.attributes[key]"
              type="number"
              class="attribute-input"
              min="0"
              max="100"
              @input="calculateDerived"
            />
          </div>
        </div>
      </section>

      <!-- 衍生属性 -->
      <section class="section">
        <h3 class="section-title">衍生属性（自动计算）</h3>
        <div class="derived-stats">
          <div class="stat-item">
            <span class="stat-label">生命值 (HP)</span>
            <span class="stat-value">{{ derivedStats.HP }} / {{ derivedStats.maxHP }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">魔法值 (MP)</span>
            <span class="stat-value">{{ derivedStats.MP }} / {{ derivedStats.maxMP }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">理智值 (SAN)</span>
            <span class="stat-value">{{ derivedStats.SAN }} / {{ derivedStats.maxSAN }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">移动力 (MOV)</span>
            <span class="stat-value">{{ derivedStats.MOV }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">伤害加值 (DB)</span>
            <span class="stat-value">{{ derivedStats.DB }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">体格 (BUILD)</span>
            <span class="stat-value">{{ derivedStats.BUILD }}</span>
          </div>
        </div>
      </section>

      <!-- 技能点分配 -->
      <section v-if="showSkills" class="section">
        <h3 class="section-title">技能点分配</h3>
        <div class="skills-info">
          <p class="info-text">
            职业技能点:
            <span class="points-value" :class="{ 'points-negative': remainingOccupationalPoints < 0 }">
              {{ remainingOccupationalPoints }} / {{ occupationalPoints }}
            </span>
          </p>
          <p class="info-text">
            兴趣技能点:
            <span class="points-value" :class="{ 'points-negative': remainingInterestPoints < 0 }">
              {{ remainingInterestPoints }} / {{ interestPoints }}
            </span>
          </p>
        </div>

        <div class="skills-grid">
          <div v-for="skill in selectedSkills" :key="skill.name" class="skill-item">
            <label class="skill-label">{{ skill.name }}</label>
            <input v-model.number="skill.value" type="number" class="skill-input" min="0" max="100" />
            <select v-model="skill.pointType" class="skill-type-select">
              <option value="occupational">职业点</option>
              <option value="interest">兴趣点</option>
            </select>
            <button class="btn-remove" @click="removeSkill(skill.name)">×</button>
          </div>
        </div>

        <div class="add-skill">
          <input
            v-model="newSkillName"
            type="text"
            class="form-input"
            placeholder="输入技能名称"
            @keyup.enter="addSkill"
          />
          <button class="btn-secondary" @click="addSkill">添加技能</button>
        </div>
      </section>
    </div>

    <!-- 操作按钮 -->
    <div class="creator-actions">
      <button class="btn-primary" :disabled="!isValid" @click="create">
        {{ editingCharacter ? '保存修改' : syncToTavern ? '创建并同步到酒馆' : '创建角色' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { mvuService } from '../services/mvuService';
import { tavernService } from '../services/tavernService';
import { useCharacterStore } from '../stores/characterStore';
import type { COC7Attributes, NPCCharacter, PlayerCharacter } from '../types/character';
import { calculateDerivedStats, generateRandomAttributes } from '../utils/coc7Rules';

// ==================== Props ====================
interface Props {
  syncToTavern?: boolean; // 是否同步到酒馆用户角色
  characterType?: 'player' | 'npc'; // 角色类型
  showSkills?: boolean; // 是否显示技能分配
  editingCharacter?: any; // 正在编辑的角色
}

const props = withDefaults(defineProps<Props>(), {
  syncToTavern: true,
  characterType: 'player',
  showSkills: true,
  editingCharacter: undefined,
});

// ==================== Emits ====================
const emit = defineEmits<{
  created: [character: PlayerCharacter | NPCCharacter];
}>();

// ==================== Store ====================
const characterStore = useCharacterStore();

// ==================== 状态 ====================
const formData = reactive({
  name: '',
  age: undefined as number | undefined,
  occupation: '',
  background: '',
  attributes: {
    STR: 50,
    CON: 50,
    SIZ: 50,
    DEX: 50,
    APP: 50,
    INT: 50,
    POW: 50,
    EDU: 50,
    LUK: 50,
  } as COC7Attributes,
});

const selectedSkills = ref<{ name: string; value: number; pointType: 'occupational' | 'interest' }[]>([]);
const newSkillName = ref('');
const selectedOccupation = ref('');
const customOccupation = ref('');

// 职业列表
const occupations = [
  '侦探',
  '记者',
  '医生',
  '教授',
  '警察',
  '士兵',
  '艺术家',
  '作家',
  '律师',
  '商人',
  '工程师',
  '科学家',
  '神秘学家',
  '冒险家',
  '其他',
];

// ==================== 计算属性 ====================
const derivedStats = computed(() => {
  return calculateDerivedStats(formData.attributes);
});

const isValid = computed(() => {
  const hasName = formData.name.trim().length > 0;
  const hasValidOccupation = selectedOccupation.value !== '其他' || customOccupation.value.trim().length > 0;
  return hasName && hasValidOccupation && skillPointsValid.value;
});

// 职业技能点 = EDU × 4
const occupationalPoints = computed(() => {
  return formData.attributes.EDU * 4;
});

// 兴趣技能点 = INT × 2
const interestPoints = computed(() => {
  return formData.attributes.INT * 2;
});

// 已使用的职业技能点
const usedOccupationalPoints = computed(() => {
  return selectedSkills.value
    .filter(skill => skill.pointType === 'occupational')
    .reduce((sum, skill) => sum + skill.value, 0);
});

// 已使用的兴趣技能点
const usedInterestPoints = computed(() => {
  return selectedSkills.value
    .filter(skill => skill.pointType === 'interest')
    .reduce((sum, skill) => sum + skill.value, 0);
});

// 剩余职业技能点
const remainingOccupationalPoints = computed(() => {
  return occupationalPoints.value - usedOccupationalPoints.value;
});

// 剩余兴趣技能点
const remainingInterestPoints = computed(() => {
  return interestPoints.value - usedInterestPoints.value;
});

// 技能点是否有效
const skillPointsValid = computed(() => {
  return remainingOccupationalPoints.value >= 0 && remainingInterestPoints.value >= 0;
});

// ==================== 方法 ====================

/**
 * 获取属性中文名称
 */
function getAttributeName(key: string): string {
  const names: Record<string, string> = {
    STR: '力量',
    CON: '体质',
    SIZ: '体型',
    DEX: '敏捷',
    APP: '外貌',
    INT: '智力',
    POW: '意志',
    EDU: '教育',
    LUK: '幸运',
  };
  return names[key] || key;
}

/**
 * 随机生成属性
 */
function randomizeAttributes(): void {
  const randomAttrs = generateRandomAttributes('3d6x5');
  Object.assign(formData.attributes, randomAttrs);
  calculateDerived();
  toastr.success('属性已随机生成');
}

/**
 * 计算衍生属性（触发响应式更新）
 */
function calculateDerived(): void {
  // 衍生属性通过 computed 自动计算，这里只是触发更新
}

/**
 * 处理职业选择变化
 */
function handleOccupationChange(): void {
  if (selectedOccupation.value === '其他') {
    formData.occupation = '';
  } else {
    formData.occupation = selectedOccupation.value;
    customOccupation.value = '';
  }
}

/**
 * 添加技能
 */
function addSkill(): void {
  const skillName = newSkillName.value.trim();
  if (!skillName) {
    toastr.warning('请输入技能名称');
    return;
  }

  if (selectedSkills.value.some(s => s.name === skillName)) {
    toastr.warning('该技能已存在');
    return;
  }

  selectedSkills.value.push({ name: skillName, value: 20, pointType: 'occupational' });
  newSkillName.value = '';
}

/**
 * 移除技能
 */
function removeSkill(skillName: string): void {
  selectedSkills.value = selectedSkills.value.filter(s => s.name !== skillName);
}

/**
 * 创建角色
 */
async function create(): Promise<void> {
  if (!isValid.value) {
    if (!skillPointsValid.value) {
      toastr.error('技能点分配超出限制，请检查职业点和兴趣点');
    } else if (selectedOccupation.value === '其他' && !customOccupation.value.trim()) {
      toastr.error('请输入自定义职业名称');
    } else {
      toastr.error('请填写必填项');
    }
    return;
  }

  try {
    // 使用自定义职业名称（如果选择了"其他"）
    if (selectedOccupation.value === '其他') {
      formData.occupation = customOccupation.value.trim();
    }

    // 使用现有ID或生成新ID
    const characterId = props.editingCharacter?.id || `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 构建技能 Map
    const skillsMap = new Map<string, number>();
    selectedSkills.value.forEach(skill => {
      skillsMap.set(skill.name, skill.value);
    });

    // 初始化肢体状态
    const bodyParts = initializeBodyParts();

    // 构建角色数据
    const baseCharacter = {
      id: characterId,
      name: formData.name,
      age: formData.age,
      occupation: formData.occupation || undefined,
      background: formData.background || undefined,
      attributes: { ...formData.attributes },
      derivedStats: { ...derivedStats.value },
      skills: skillsMap,
      bodyParts,
      inventory: [],
    };

    let character: PlayerCharacter | NPCCharacter;

    if (props.characterType === 'player') {
      character = {
        ...baseCharacter,
        type: 'player',
      };
    } else {
      character = {
        ...baseCharacter,
        type: 'npc',
        affection: 50,
        isImportant: false,
        events: [],
      };
    }

    // 保存到 MVU
    await mvuService.saveCharacter(character);

    // 根据选项决定是否同步到酒馆
    if (props.syncToTavern && props.characterType === 'player') {
      await tavernService.updateUserCharacter(character);
    }

    // 更新 store
    if (props.characterType === 'player') {
      await characterStore.setPlayer(character as PlayerCharacter);

      // 自动生成现实世界地图（仅在创建新角色时，非编辑模式）
      if (!props.editingCharacter) {
        try {
          const { realWorldMapService } = await import('../services/realWorldMapService');
          const hasMap = await realWorldMapService.hasMap();

          if (!hasMap) {
            console.log('[CharacterCreator] 开始生成现实世界地图...');
            await realWorldMapService.generateMap(character as PlayerCharacter);
          }
        } catch (error) {
          console.error('[CharacterCreator] 生成现实世界地图失败:', error);
          // 不阻止角色创建流程，只是记录错误
          toastr.warning('现实世界地图生成失败，可稍后手动生成');
        }
      }
    } else {
      await characterStore.addNPC(character as NPCCharacter);
    }

    toastr.success(`角色 ${character.name} 创建成功`);

    // 触发组件事件
    emit('created', character);

    // 触发全局事件（用于同步到酒馆角色卡）
    if (props.characterType === 'player') {
      console.log('[CharacterCreator] 触发全局 character_created 事件');
      eventEmit('character_created');
    }
  } catch (error) {
    console.error('[CharacterCreator] 创建角色失败:', error);
    toastr.error('创建角色失败');
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 如果是编辑模式，加载角色数据
  if (props.editingCharacter) {
    formData.name = props.editingCharacter.name;
    formData.age = props.editingCharacter.age;
    formData.occupation = props.editingCharacter.occupation || '';
    formData.background = props.editingCharacter.background || '';
    Object.assign(formData.attributes, props.editingCharacter.attributes);

    // 设置职业选择
    const occupation = props.editingCharacter.occupation || '';
    if (occupations.includes(occupation)) {
      selectedOccupation.value = occupation;
    } else if (occupation) {
      selectedOccupation.value = '其他';
      customOccupation.value = occupation;
    }

    // 加载技能
    const skillsArray = Array.from(props.editingCharacter.skills.entries());
    selectedSkills.value = skillsArray.map((entry: any) => ({
      name: entry[0] as string,
      value: entry[1] as number,
      pointType: 'occupational' as const, // 默认为职业点
    }));
  }
});

/**
 * 初始化肢体状态
 */
function initializeBodyParts() {
  return [
    {
      id: 'head',
      name: '头部',
      damage: 0,
      debuffs: [],
      children: [
        { id: 'eyes', name: '眼睛', parent: 'head', damage: 0, debuffs: [] },
        { id: 'mouth', name: '嘴巴', parent: 'head', damage: 0, debuffs: [] },
        { id: 'nose', name: '鼻子', parent: 'head', damage: 0, debuffs: [] },
        { id: 'ears', name: '耳朵', parent: 'head', damage: 0, debuffs: [] },
      ],
    },
    {
      id: 'torso',
      name: '躯体',
      damage: 0,
      debuffs: [],
      children: [
        { id: 'chest', name: '胸部', parent: 'torso', damage: 0, debuffs: [] },
        { id: 'abdomen', name: '腹部', parent: 'torso', damage: 0, debuffs: [] },
        { id: 'back', name: '背部', parent: 'torso', damage: 0, debuffs: [] },
      ],
    },
    {
      id: 'limbs',
      name: '四肢',
      damage: 0,
      debuffs: [],
      children: [
        { id: 'left_arm', name: '左臂', parent: 'limbs', damage: 0, debuffs: [] },
        { id: 'right_arm', name: '右臂', parent: 'limbs', damage: 0, debuffs: [] },
        { id: 'left_leg', name: '左腿', parent: 'limbs', damage: 0, debuffs: [] },
        { id: 'right_leg', name: '右腿', parent: 'limbs', damage: 0, debuffs: [] },
      ],
    },
  ];
}
</script>

<style lang="scss" scoped>
@import '../styles/global.scss';

.character-creator {
  @include modal-container;
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  padding: $spacing-lg;
  overflow-y: auto;

  @include mobile {
    padding: $spacing-md;
    // 确保边框在移动端也显示
    border-width: 1px;
  }

  @include small-screen {
    padding: $spacing-sm;
  }
}

.creator-header {
  text-align: center;
  margin-bottom: $spacing-lg;
  padding-bottom: $spacing-md;
  border-bottom: 1px solid $color-border-dark;

  @include mobile {
    margin-bottom: $spacing-md;
    padding-bottom: $spacing-sm;
  }
}

.creator-title {
  @include modal-title;
  margin-bottom: $spacing-xs;
}

.creator-subtitle {
  font-size: $font-size-sm;
  color: $color-text-secondary;

  @include mobile {
    font-size: $font-size-xs;
  }
}

.creator-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.section {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-md;
  padding: $spacing-md;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
}

.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
  margin-bottom: $spacing-md;

  @include mobile {
    font-size: $font-size-base;
    margin-bottom: $spacing-sm;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: $spacing-md;

  @include mobile {
    grid-template-columns: 1fr;
    gap: $spacing-sm;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.form-label {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
}

.form-input,
.form-select,
.form-textarea {
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  color: $color-text-primary;
  font-size: $font-size-sm;
  font-family: $font-family-primary;
  transition: border-color $transition-fast;

  &:focus {
    outline: none;
    border-color: $color-primary-gold;
  }

  &::placeholder {
    color: $color-text-muted;
  }
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-md;

  @include mobile {
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-sm;
  }

  @include small-screen {
    grid-template-columns: 1fr;
  }
}

.attribute-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.attribute-label {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
}

.attribute-input {
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  color: $color-text-gold;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  text-align: center;
  transition: border-color $transition-fast;

  &:focus {
    outline: none;
    border-color: $color-primary-gold;
  }
}

.derived-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-md;

  @include mobile {
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-sm;
  }

  @include small-screen {
    grid-template-columns: 1fr;
  }
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.3);
  border-radius: $border-radius-sm;
}

.stat-label {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.stat-value {
  font-size: $font-size-sm;
  font-weight: $font-weight-bold;
  color: $color-text-gold;
}

.skills-info {
  display: flex;
  gap: $spacing-lg;
  margin-bottom: $spacing-md;
  padding: $spacing-sm;
  background: rgba(212, 175, 55, 0.1);
  border-radius: $border-radius-sm;
}

.info-text {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.points-value {
  font-weight: $font-weight-bold;
  color: $color-text-gold;

  &.points-negative {
    color: $color-danger;
  }
}

.skills-grid {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.skill-item {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: $spacing-sm;
  align-items: center;
}

.skill-label {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.skill-input {
  width: 80px;
  padding: $spacing-xs $spacing-sm;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  color: $color-text-gold;
  font-size: $font-size-sm;
  text-align: center;

  &:focus {
    outline: none;
    border-color: $color-primary-gold;
  }
}

.skill-type-select {
  width: 90px;
  padding: $spacing-xs $spacing-sm;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid $color-border-dark;
  border-radius: $border-radius-sm;
  color: $color-text-primary;
  font-size: $font-size-xs;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: $color-primary-gold;
  }
}

.add-skill {
  display: flex;
  gap: $spacing-sm;
}

.creator-actions {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-md;
  margin-top: $spacing-lg;
  padding-top: $spacing-md;
  border-top: 1px solid $color-border-dark;

  @include mobile {
    flex-direction: column;
    gap: $spacing-sm;
  }
}

.btn-primary,
.btn-secondary,
.btn-cancel,
.btn-remove {
  padding: $spacing-sm $spacing-lg;
  border: none;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all $transition-fast;

  @include mobile {
    padding: $spacing-xs $spacing-md;
    font-size: $font-size-xs;
    min-height: 36px;
  }

  @include small-screen {
    padding: $spacing-xs $spacing-sm;
    min-height: 32px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: linear-gradient(135deg, $color-primary-gold, $color-secondary-gold);
  color: $color-primary-black;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: $shadow-gold;
  }
}

.btn-secondary {
  background: rgba(212, 175, 55, 0.2);
  color: $color-text-gold;
  border: 1px solid $color-border-gold;
  display: flex;
  align-items: center;
  gap: $spacing-xs;

  &:hover {
    background: rgba(212, 175, 55, 0.3);
  }
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: $color-text-secondary;
  border: 1px solid $color-border-dark;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: $color-text-primary;
  }
}

.btn-remove {
  width: 28px;
  height: 28px;
  padding: 0;
  background: rgba(244, 67, 54, 0.2);
  color: $color-danger;
  border: 1px solid $color-danger;
  font-size: $font-size-lg;
  line-height: 1;

  &:hover {
    background: rgba(244, 67, 54, 0.3);
  }
}

.btn-icon {
  font-size: $font-size-base;
}
</style>
