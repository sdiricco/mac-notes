<template>
  <Dialog
    v-model:visible="ui.settingsOpen"
    modal
    header="Impostazioni"
    :style="{ width: '30rem' }"
    :draggable="false"
    dismissable-mask
  >
    <div class="settings-section">
      <div class="settings-label">Aspetto</div>
      <div class="segmented">
        <button
          v-for="opt in themeOptions"
          :key="opt.value"
          class="segment"
          :class="{ active: settings.theme === opt.value }"
          @click="settings.setTheme(opt.value)"
        >
          <Icon :icon="opt.icon" />
          <span>{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-label">Ordinamento predefinito</div>
      <div class="settings-row">
        <span class="settings-desc">Nota selezionata come criterio in elenco</span>
        <select :value="settings.sortKey" class="settings-select" @change="settings.setSort($event.target.value)">
          <option value="updated">Data modifica</option>
          <option value="created">Data creazione</option>
          <option value="title">Titolo</option>
        </select>
      </div>
    </div>

    <div class="settings-section">
      <button class="link-btn" @click="openShortcuts">
        <Icon icon="lucide:keyboard" />
        <span>Scorciatoie da tastiera</span>
      </button>
    </div>
  </Dialog>
</template>

<script setup>
import Dialog from 'primevue/dialog'
import { Icon } from '@iconify/vue'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'

const settings = useSettingsStore()
const ui = useUiStore()

const themeOptions = [
  { value: 'system', label: 'Sistema', icon: 'lucide:monitor' },
  { value: 'light', label: 'Chiaro', icon: 'lucide:sun' },
  { value: 'dark', label: 'Scuro', icon: 'lucide:moon' }
]

function openShortcuts() {
  ui.settingsOpen = false
  ui.openShortcuts()
}
</script>

<style scoped>
.settings-section {
  margin-bottom: 20px;
}
.settings-section:last-child {
  margin-bottom: 0;
}

.settings-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--p-text-muted-color);
  margin-bottom: 8px;
}

.segmented {
  display: flex;
  gap: 6px;
}
.segment {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--p-text-color);
  cursor: pointer;
  font-size: 13px;
}
.segment :deep(svg) {
  font-size: 20px;
}
.segment:hover {
  background: var(--sidebar-hover-bg);
}
.segment.active {
  border-color: var(--p-text-color);
  background: var(--selection-bg);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.settings-desc {
  font-size: 13px;
  color: var(--p-text-color);
}
.settings-select {
  background: var(--search-bg);
  border: 1px solid var(--p-content-border-color);
  border-radius: 7px;
  padding: 5px 8px;
  color: var(--p-text-color);
  font-size: 13px;
  outline: none;
}

.link-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: var(--p-text-color);
  cursor: pointer;
  font-size: 13px;
  padding: 6px 0;
}
.link-btn :deep(svg) {
  font-size: 17px;
  color: var(--icon-color);
}
.link-btn:hover {
  color: var(--p-primary-color);
}
</style>
