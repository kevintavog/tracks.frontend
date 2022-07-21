import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Tooltip from 'primevue/tooltip'

import 'primevue/resources/primevue.min.css'
import 'primevue/resources/themes/vela-blue/theme.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

createApp(App)
    .use(router)
    .use(PrimeVue)
    .use(ToastService)
    .directive('tooltip', Tooltip)
    .mount('#app')
