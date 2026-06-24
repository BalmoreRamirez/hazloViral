import './assets/main.css'
import 'primeicons/primeicons.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'

const HazloViralPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
      400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
      800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065',
    },
    formField: {
      borderRadius: '0.5rem',
      focusRing: {
        width: '2px',
        style: 'solid',
        color: 'rgba(124,58,237,0.3)',
        offset: '0px',
        shadow: 'none',
      },
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          hoverColor: '{primary.500}',
          activeColor: '{primary.400}',
        },
        // Form fields: InputText, Password, Select trigger, Textarea, InputNumber
        formField: {
          background: '#ffffff',
          borderColor: 'rgba(15,23,42,0.2)',
          hoverBorderColor: 'rgba(15,23,42,0.4)',
          focusBorderColor: 'rgba(124,58,237,0.5)',
          color: '#0F172A',
          placeholderColor: 'rgba(15,23,42,0.35)',
          shadow: 'none',
        },
        // Select / AutoComplete dropdown panel
        overlay: {
          select: {
            background: '#ffffff',
            borderColor: 'rgba(15,23,42,0.12)',
            color: '#0F172A',
            shadow: '0 4px 16px 0 rgb(15 23 42 / 0.12), 0 1px 4px 0 rgb(15 23 42 / 0.06)',
          },
        },
        // Dropdown list options
        list: {
          option: {
            focusBackground: 'rgba(124,58,237,0.07)',
            focusColor: '#7C3AED',
            selectedBackground: 'rgba(124,58,237,0.1)',
            selectedColor: '#7C3AED',
            selectedFocusBackground: 'rgba(124,58,237,0.15)',
            selectedFocusColor: '#7C3AED',
          },
        },
      },
    },
  },
})
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'

// Componentes globales (disponibles en cualquier vue sin importar)
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Password from 'primevue/password'
import Textarea from 'primevue/textarea'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import Badge from 'primevue/badge'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// ── PrimeVue con tema Aura ────────────────────────────────────────────────────
app.use(PrimeVue, {
  theme: {
    preset: HazloViralPreset,
    options: {
      darkModeSelector: '.dark',
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, properties, components, primevue, utilities',
      },
    },
  },
})

app.use(ToastService)
app.use(ConfirmationService)
app.directive('tooltip', Tooltip)

// ── Registro global de componentes PrimeVue ───────────────────────────────────
app.component('Button', Button)
app.component('Card', Card)
app.component('InputText', InputText)
app.component('Password', Password)
app.component('InputNumber', InputNumber)
app.component('Textarea', Textarea)
app.component('Tag', Tag)
app.component('Divider', Divider)
app.component('Badge', Badge)
app.component('Toast', Toast)
app.component('ConfirmDialog', ConfirmDialog)
app.component('Select', Select)
app.component('DataTable', DataTable)
app.component('Column', Column)

app.mount('#app')
