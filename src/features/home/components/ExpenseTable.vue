<script setup>
import { ref, onMounted, computed, watch } from 'vue'

const emit = defineEmits(['pay'])

const expenses = ref([])
const loading = ref(true)
const search = ref('')
const filter = ref('all')

// Pagination
const currentPage = ref(1)
const limit = ref(5)
const totalItems = ref(0)
const totalPages = ref(1)

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
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const fetchExpenses = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: limit.value,
      sortBy: 'spentAt',
      sortOrder: 'desc',
    })
    if (filter.value === 'paid') params.append('paid', 'true')
    if (filter.value === 'unpaid') params.append('paid', 'false')

    const res = await fetch(`${BASE_URL}/expense?${params}`)
    const json = await res.json()
    const data = json.data

    const expenseData = data?.expenseResponse ?? data
    const pg = data?.pagination

    if (pg) {
      expenses.value = expenseData?.items ?? expenseData ?? []
      totalPages.value = pg.totalPages ?? 1
      totalItems.value = pg.total ?? 0
    } else if (expenseData?.items) {
      expenses.value = expenseData.items
      totalPages.value = expenseData.totalPages ?? 1
      totalItems.value = expenseData.totalItems ?? expenseData.items.length
    } else {
      expenses.value = Array.isArray(expenseData) ? expenseData : []
      totalPages.value = 1
      totalItems.value = expenses.value.length
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchExpenses)
watch([filter, limit], () => {
  currentPage.value = 1
  fetchExpenses()
})
watch(currentPage, fetchExpenses)

// Client-side search filter (only on current page data)
const filtered = computed(() => {
  if (!search.value.trim()) return expenses.value
  const s = search.value.toLowerCase()
  return expenses.value.filter((e) => (e.title || '').toLowerCase().includes(s))
})

const getDisplayAmount = (exp) => (exp.isSplitBill ? exp.finalAmount : exp.amount)

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
        <h3 class="text-white font-semibold text-base">Daftar Pengeluaran</h3>
        <p class="text-slate-400 text-xs mt-0.5">{{ totalItems }} total transaksi</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 mb-4">
      <input
        v-model="search"
        placeholder="Cari..."
        class="flex-1 min-w-28 bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500"
      />
      <select
        v-model="filter"
        class="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        <option value="all">Semua</option>
        <option value="paid">Lunas</option>
        <option value="unpaid">Belum Bayar</option>
      </select>
      <!-- Page size -->
      <div class="flex items-center gap-1">
        <button
          v-for="s in [5, 10]"
          :key="s"
          @click="limit = s"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
          :class="
            limit === s
              ? 'bg-violet-500 border-violet-500 text-white'
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
      <div v-else-if="!filtered.length" class="py-10 text-center text-slate-500 text-sm">
        Tidak ada data
      </div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-slate-400 text-xs uppercase tracking-wider">
            <th class="text-left pb-2 font-medium">Nama</th>
            <th class="text-right pb-2 font-medium">Jumlah</th>
            <th class="text-center pb-2 font-medium hidden sm:table-cell">Tanggal</th>
            <th class="text-center pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-700/50">
          <tr
            v-for="exp in filtered"
            :key="exp.id"
            class="group hover:bg-slate-700/30 transition-colors"
          >
            <td class="py-2.5 pr-3">
              <div class="text-slate-200 font-medium truncate max-w-36">
                {{ exp.title || 'Pengeluaran' }}
              </div>
              <div v-if="exp.category" class="text-slate-500 text-xs">{{ exp.category }}</div>
            </td>
            <td class="py-2.5 text-right">
              <div v-if="exp.isSplitBill" class="flex flex-col items-end">
                <span class="text-slate-500 text-xs line-through tabular-nums">{{
                  formatCurrency(exp.amount)
                }}</span>
                <span class="text-emerald-400 font-semibold tabular-nums">{{
                  formatCurrency(exp.finalAmount)
                }}</span>
              </div>
              <span v-else class="text-slate-200 font-medium tabular-nums">{{
                formatCurrency(getDisplayAmount(exp))
              }}</span>
            </td>
            <td class="py-2.5 text-center text-slate-400 text-xs hidden sm:table-cell">
              {{ formatDate(exp.spentAt) }}
            </td>
            <td class="py-2.5 text-center">
              <span
                class="text-xs px-2 py-0.5 rounded-full border"
                :class="
                  exp.isPaid
                    ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50'
                    : 'bg-amber-900/50 text-amber-400 border-amber-700/50'
                "
              >
                {{ exp.isPaid ? 'Lunas' : 'Belum' }}
              </span>
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
                ? 'bg-violet-500 text-white'
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
