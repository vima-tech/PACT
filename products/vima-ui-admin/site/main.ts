import { createApp } from 'vue';

import VimaUiAdmin from '@vima-tech/ui-admin';
import '@vima-tech/ui-admin/style.css';

import App from './App.vue';
import './site.css';

createApp(App).use(VimaUiAdmin).mount('#app');
