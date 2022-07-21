import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Search from '@/views/Search.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'search',
    component: Search
  },
  {
    path: '/map/:id',
    name: 'map',
    component: () => import(/* webpackChunkName: "map" */ '@/views/Map.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.NODE_ENV === 'production' ? 'tracks' : ''),
  // history: createWebHistory('/'),
  routes
})

export default router
