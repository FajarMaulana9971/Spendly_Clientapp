import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/features/home/HomeView.vue'
import ExpenseView from '@/features/expense/ExpenseView.vue'
import PaymentView from '@/features/payment/PaymentView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: ExpenseView,
    },
    {
      path: '/payments',
      name: 'payments',
      component: PaymentView,
    },
  ],
})

export default router
