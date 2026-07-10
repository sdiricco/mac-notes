<template>
  <Dialog
    v-model:visible="ui.shortcutsOpen"
    modal
    header="Scorciatoie da tastiera"
    :style="{ width: '26rem' }"
    :draggable="false"
    dismissable-mask
  >
    <ul class="shortcut-list">
      <li v-for="s in shortcuts" :key="s.label">
        <span class="shortcut-label">{{ s.label }}</span>
        <span class="keys">
          <kbd v-for="k in s.keys" :key="k">{{ k }}</kbd>
        </span>
      </li>
    </ul>
  </Dialog>
</template>

<script setup>
import Dialog from 'primevue/dialog'
import { useUiStore } from '../stores/ui'

const ui = useUiStore()

// ⌘ su mac, Ctrl altrove
const mod = navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'

const shortcuts = [
  { label: 'Nuova nota', keys: [mod, 'N'] },
  { label: 'Nuova cartella', keys: [mod, '⇧', 'N'] },
  { label: 'Cerca nelle note', keys: [mod, 'F'] },
  { label: 'Mostra/Nascondi sidebar', keys: [mod, '/'] },
  { label: 'Impostazioni', keys: [mod, ','] },
  { label: 'Duplica nota', keys: [mod, 'D'] },
  { label: 'Annulla / Ripeti', keys: [mod, 'Z'] }
]
</script>

<style scoped>
.shortcut-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.shortcut-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 2px;
  border-bottom: 1px solid var(--p-content-border-color);
}
.shortcut-list li:last-child {
  border-bottom: none;
}
.shortcut-label {
  font-size: 13px;
  color: var(--p-text-color);
}
.keys {
  display: flex;
  gap: 4px;
}
kbd {
  min-width: 22px;
  text-align: center;
  padding: 2px 7px;
  font-family: inherit;
  font-size: 12px;
  color: var(--p-text-color);
  background: var(--search-bg);
  border: 1px solid var(--p-content-border-color);
  border-radius: 5px;
  box-shadow: 0 1px 0 var(--p-content-border-color);
}
</style>
