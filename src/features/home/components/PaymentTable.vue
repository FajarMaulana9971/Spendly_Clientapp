<script setup>
import { ref, onMounted, computed, watch } from 'vue'

const payments = ref([])
const loading = ref(true)
const totalItems = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const limit = ref(5)

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0)

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Label periode: "Sen, 1 Mar – Rab, 4 Mar"
const paymentLabel = (pay) => {
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : null
  const min = fmt(pay.minSpentAt)
  const max = fmt(pay.maxSpentAt)
  if (!min && !max) return `Pembayaran #${pay.id}`
  if (!max || min === max) return min
  return `${min} – ${max}`
}

const fetchPayments = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: limit.value,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
    const res = await fetch(`${BASE_URL}/payment?${params}`)
    const json = await res.json()
    const data = json.data

    payments.value = data?.payments ?? []
    const pg = data?.pagination
    if (pg) {
      totalPages.value = pg.totalPages ?? 1
      totalItems.value = pg.total ?? 0
    } else {
      totalPages.value = 1
      totalItems.value = payments.value.length
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchPayments)
watch([limit], () => {
  currentPage.value = 1
  fetchPayments()
})
watch(currentPage, fetchPayments)

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }
  pages.push(1)
  if (cur > 3) pages.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})
</script>

<template>
  <div
    class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-5 flex flex-col h-full"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-white font-semibold text-base">Riwayat Pembayaran</h3>
        <p class="text-slate-400 text-xs mt-0.5">{{ totalItems }} pembayaran</p>
      </div>
      <!-- Page size -->
      <div class="flex items-center gap-1">
        <button
          v-for="s in [5, 10]"
          :key="s"
          @click="limit = s"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
          :class="
            limit === s
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:text-white'
          "
        >
          {{ s }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto flex-1">
      <div v-if="loading" class="space-y-2">
        <div v-for="i in limit" :key="i" class="h-10 rounded-lg bg-slate-700/50 animate-pulse" />
      </div>
      <div v-else-if="!payments.length" class="py-10 text-center text-slate-500 text-sm">
        Belum ada pembayaran
      </div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-slate-400 text-xs uppercase tracking-wider">
            <th class="text-left pb-2 font-medium">Periode</th>
            <th class="text-center pb-2 font-medium hidden sm:table-cell">Dibayar</th>
            <th class="text-right pb-2 font-medium">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-700/50">
          <tr v-for="pay in payments" :key="pay.id" class="hover:bg-slate-700/30 transition-colors">
            <td class="py-2.5 pr-3">
              <div class="text-slate-200 font-medium text-xs">{{ paymentLabel(pay) }}</div>
              <div v-if="pay.expenseCount" class="text-slate-500 text-xs">
                {{ pay.expenseCount }} item
              </div>
            </td>
            <td class="py-2.5 text-center text-slate-400 text-xs hidden sm:table-cell">
              {{ formatDate(pay.paidAt) }}
            </td>
            <td class="py-2.5 text-right">
              <span class="text-emerald-400 font-semibold tabular-nums">{{
                formatCurrency(pay.totalAmount)
              }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      v-if="!loading && totalPages > 1"
      class="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/40"
    >
      <p class="text-slate-500 text-xs">
        <span class="text-slate-300"
          >{{ (currentPage - 1) * limit + 1 }}–{{ Math.min(currentPage * limit, totalItems) }}</span
        >
        dari {{ totalItems }}
      </p>
      <div class="flex items-center gap-1">
        <button
          @click="currentPage--"
          :disabled="currentPage <= 1"
          class="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
        >
          ‹
        </button>
        <template v-for="p in visiblePages" :key="p">
          <button
            v-if="p !== '...'"
            @click="currentPage = p"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-all"
            :class="
              p === currentPage
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
            "
          >
            {{ p }}
          </button>
          <span v-else class="text-slate-600 text-xs w-5 text-center">…</span>
        </template>
        <button
          @click="currentPage++"
          :disabled="currentPage >= totalPages"
          class="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
        >
          ›
        </button>
      </div>
    </div>
  </div>
</template>
