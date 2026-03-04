<script setup>
import { ref, onMounted } from 'vue'
import Navbar from '../../components/navbar/Navbar.vue'
import SummaryCards from './components/SummaryCards.vue'
import UnpaidExpensesChart from './components/UnpaidExpensesChart.vue'
import MonthlyReportChart from './components/MonthlyReportChart.vue'
import CategoryChart from './components/CategoryChart.vue'
import ExpenseTable from './components/ExpenseTable.vue'
import PaymentTable from './components/PaymentTable.vue'
import CreateExpenseModal from '../../components/modal/CreateExpenseModal.vue'
import CreatePaymentModal from './components/CreatePaymentModal.vue'

const showCreateExpense = ref(false)
const showCreatePayment = ref(false)
const activeSection = ref('pengeluaran')

const refreshKey = ref(0)

const handleCreated = () => {
  refreshKey.value++
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
    <Navbar @section-change="activeSection = $event" />

    <!-- Floating Action Buttons -->
    <div class="fixed bottom-8 right-8 z-40 flex flex-col gap-3">
      <button
        @click="showCreatePayment = true"
        class="group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:shadow-emerald-400/50 hover:scale-105"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <span>Bayar</span>
      </button>
      <button
        @click="showCreateExpense = true"
        class="group flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg shadow-violet-500/30 transition-all duration-300 hover:shadow-violet-400/50 hover:scale-105"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Pengeluaran</span>
      </button>
    </div>

    <main class="pt-28 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
      <!-- Summary Cards -->
      <SummaryCards :key="refreshKey" />

      <!-- Charts Row -->
      <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <MonthlyReportChart :key="refreshKey" />
        </div>
        <div>
          <CategoryChart :key="refreshKey" />
        </div>
      </div>

      <!-- Unpaid Expenses -->
      <div class="mt-6">
        <UnpaidExpensesChart :key="refreshKey" />
      </div>

      <!-- Tables Row -->
      <div class="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6" id="pengeluaran">
        <ExpenseTable :key="refreshKey" @pay="showCreatePayment = true" />
        <div id="pembayaran">
          <PaymentTable :key="refreshKey" />
        </div>
      </div>
    </main>

    <!-- Modals -->
    <CreateExpenseModal
      v-if="showCreateExpense"
      @close="showCreateExpense = false"
      @created="handleCreated"
    />
    <CreatePaymentModal
      v-if="showCreatePayment"
      @close="showCreatePayment = false"
      @created="handleCreated"
    />
  </div>
</template>
