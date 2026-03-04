<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Navbar from '../../components/navbar/Navbar.vue'
import CreateExpenseModal from '../../components/modal/CreateExpenseModal.vue'
import ExpenseDetailModal from './components/ExpenseDetailModal.vue'
import EditExpenseModal from './components/EditExpenseModal.vue'
import DatePicker from '../../components/datePicker/DatePicker.vue'

// --- State ---
const expenses = ref([])
const loading = ref(false)
const error = ref(null)
const showCreateExpense = ref(false)
const selectedExpenseId = ref(null)
const showDetail = ref(false)

// Edit modal
const showEdit = ref(false)
const editingExpense = ref(null)

// Delete confirm
const deletingId = ref(null)
const deleteLoading = ref(false)

const filterStartDate = ref('')
const filterEndDate = ref('')

// Filters
const search = ref('')
const filterCategory = ref('')
const filterPaid = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)

// Pagination & Sorting
const limit = ref(10)
const sortBy = ref('spentAt')
const sortOrder = ref('desc')

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]
const SORT_OPTIONS = [
  { value: 'spentAt', label: 'Tanggal' },
  { value: 'amount', label: 'Jumlah' },
  { value: 'title', label: 'Judul' },
  { value: 'category', label: 'Kategori' },
]

const BASE_URL = 'http://localhost:3000/api'

const categories = [
  'Food',
  'Transport',
  'Entertainment',
  'Health',
  'Shopping',
  'Utilities',
  'Education',
  'Other',
  'Makanan',
  'Transportasi',
  'Utilitas',
  'Hiburan',
  'Kesehatan',
  'Belanja',
  'Pendidikan',
  'Lainnya',
]

// --- Fetch ---
const fetchExpenses = async () => {
  loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: limit.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
    if (filterPaid.value !== '') params.append('paid', filterPaid.value)
    if (filterCategory.value) params.append('category', filterCategory.value)
    if (filterStartDate.value) params.append('startDate', filterStartDate.value)
    if (filterEndDate.value) params.append('endDate', filterEndDate.value)

    const res = await fetch(`${BASE_URL}/expense?${params}`)
    const json = await res.json()
    const data = json.data

    const expenseData = data?.expenseResponse ?? data
    const pagination = data?.pagination

    if (pagination) {
      expenses.value = expenseData?.items ?? expenseData ?? []
      totalPages.value = pagination.totalPages ?? 1
      totalItems.value = pagination.total ?? 0
    } else if (expenseData?.items) {
      expenses.value = expenseData.items
      totalPages.value = expenseData.totalPages ?? 1
      totalItems.value = expenseData.totalItems ?? expenseData.items.length
    } else if (Array.isArray(expenseData)) {
      expenses.value = expenseData
      totalPages.value = 1
      totalItems.value = expenseData.length
    } else {
      expenses.value = []
    }
  } catch (e) {
    error.value = 'Gagal memuat data pengeluaran.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchExpenses)

watch([filterPaid, filterCategory, filterStartDate, filterEndDate, sortBy, sortOrder], () => {
  currentPage.value = 1
  fetchExpenses()
})
watch([currentPage, limit], fetchExpenses)

// --- Edit ---
const openEdit = (expense) => {
  editingExpense.value = expense
  showEdit.value = true
}

const handleUpdated = () => {
  fetchExpenses()
}

// --- Delete ---
const confirmDelete = (id) => {
  deletingId.value = id
}

const cancelDelete = () => {
  deletingId.value = null
}

const executeDelete = async () => {
  if (!deletingId.value) return
  deleteLoading.value = true
  try {
    const res = await fetch(`${BASE_URL}/expense/${deletingId.value}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Gagal menghapus')
    deletingId.value = null
    if (expenses.value.length === 1 && currentPage.value > 1) {
      currentPage.value--
    } else {
      fetchExpenses()
    }
  } catch {
    // tetap tampilkan dialog
  } finally {
    deleteLoading.value = false
  }
}

// --- Helpers ---
const resetDateFilter = () => {
  filterStartDate.value = ''
  filterEndDate.value = ''
}

const setSortBy = (field) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
}

const onLimitChange = () => {
  currentPage.value = 1
}

const filteredExpenses = computed(() => {
  if (!search.value.trim()) return expenses.value
  const q = search.value.toLowerCase()
  return expenses.value.filter(
    (e) =>
      e.title?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.note?.toLowerCase().includes(q),
  )
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) {
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

const formatCurrency = (v) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v ?? 0)

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-'

const handleCreated = () => {
  currentPage.value = 1
  fetchExpenses()
}

const openDetail = (id) => {
  selectedExpenseId.value = id
  showDetail.value = true
}

const deletingExpense = computed(() => expenses.value.find((e) => e.id === deletingId.value))
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 font-sans">
    <Navbar />

    <main class="pt-28 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white tracking-tight">Pengeluaran</h1>
          <p class="text-slate-400 mt-1 text-sm">{{ totalItems }} total pengeluaran tercatat</p>
        </div>
        <button
          @click="showCreateExpense = true"
          class="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-violet-500/30 transition-all duration-200 hover:scale-105 w-fit"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Pengeluaran
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-4 mb-4">
        <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div class="flex flex-col sm:flex-row gap-3 flex-1">
            <div class="flex-1">
              <label
                class="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider"
                >Dari</label
              >
              <DatePicker
                v-model="filterStartDate"
                placeholder="Tanggal awal"
                :max="filterEndDate || ''"
              />
            </div>
            <div class="flex items-end pb-2.5 text-slate-600">
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div class="flex-1">
              <label
                class="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider"
                >Hingga</label
              >
              <DatePicker
                v-model="filterEndDate"
                placeholder="Tanggal akhir"
                :min="filterStartDate || ''"
              />
            </div>
            <div class="flex items-end">
              <button
                v-if="filterStartDate || filterEndDate"
                @click="resetDateFilter"
                class="h-[42px] px-3 flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl border border-slate-600/50 text-xs font-medium transition-all"
              >
                <svg
                  class="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset
              </button>
            </div>
          </div>
          <div class="hidden sm:block w-px h-10 bg-slate-700/50 self-end mb-0.5"></div>
          <div class="w-full sm:w-40">
            <label class="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider"
              >Kategori</label
            >
            <select
              v-model="filterCategory"
              class="w-full bg-slate-700/50 text-white text-sm px-4 py-2.5 rounded-xl border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer"
            >
              <option value="">Semua</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="w-full sm:w-44">
            <label class="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider"
              >Status</label
            >
            <select
              v-model="filterPaid"
              class="w-full bg-slate-700/50 text-white text-sm px-4 py-2.5 rounded-xl border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="true">Sudah Dibayar</option>
              <option value="false">Belum Dibayar</option>
            </select>
          </div>
        </div>

        <!-- Active filter chips -->
        <div
          v-if="filterStartDate || filterEndDate || filterPaid || filterCategory"
          class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700/40"
        >
          <span class="text-xs text-slate-500 self-center">Filter aktif:</span>
          <span
            v-if="filterStartDate || filterEndDate"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {{ filterStartDate || '...' }} → {{ filterEndDate || '...' }}
            <button @click="resetDateFilter" class="hover:text-white transition-colors">
              <svg
                class="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
          <span
            v-if="filterCategory"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs"
          >
            {{ filterCategory }}
            <button @click="filterCategory = ''" class="hover:text-white transition-colors">
              <svg
                class="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
          <span
            v-if="filterPaid"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs"
          >
            {{ filterPaid === 'true' ? 'Sudah Dibayar' : 'Belum Dibayar' }}
            <button @click="filterPaid = ''" class="hover:text-white transition-colors">
              <svg
                class="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>
      </div>

      <!-- Table Controls -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 px-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-slate-500 font-medium uppercase tracking-wider">Urutkan:</span>
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="opt in SORT_OPTIONS"
              :key="opt.value"
              @click="setSortBy(opt.value)"
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                sortBy === opt.value
                  ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                  : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:text-white hover:bg-slate-700/60',
              ]"
            >
              {{ opt.label }}
              <svg
                v-if="sortBy === opt.value"
                class="w-3 h-3 transition-transform duration-200"
                :class="sortOrder === 'asc' ? 'rotate-180' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="text-xs text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap"
            >Tampilkan:</span
          >
          <div class="flex items-center gap-1">
            <button
              v-for="size in PAGE_SIZE_OPTIONS"
              :key="size"
              @click="((limit = size), onLimitChange())"
              :class="[
                'w-9 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all duration-150',
                limit === size
                  ? 'bg-violet-500 border-violet-500 text-white shadow-md shadow-violet-500/30'
                  : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:text-white hover:bg-slate-700/60',
              ]"
            >
              {{ size }}
            </button>
          </div>
          <span class="text-xs text-slate-500">per halaman</span>
        </div>
      </div>

      <!-- Table -->
      <div
        class="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden"
      >
        <div v-if="loading" class="flex items-center justify-center py-20">
          <div
            class="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>

        <div v-else-if="error" class="flex flex-col items-center justify-center py-20 gap-3">
          <svg class="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <p class="text-red-400 text-sm">{{ error }}</p>
          <button @click="fetchExpenses" class="text-violet-400 text-sm hover:underline">
            Coba lagi
          </button>
        </div>

        <div
          v-else-if="filteredExpenses.length === 0"
          class="flex flex-col items-center justify-center py-20 gap-3"
        >
          <svg
            class="w-12 h-12 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1"
              d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p class="text-slate-500 text-sm">Tidak ada data pengeluaran</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-700/50">
                <!-- Judul -->
                <th
                  @click="setSortBy('title')"
                  class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4 cursor-pointer hover:text-violet-300 transition-colors select-none group"
                >
                  <span class="flex items-center gap-1.5">
                    Judul
                    <svg
                      class="w-3 h-3 transition-all"
                      :class="
                        sortBy === 'title'
                          ? sortOrder === 'asc'
                            ? 'text-violet-400 rotate-180'
                            : 'text-violet-400'
                          : 'text-slate-600 group-hover:text-slate-500'
                      "
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </th>

                <!-- Kategori -->
                <th
                  @click="setSortBy('category')"
                  class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-4 cursor-pointer hover:text-violet-300 transition-colors select-none group"
                >
                  <span class="flex items-center gap-1.5">
                    Kategori
                    <svg
                      class="w-3 h-3 transition-all"
                      :class="
                        sortBy === 'category'
                          ? sortOrder === 'asc'
                            ? 'text-violet-400 rotate-180'
                            : 'text-violet-400'
                          : 'text-slate-600 group-hover:text-slate-500'
                      "
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </th>

                <!-- Jumlah -->
                <th
                  @click="setSortBy('amount')"
                  class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-4 cursor-pointer hover:text-violet-300 transition-colors select-none group"
                >
                  <span class="flex items-center justify-end gap-1.5">
                    Jumlah
                    <svg
                      class="w-3 h-3 transition-all"
                      :class="
                        sortBy === 'amount'
                          ? sortOrder === 'asc'
                            ? 'text-violet-400 rotate-180'
                            : 'text-violet-400'
                          : 'text-slate-600 group-hover:text-slate-500'
                      "
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </th>

                <!-- Split Bill -->
                <th
                  class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-4"
                >
                  Split Bill
                </th>

                <!-- Status -->
                <th
                  class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-4"
                >
                  Status
                </th>

                <!-- Tanggal -->
                <th
                  @click="setSortBy('spentAt')"
                  class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-4 cursor-pointer hover:text-violet-300 transition-colors select-none group"
                >
                  <span class="flex items-center gap-1.5">
                    Tanggal
                    <svg
                      class="w-3 h-3 transition-all"
                      :class="
                        sortBy === 'spentAt'
                          ? sortOrder === 'asc'
                            ? 'text-violet-400 rotate-180'
                            : 'text-violet-400'
                          : 'text-slate-600 group-hover:text-slate-500'
                      "
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </th>

                <!-- Aksi -->
                <th
                  class="px-4 py-4 w-36 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/30">
              <tr
                v-for="expense in filteredExpenses"
                :key="expense.id"
                class="group hover:bg-slate-700/20 transition-colors duration-150"
              >
                <td class="px-6 py-4">
                  <span class="text-white font-medium text-sm">{{ expense.title }}</span>
                </td>
                <td class="px-4 py-4">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600/50"
                    >{{ expense.category || '-' }}</span
                  >
                </td>
                <td class="px-4 py-4 text-right">
                  <div v-if="expense.isSplitBill" class="flex flex-col items-end gap-0.5">
                    <span
                      class="text-slate-500 text-xs tabular-nums line-through decoration-slate-500/70"
                      >{{ formatCurrency(expense.amount) }}</span
                    >
                    <span class="text-emerald-400 font-semibold text-sm tabular-nums">{{
                      formatCurrency(expense.finalAmount)
                    }}</span>
                  </div>
                  <span v-else class="text-emerald-400 font-semibold text-sm tabular-nums">{{
                    formatCurrency(expense.finalAmount ?? expense.amount)
                  }}</span>
                </td>
                <td class="px-4 py-4 text-center">
                  <span
                    v-if="expense.isSplitBill"
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/40"
                  >
                    <svg
                      class="w-3.5 h-3.5 text-violet-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700/40 border border-slate-600/40"
                  >
                    <svg
                      class="w-3 h-3 text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </span>
                </td>
                <td class="px-4 py-4 text-center">
                  <span
                    :class="
                      expense.isPaid
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    "
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                  >
                    <span
                      :class="expense.isPaid ? 'bg-emerald-400' : 'bg-amber-400'"
                      class="w-1.5 h-1.5 rounded-full"
                    ></span>
                    {{ expense.isPaid ? 'Lunas' : 'Belum' }}
                  </span>
                </td>
                <td class="px-4 py-4">
                  <span class="text-slate-400 text-sm">{{ formatDate(expense.spentAt) }}</span>
                </td>

                <!-- ─── Action buttons ─── -->
                <td class="px-4 py-4">
                  <!--
                    Mobile  (< md): selalu terlihat, icon-only, lebih kecil
                    Desktop (≥ md): tersembunyi sampai hover baris
                  -->
                  <div
                    class="action-btns flex items-center justify-end gap-0.5 transition-all duration-150"
                  >
                    <!-- Detail -->
                    <button
                      @click="openDetail(expense.id)"
                      title="Lihat detail"
                      class="flex items-center justify-center gap-1 text-slate-400 hover:text-violet-300 active:text-violet-300 text-xs font-medium w-8 h-8 md:w-auto md:h-auto md:px-2 md:py-1.5 rounded-lg hover:bg-violet-500/10 active:bg-violet-500/15 transition-all"
                    >
                      <svg
                        class="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      <span class="hidden lg:inline">Detail</span>
                    </button>

                    <!-- Divider -->
                    <span class="w-px h-4 bg-slate-700 mx-0.5"></span>

                    <!-- Edit — hanya jika belum dibayar -->
                    <button
                      v-if="!expense.isPaid"
                      @click="openEdit(expense)"
                      title="Edit pengeluaran"
                      class="flex items-center justify-center gap-1 text-slate-400 hover:text-amber-300 active:text-amber-300 text-xs font-medium w-8 h-8 md:w-auto md:h-auto md:px-2 md:py-1.5 rounded-lg hover:bg-amber-500/10 active:bg-amber-500/15 transition-all"
                    >
                      <svg
                        class="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span class="hidden lg:inline">Edit</span>
                    </button>

                    <!-- Lock icon — sudah dibayar, tidak bisa edit/delete -->
                    <span
                      v-else
                      title="Sudah lunas — tidak dapat diubah"
                      class="flex items-center justify-center w-8 h-8 text-slate-700 cursor-not-allowed"
                    >
                      <svg
                        class="w-4 h-4 md:w-3.5 md:h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </span>

                    <!-- Delete — hanya jika belum dibayar -->
                    <button
                      v-if="!expense.isPaid"
                      @click="confirmDelete(expense.id)"
                      title="Hapus pengeluaran"
                      class="flex items-center justify-center gap-1 text-slate-400 hover:text-rose-400 active:text-rose-400 text-xs font-medium w-8 h-8 md:w-auto md:h-auto md:px-2 md:py-1.5 rounded-lg hover:bg-rose-500/10 active:bg-rose-500/15 transition-all"
                    >
                      <svg
                        class="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && !error && totalPages >= 1 && filteredExpenses.length > 0"
          class="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-700/50"
        >
          <p class="text-slate-500 text-xs order-2 sm:order-1">
            Menampilkan
            <span class="text-slate-300 font-medium"
              >{{ (currentPage - 1) * limit + 1 }}–{{
                Math.min(currentPage * limit, totalItems)
              }}</span
            >
            dari <span class="text-slate-300 font-medium">{{ totalItems }}</span> data
          </p>
          <div class="flex items-center gap-1.5 order-1 sm:order-2">
            <button
              @click="currentPage = 1"
              :disabled="currentPage <= 1"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Halaman pertama"
            >
              <svg
                class="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11 19l-7-7 7-7M19 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              @click="currentPage--"
              :disabled="currentPage <= 1"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
              ‹
            </button>
            <template v-for="p in visiblePages" :key="p">
              <button
                v-if="p !== '...'"
                @click="currentPage = p"
                :class="[
                  'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all',
                  p === currentPage
                    ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white',
                ]"
              >
                {{ p }}
              </button>
              <span v-else class="text-slate-600 text-xs w-5 text-center">…</span>
            </template>
            <button
              @click="currentPage++"
              :disabled="currentPage >= totalPages"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
              ›
            </button>
            <button
              @click="currentPage = totalPages"
              :disabled="currentPage >= totalPages"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Halaman terakhir"
            >
              <svg
                class="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          <div class="flex items-center gap-2 order-3">
            <span class="text-xs text-slate-500">Ke halaman</span>
            <input
              type="number"
              :min="1"
              :max="totalPages"
              :value="currentPage"
              @change="
                (e) => {
                  const v = Number(e.target.value)
                  if (v >= 1 && v <= totalPages) currentPage = v
                }
              "
              class="w-14 h-8 text-center text-xs bg-slate-700/50 border border-slate-600/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span class="text-xs text-slate-600">/ {{ totalPages }}</span>
          </div>
        </div>
      </div>
    </main>

    <!-- ─── Modals ─── -->
    <CreateExpenseModal
      v-if="showCreateExpense"
      @close="showCreateExpense = false"
      @created="handleCreated"
    />
    <ExpenseDetailModal
      v-if="showDetail"
      :expense-id="selectedExpenseId"
      @close="showDetail = false"
    />
    <EditExpenseModal
      v-if="showEdit && editingExpense"
      :expense="editingExpense"
      @close="((showEdit = false), (editingExpense = null))"
      @updated="handleUpdated"
    />

    <!-- ─── Delete Confirm Dialog ─── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="deletingId" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="cancelDelete" />
          <div
            class="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div
              class="flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 mx-auto mb-4"
            >
              <svg
                class="w-6 h-6 text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h3 class="text-white font-semibold text-center text-base mb-1">Hapus Pengeluaran?</h3>
            <p class="text-slate-400 text-sm text-center mb-1">
              <span class="text-white font-medium">{{ deletingExpense?.title }}</span>
            </p>
            <p class="text-slate-500 text-xs text-center mb-6">
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div class="flex gap-3">
              <button
                @click="cancelDelete"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm"
              >
                Batal
              </button>
              <button
                @click="executeDelete"
                :disabled="deleteLoading"
                class="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {{ deleteLoading ? 'Menghapus...' : 'Ya, Hapus' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Mobile: action buttons always visible */
.action-btns {
  opacity: 1;
}

/* Desktop: hide until row hover */
@media (min-width: 768px) {
  .action-btns {
    opacity: 0;
  }
  tr:hover .action-btns {
    opacity: 1;
  }
}
</style>
