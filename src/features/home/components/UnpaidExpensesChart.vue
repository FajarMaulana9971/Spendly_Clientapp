<script setup>
import { ref, onMounted, computed } from 'vue'

const expenses = ref([])
const loading = ref(true)

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0)

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(async () => {
  try {
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

    const res = await fetch(`${BASE_URL}/expense`)
    const json = await res.json()
    const all = json.data.expenseResponse || json || []
    expenses.value = all.filter((e) => !e.isPaid && !e.paymentId)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const maxAmount = computed(() => Math.max(...expenses.value.map((e) => e.amount || 0), 1))

const categoryColors = {
  default: 'bg-rose-500',
  food: 'bg-orange-500',
  transport: 'bg-sky-500',
  utilities: 'bg-yellow-500',
  entertainment: 'bg-purple-500',
  health: 'bg-green-500',
}
const getColor = (cat) => categoryColors[cat?.toLowerCase()] || categoryColors.default
</script>

<template>
  <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h3 class="text-white font-semibold text-base flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          Pengeluaran Belum Dibayar
        </h3>
        <p class="text-slate-400 text-xs mt-0.5">{{ expenses.length }} item menunggu pembayaran</p>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-12 rounded-xl bg-slate-700/50 animate-pulse" />
    </div>
    <div v-else-if="!expenses.length" class="py-12 text-center">
      <div class="text-4xl mb-2">🎉</div>
      <p class="text-emerald-400 font-medium">Semua pengeluaran sudah dibayar!</p>
    </div>
    <div v-else class="space-y-3 max-h-64 overflow-y-auto pr-1">
      <div v-for="expense in expenses" :key="expense.id" class="relative group">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-slate-200 text-sm font-medium truncate">{{
              expense.title || expense.name || 'Pengeluaran'
            }}</span>
            <span class="text-slate-500 text-xs hidden sm:inline">{{
              formatDate(expense.date || expense.createdAt)
            }}</span>
          </div>
          <span class="text-rose-400 text-sm font-semibold ml-2 flex-shrink-0">{{
            formatCurrency(expense.finalAmount)
          }}</span>
        </div>
        <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            :class="`h-full rounded-full transition-all duration-700 ${getColor(expense.category)}`"
            :style="{ width: `${(expense.finalAmount / maxAmount) * 100}%` }"
          />
        </div>
        <div v-if="expense.category" class="mt-1">
          <span class="text-xs text-slate-500">{{ expense.category }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
