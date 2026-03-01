<script setup>
import { ref, onMounted, computed } from 'vue'

// const expenses = ref([])
// const payments = ref([])
const expensesTotal = ref([])
const expensesPaidTotal = ref([])
const expensesUnpaidTotal = ref([])
const totalPayment = ref([])
const loading = ref(true)

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0)

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/expense/total')
    const json = await res.json()
    expensesTotal.value = json.data.totalExpense || json || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/expense/total?type=paid')
    const json = await res.json()
    expensesPaidTotal.value = json.data.totalExpense || json || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/expense/total?type=unpaid')
    const json = await res.json()
    expensesUnpaidTotal.value = json.data.totalExpense || json || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/payment/total-paid')
    const json = await res.json()
    totalPayment.value = json.data.totalAmount || json || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

// const totalExpenses = computed(() => expenses.value.reduce((s, e) => s + (e.amount || 0), 0))
// const unpaidExpenses = computed(() => expenses.value.filter((e) => !e.isPaid && !e.paymentId))
// const unpaidTotal = computed(() => unpaidExpenses.value.reduce((s, e) => s + (e.amount || 0), 0))
// const paidTotal = computed(() => totalExpenses.value - unpaidTotal.value)
// const totalPayments = computed(() =>
//   payments.value.reduce((s, p) => s + (p.totalAmount || p.amount || 0), 0),
// )

const cards = computed(() => [
  {
    label: 'Total Pengeluaran',
    value: formatCurrency(expensesTotal.value),
    icon: '💸',
    color: 'from-violet-600 to-violet-800',
    glow: 'shadow-violet-500/20',
    // count: `${expenses.value.length} transaksi`,
  },
  {
    label: 'Belum Dibayar',
    value: formatCurrency(expensesUnpaidTotal.value),
    icon: '⏳',
    color: 'from-rose-600 to-rose-800',
    glow: 'shadow-rose-500/20',
    // count: `${unpaidExpenses.value.length} transaksi`,
  },
  {
    label: 'Sudah Dibayar',
    value: formatCurrency(expensesPaidTotal.value),
    icon: '✅',
    color: 'from-emerald-600 to-emerald-800',
    glow: 'shadow-emerald-500/20',
    // count: `${expenses.value.length - unpaidExpenses.value.length} transaksi`,
  },
  {
    label: 'Total Pembayaran',
    value: formatCurrency(totalPayment.value),
    icon: '🏦',
    color: 'from-sky-600 to-sky-800',
    glow: 'shadow-sky-500/20',
    // count: `${payments.value.length} pembayaran`,
  },
])
</script>

<template>
  <div>
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="h-28 rounded-2xl bg-slate-800/60 animate-pulse" />
    </div>
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="card in cards"
        :key="card.label"
        :class="`bg-gradient-to-br ${card.color} rounded-2xl p-5 shadow-xl ${card.glow} hover:scale-105 transition-transform duration-300 cursor-default`"
      >
        <div class="text-2xl mb-2">{{ card.icon }}</div>
        <div class="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
          {{ card.label }}
        </div>
        <div class="text-white font-bold text-lg leading-tight">{{ card.value }}</div>
        <!-- <div class="text-white/50 text-xs mt-1">{{ card.count }}</div> -->
      </div>
    </div>
  </div>
</template>
