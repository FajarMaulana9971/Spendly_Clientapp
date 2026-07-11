<script setup>
import { ref, onMounted, computed } from 'vue'

const expensesTotal = ref([])
const expensesPaidTotal = ref([])
const expensesUnpaidTotal = ref([])
const totalPayment = ref([])
const loading = ref(true)

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0)

onMounted(async () => {
  try {
    const res = await fetch(`${BASE_URL}/expense/total`)
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
    const res = await fetch(`${BASE_URL}/expense/total?type=paid`)
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
    const res = await fetch(`${BASE_URL}/expense/total?type=unpaid`)
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
    const res = await fetch(`${BASE_URL}/payment/total-paid`)
    const json = await res.json()
    totalPayment.value = json.data.totalAmount || json || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const cards = computed(() => [
  {
    key: 'total',
    label: 'Total Pengeluaran',
    value: formatCurrency(expensesTotal.value),
    icon: '💸',
    color: 'from-violet-600 to-violet-800',
    glow: 'shadow-violet-500/20',
  },
  {
    key: 'unpaid',
    label: 'Belum Dibayar',
    value: formatCurrency(expensesUnpaidTotal.value),
    icon: '⏳',
    color: 'from-rose-600 to-rose-800',
    glow: 'shadow-rose-500/20',
  },
  {
    key: 'paid',
    label: 'Sudah Dibayar',
    value: formatCurrency(expensesPaidTotal.value),
    icon: '✅',
    color: 'from-emerald-600 to-emerald-800',
    glow: 'shadow-emerald-500/20',
  },
  {
    key: 'payment',
    label: 'Total Pembayaran',
    value: formatCurrency(totalPayment.value),
    icon: '🏦',
    color: 'from-blue-600 to-blue-800',
    glow: 'shadow-blue-500/20',
  },
])

// Mobile: baris atas cuma "Belum Dibayar" & "Sudah Dibayar" (urutan ini ikut urutan `cards`)
const mobileTopCards = computed(() =>
  cards.value.filter((c) => c.key === 'unpaid' || c.key === 'paid'),
)
// Mobile: baris bawah "Total Pembayaran" full width
const mobileBottomCard = computed(() => cards.value.find((c) => c.key === 'total'))
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading">
      <div class="grid grid-cols-2 gap-4 lg:hidden">
        <div v-for="i in 2" :key="i" class="h-28 rounded-2xl bg-slate-800/60 animate-pulse" />
      </div>
      <div class="mt-4 lg:hidden">
        <div class="h-24 rounded-2xl bg-slate-800/60 animate-pulse" />
      </div>
      <div class="hidden lg:grid grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="h-28 rounded-2xl bg-slate-800/60 animate-pulse" />
      </div>
    </div>

    <div v-else>
      <!-- ═══ MOBILE (di bawah lg): Belum Dibayar | Sudah Dibayar, lalu Total Pembayaran full width ═══ -->
      <div class="lg:hidden">
        <div class="grid grid-cols-2 gap-4">
          <div
            v-for="card in mobileTopCards"
            :key="card.key"
            :class="`bg-gradient-to-br ${card.color} rounded-2xl p-5 shadow-xl ${card.glow} hover:scale-105 transition-transform duration-300 cursor-default items-center text-center`"
          >
            <div class="text-2xl mb-2">{{ card.icon }}</div>
            <div class="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
              {{ card.label }}
            </div>
            <div class="text-white font-bold text-lg leading-tight">{{ card.value }}</div>
          </div>
        </div>

        <div
          v-if="mobileBottomCard"
          :class="`mt-4 bg-gradient-to-br ${mobileBottomCard.color} rounded-2xl p-5 shadow-xl ${mobileBottomCard.glow} hover:scale-[1.02] transition-transform duration-300 cursor-default flex flex-col items-center text-center`"
        >
          <div class="text-2xl mb-2">{{ mobileBottomCard.icon }}</div>
          <div class="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
            {{ mobileBottomCard.label }}
          </div>
          <div class="text-white font-bold text-lg leading-tight">
            {{ mobileBottomCard.value }}
          </div>
        </div>
      </div>

      <!-- ═══ DESKTOP (lg ke atas): 3 kartu original (Total Pengeluaran, Belum Dibayar, Sudah Dibayar) ═══ -->
      <div class="hidden lg:grid grid-cols-3 gap-4">
        <div
          v-for="card in cards.filter((c) => c.key !== 'payment')"
          :key="card.key"
          :class="`bg-gradient-to-br ${card.color} rounded-2xl p-5 shadow-xl ${card.glow} hover:scale-105 transition-transform duration-300 cursor-default`"
        >
          <div class="text-2xl mb-2">{{ card.icon }}</div>
          <div class="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
            {{ card.label }}
          </div>
          <div class="text-white font-bold text-lg leading-tight">{{ card.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>