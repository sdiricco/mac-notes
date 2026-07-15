# Mac Notes

App di note in stile Note di macOS, costruita con Electron, Vue 3, PrimeVue, Pinia e Quill.

## Funzionalità

- **Layout a tre pannelli** come Note del Mac: cartelle, elenco note, editor
- **Editor rich text** basato su [Quill 2](https://quilljs.com/) con titoli, grassetto/corsivo, liste, checklist, citazioni, blocchi di codice e link
- **Toggle Anteprima/Markdown** nella barra dell'editor: passa in un click dalla vista
  formattata alla sorgente Markdown e viceversa; le modifiche raw vengono riconvertite in rich text al volo
- **Sorgente Markdown con syntax highlighting** via [CodeMirror 6](https://codemirror.net/)
  (titoli, enfasi, link, codice, citazioni evidenziati; tema chiaro/scuro via CSS variables)
- **Impostazioni** (`⌘,`) con selettore tema **Sistema / Chiaro / Scuro** e ordinamento predefinito
- **Ordinamento e filtri** delle note: per data modifica, data creazione o titolo (asc/desc) + "solo preferiti"
- **Menu per nota**: rinomina inline, duplica, copia testo, copia come Markdown, preferiti, cestino
- **Pannello scorciatoie** da tastiera
- **Cartelle** con rinomina (doppio click) ed eliminazione (tasto destro)
- **Preferiti** (pin in cima all'elenco), **cestino** con ripristino e svuotamento
- **Ricerca** full-text su titolo e contenuto (`⌘F`)
- **Salvataggio automatico** con debounce su file JSON in `userData`
- **Tema chiaro/scuro** persistente (o automatico in base al sistema)
- Icone [Lucide](https://lucide.dev/) via Iconify, palette neutra
- Menu applicazione in italiano con scorciatoie (`⌘N`, `⇧⌘N`, `⌘D` duplica, `⌘F`, `⌘/`, `⌘,`)

## Stack

| Livello | Tecnologia |
| --- | --- |
| Shell desktop | Electron 33 + electron-vite |
| UI | Vue 3 (Composition API) + PrimeVue 4 (tema Aura) |
| Icone | Lucide via `@iconify/vue` (offline) |
| Stato | Pinia |
| Editor rich text | Quill 2 |
| Editor sorgente | CodeMirror 6 (`@codemirror/lang-markdown`) |
| Markdown | marked (md → html) / turndown + turndown-plugin-gfm (html → md) |

## Sviluppo

```bash
npm install
npm run dev        # dev server + finestra Electron con hot reload
```

I dati sono salvati in `~/Library/Application Support/mac-notes/`: un file `.json` per nota in `notes/`, più `folders.json` per le cartelle. (Le versioni precedenti usavano un unico `notes-data.json`: viene migrato automaticamente al primo avvio.)

Nota: aperto in un browser normale (senza Electron) il renderer usa un fallback su
localStorage (`src/renderer/src/utils/api.js`), utile per la preview UI.

## Build

```bash
npm run build:mac    # .dmg / .app per macOS
npm run build:win
npm run build:linux
```

## Struttura

```
src/
├── main/            # processo main: finestra, menu, IPC, persistenza JSON
│   ├── index.js
│   ├── menu.js
│   └── store.js
├── preload/         # contextBridge: espone window.api al renderer
│   └── index.js
└── renderer/src/
    ├── App.vue              # shell a 3 pannelli (Splitter)
    ├── components/
    │   ├── Sidebar.vue      # cartelle, tutte le note, cestino
    │   ├── NoteList.vue     # elenco, ricerca, context menu
    │   ├── NoteEditor.vue   # titolo, azioni, editor
    │   └── QuillEditor.vue  # wrapper Vue per Quill
    ├── stores/notes.js      # store Pinia (CRUD, ricerca, pin, cestino)
    └── utils/
        ├── api.js           # bridge Electron con fallback browser
        ├── markdown.js      # conversioni md ↔ html
        └── debounce.js
```
