import type InputText from 'primevue/inputtext'
import type Password from 'primevue/password'
import type Button from 'primevue/button'
import type Card from 'primevue/card'
import type InputNumber from 'primevue/inputnumber'
import type Textarea from 'primevue/textarea'
import type Tag from 'primevue/tag'
import type Divider from 'primevue/divider'
import type Badge from 'primevue/badge'
import type Toast from 'primevue/toast'
import type ConfirmDialog from 'primevue/confirmdialog'
import type Select from 'primevue/select'
import type DataTable from 'primevue/datatable'
import type Column from 'primevue/column'

declare module 'vue' {
  export interface GlobalComponents {
    InputText: typeof InputText
    Password: typeof Password
    Button: typeof Button
    Card: typeof Card
    InputNumber: typeof InputNumber
    Textarea: typeof Textarea
    Tag: typeof Tag
    Divider: typeof Divider
    Badge: typeof Badge
    Toast: typeof Toast
    ConfirmDialog: typeof ConfirmDialog
    Select: typeof Select
    DataTable: typeof DataTable
    Column: typeof Column
  }
}
