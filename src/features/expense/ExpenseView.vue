<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Navbar from '../../components/navbar/Navbar.vue'
import CreateExpenseModal from '../../components/modal/CreateExpenseModal.vue'
import ExpenseDetailModal from './components/ExpenseDetailModal.vue'
import EditExpenseModal from './components/EditExpenseModal.vue'
import DatePicker from '../../components/datePicker/DatePicker.vue'
import BulkDailyExpenseModal from './components/BulkDailyExpenseModal.vue'

// --- State ---
const expenses = ref([])
const loading = ref(false)
const error = ref(null)
const showCreateExpense = ref(false)
const selectedExpenseId = ref(null)
const showDetail = ref(false)
const showBulkDaily = ref(false)

// Edit modal
const showEdit = ref(false)
const editingExpense = ref(null)

// Delete confirm
const deletingId = ref(null)
const deleteLoading = ref(false)

const filterStartDate = ref('')
const filterEndDate = ref('')

// Filters
const filterTitle = ref('')
const filterPaid = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0) // total transaksi (semua item) sesuai filter
const totalGroups = ref(0) // total hari (header) sesuai filter — dasar pagination sekarang

// Pagination & Sorting
const limit = ref(10)
const sortBy = ref('spentAt')
const sortOrder = ref('desc')

// Filter flagging
const showFilter = ref(false)

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]
const SORT_OPTIONS = [
  { value: 'spentAt', label: 'Tanggal' },
  { value: 'amount', label: 'Jumlah' },
  { value: 'title', label: 'Judul' },
  { value: 'category', label: 'Kategori' },
]
const PAID_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'true', label: 'Sudah Dibayar' },
  { value: 'false', label: 'Belum Dibayar' },
]

// --- Custom dropdown (menggantikan <select> bawaan browser) ---
// openMenu menyimpan dropdown mana yang sedang terbuka: 'sort' | 'limit' | 'paid' | null
const openMenu = ref(null)
const toggleMenu = (name) => {
  openMenu.value = openMenu.value === name ? null : name
}
const closeAllMenus = () => {
  openMenu.value = null
}

const sortLabel = computed(
  () => SORT_OPTIONS.find((o) => o.value === sortBy.value)?.label ?? 'Urutkan'
)
const limitLabel = computed(() => `${limit.value} / halaman`)
const paidLabel = computed(
  () => PAID_OPTIONS.find((o) => o.value === filterPaid.value)?.label ?? 'Semua Status'
)

const selectSortBy = (value) => {
  sortBy.value = value
  openMenu.value = null
}
const selectLimit = (value) => {
  limit.value = value
  onLimitChange()
  openMenu.value = null
}
const selectPaid = (value) => {
  filterPaid.value = value
  openMenu.value = null
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// --- Abort controller untuk cancel request lama ---
let abortController = null

// --- Fetch ---
const fetchExpenses = async () => {
  // Cancel request sebelumnya jika masih berjalan
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()

  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams()

    params.append('page', currentPage.value)
    params.append('limit', limit.value)
    params.append('sortBy', sortBy.value)
    params.append('sortOrder', sortOrder.value)

    if (filterPaid.value !== '') params.append('paid', filterPaid.value)
    if (filterTitle.value.trim()) params.append('title', filterTitle.value.trim())
    if (filterStartDate.value) params.append('startDate', filterStartDate.value)
    if (filterEndDate.value) params.append('endDate', filterEndDate.value)

    const res = await fetch(`${BASE_URL}/expense?${params}`, {
      signal: abortController.signal,
    })

    const json = await res.json()
    const data = json.data

    const expenseData = data?.expenseResponse ?? data
    const pagination = data?.pagination

    if (pagination) {
      expenses.value = expenseData?.items ?? expenseData ?? []
      totalPages.value = pagination.totalPages ?? 1
      // pagination.total = jumlah hari (header), pagination.totalItems = jumlah transaksi
      totalGroups.value = pagination.total ?? 0
      totalItems.value = pagination.totalItems ?? pagination.total ?? 0
    } else if (expenseData?.items) {
      expenses.value = expenseData.items
      totalPages.value = expenseData.totalPages ?? 1
      totalGroups.value = expenseData.totalGroups ?? expenseData.totalPages ?? 1
      totalItems.value = expenseData.totalItems ?? expenseData.items.length
    } else if (Array.isArray(expenseData)) {
      expenses.value = expenseData
      totalPages.value = 1
      totalGroups.value = 1
      totalItems.value = expenseData.length
    } else {
      expenses.value = []
    }
  } catch (e) {
    // Abaikan error abort (bukan error sungguhan)
    if (e.name === 'AbortError') return
    error.value = 'Gagal memuat data pengeluaran.'
  } finally {
    loading.value = false
  }
}

const activeFilterCount = computed(() => {
  let count = 0

  if (filterStartDate.value || filterEndDate.value) count++
  if (filterTitle.value.trim()) count++
  if (filterPaid.value !== '') count++

  return count
})

onMounted(() => {
  fetchExpenses()
  window.addEventListener('click', closeAllMenus)
})

onUnmounted(() => {
  if (abortController) abortController.abort()
  clearTimeout(titleDebounceTimer)
  window.removeEventListener('click', closeAllMenus)
})

// --- Debounce untuk filterTitle ---
// Pakai variable di luar watch agar tidak di-reset tiap render
let titleDebounceTimer = null

watch(filterTitle, () => {
  // Selalu clear timer lama dulu
  if (titleDebounceTimer) {
    clearTimeout(titleDebounceTimer)
    titleDebounceTimer = null
  }
  // Set timer baru — fetch hanya dijalankan setelah user berhenti mengetik 450ms
  titleDebounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchExpenses()
  }, 450)
})

// --- Watch filter lain (langsung fetch, tanpa debounce) ---
watch([filterPaid, filterStartDate, filterEndDate, sortBy, sortOrder], () => {
  currentPage.value = 1
  fetchExpenses()
})

// --- Watch pagination & limit ---
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

// Data sudah difilter dari BE — tidak perlu filter lokal lagi
const filteredExpenses = computed(() => expenses.value)

// --- Grouping by date (day + tanggal) ---
// Grouping mengikuti urutan data apa adanya dari BE, sehingga sort (spentAt/amount/title/category)
// tetap berjalan normal — grup hanya "mengelompokkan tampilan", bukan mengubah urutan data.
const groupedExpenses = computed(() => {
  const map = new Map()
  for (const expense of filteredExpenses.value) {
    const dateKey = expense.spentAt ? new Date(expense.spentAt).toDateString() : 'no-date'
    if (!map.has(dateKey)) {
      map.set(dateKey, {
        dateKey,
        date: expense.spentAt,
        items: [],
        total: 0,
        unpaidCount: 0,
      })
    }
    const group = map.get(dateKey)
    group.items.push(expense)
    group.total += expense.finalAmount ?? expense.amount ?? 0
    if (!expense.isPaid) group.unpaidCount++
  }
  return Array.from(map.values())
})

// --- Status ringkas per grup tanggal (untuk header sebelum dropdown) ---
// Bukan lagi berupa badge teks — cukup warna pada jumlah uang + ikon kecil + garis aksen:
// hijau = lunas semua, oranye = dibayar sebagian, merah = belum dibayar sama sekali.
const groupStatus = (group) => {
  const total = group.items.length
  if (total === 0) {
    return {
      type: 'empty',
      amountClass: 'text-slate-400',
      barClass: 'bg-slate-600',
      iconBg: 'bg-slate-700/40 border border-slate-600/40',
      iconColor: 'text-slate-500',
      chevronColor: 'text-slate-500',
    }
  }
  if (group.unpaidCount === 0) {
    return {
      type: 'paid',
      amountClass: 'text-emerald-400',
      barClass: 'bg-emerald-500',
      iconBg: 'bg-emerald-500/15 border border-emerald-500/30',
      iconColor: 'text-emerald-400',
      chevronColor: 'text-emerald-500/80',
    }
  }
  if (group.unpaidCount === total) {
    return {
      type: 'unpaid',
      amountClass: 'text-rose-400',
      barClass: 'bg-rose-500',
      iconBg: 'bg-rose-500/15 border border-rose-500/30',
      iconColor: 'text-rose-400',
      chevronColor: 'text-rose-500/80',
    }
  }
  return {
    type: 'partial',
    amountClass: 'text-amber-400',
    barClass: 'bg-amber-500',
    iconBg: 'bg-amber-500/15 border border-amber-500/30',
    iconColor: 'text-amber-400',
    chevronColor: 'text-amber-500/80',
  }
}

// --- Expand / collapse state per tanggal ---
const expandedDates = ref(new Set())

const toggleGroup = (dateKey) => {
  const next = new Set(expandedDates.value)
  if (next.has(dateKey)) {
    next.delete(dateKey)
  } else {
    next.add(dateKey)
  }
  expandedDates.value = next
}

const isExpanded = (dateKey) => expandedDates.value.has(dateKey)

// Reset status expand tiap kali data berubah (ganti halaman/filter/sort/limit)
watch(expenses, () => {
  expandedDates.value = new Set()
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

// Label lengkap untuk header grup (mis. "Sabtu, 11 Juli 2026")
const formatGroupDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Tanpa tanggal'

const handleCreated = () => {
  currentPage.value = 1
  fetchExpenses()
}

const openDetail = (id) => {
  selectedExpenseId.value = id
  showDetail.value = true
}

const deletingExpense = computed(() => expenses.value.find((e) => e.id === deletingId.value))

// --- Animasi dropdown (expand/collapse) memakai JS hooks pada <Transition> ---
// Dipakai karena "height: auto" tidak bisa langsung dianimasikan via CSS transition biasa.
const onEnter = (el) => {
  el.style.height = '0px'
  el.style.overflow = 'hidden'
  // force reflow supaya browser mendaftarkan state awal sebelum animasi
  void el.offsetHeight
  requestAnimationFrame(() => {
    el.style.transition = 'height 280ms cubic-bezier(0.4, 0, 0.2, 1)'
    el.style.height = el.scrollHeight + 'px'
  })
}

const onAfterEnter = (el) => {
  el.style.height = 'auto'
  el.style.overflow = ''
  el.style.transition = ''
}

const onLeave = (el) => {
  el.style.height = el.scrollHeight + 'px'
  el.style.overflow = 'hidden'
  void el.offsetHeight
  requestAnimationFrame(() => {
    el.style.transition = 'height 220ms cubic-bezier(0.4, 0, 0.2, 1)'
    el.style.height = '0px'
  })
}
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

        <div class="flex flex-col gap-2 items-start sm:items-end">
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

          <button
            @click="showBulkDaily = true"
            class="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-5 py-2.5 rounded-full border border-slate-600/50 transition-all duration-200 hover:scale-105 w-fit text-sm"
          >
            <svg
              class="w-4 h-4"
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
            Bulk Harian
          </button>
        </div>
      </div>

      <!-- Toolbar -->
      <div
        class="relative z-20 bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl mb-4 overflow-visible"
      >
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-center gap-3 px-4 py-3">
          <!-- Filter -->
          <button
            @click.stop="showFilter = !showFilter"
            class="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 5h18M6 12h12M10 19h4"
              />
            </svg>

            <span class="font-medium text-sm">
              Filter
            </span>

            <span
              v-if="activeFilterCount"
              class="min-w-5 h-5 rounded-full bg-violet-500 text-white text-[11px] flex items-center justify-center px-1"
            >
              {{ activeFilterCount }}
            </span>
          </button>

          <!-- Right -->
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Sort (custom dropdown) -->
            <div class="relative">
              <button
                type="button"
                @click.stop="toggleMenu('sort')"
                class="flex items-center gap-2 bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-2 text-sm text-white hover:bg-slate-700 hover:border-slate-500/60 transition-all duration-150"
                :class="openMenu === 'sort' ? 'border-violet-500/60 ring-1 ring-violet-500/30' : ''"
              >
                <span>{{ sortLabel }}</span>
                <svg
                  class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
                  :class="openMenu === 'sort' ? 'rotate-180 text-violet-400' : ''"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <Transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 scale-95 -translate-y-1"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-95 -translate-y-1"
              >
                <div
                  v-if="openMenu === 'sort'"
                  @click.stop
                  class="absolute z-30 left-0 mt-2 w-40 origin-top-left rounded-xl border border-slate-700/60 bg-slate-800/95 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden py-1"
                >
                  <button
                    v-for="item in SORT_OPTIONS"
                    :key="item.value"
                    @click="selectSortBy(item.value)"
                    class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left transition-colors"
                    :class="
                      sortBy === item.value
                        ? 'bg-violet-500/15 text-violet-300'
                        : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                    "
                  >
                    {{ item.label }}
                    <svg
                      v-if="sortBy === item.value"
                      class="w-3.5 h-3.5 text-violet-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </Transition>
            </div>

            <!-- Urutan Asc/Desc -->
            <button
              @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
              class="w-9 h-9 rounded-lg bg-slate-700/50 border border-slate-600/40 flex items-center justify-center hover:bg-slate-700 transition"
              title="Balik urutan"
            >
              <svg
                class="w-4 h-4 text-slate-300 transition-transform duration-200"
                :class="sortOrder === 'asc' ? 'rotate-180' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <!-- Limit (custom dropdown) -->
            <div class="relative">
              <button
                type="button"
                @click.stop="toggleMenu('limit')"
                class="flex items-center gap-2 bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-2 text-sm text-white hover:bg-slate-700 hover:border-slate-500/60 transition-all duration-150"
                :class="openMenu === 'limit' ? 'border-violet-500/60 ring-1 ring-violet-500/30' : ''"
              >
                <span class="whitespace-nowrap">{{ limitLabel }}</span>
                <svg
                  class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
                  :class="openMenu === 'limit' ? 'rotate-180 text-violet-400' : ''"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <Transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 scale-95 -translate-y-1"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-95 -translate-y-1"
              >
                <div
                  v-if="openMenu === 'limit'"
                  @click.stop
                  class="absolute z-30 right-0 mt-2 w-36 origin-top-right rounded-xl border border-slate-700/60 bg-slate-800/95 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden py-1"
                >
                  <button
                    v-for="size in PAGE_SIZE_OPTIONS"
                    :key="size"
                    @click="selectLimit(size)"
                    class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left transition-colors"
                    :class="
                      limit === size
                        ? 'bg-violet-500/15 text-violet-300'
                        : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                    "
                  >
                    {{ size }} / halaman
                    <svg
                      v-if="limit === size"
                      class="w-3.5 h-3.5 text-violet-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- Expand Filter -->
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[500px]"
          leave-active-class="transition-all duration-300"
          leave-from-class="opacity-100 max-h-[500px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="showFilter" class="border-t border-slate-700/50 p-4" @click.stop>
            <div class="grid md:grid-cols-4 gap-4">
              <DatePicker
                v-model="filterStartDate"
                placeholder="Tanggal awal"
                :max="filterEndDate || ''"
              />

              <DatePicker
                v-model="filterEndDate"
                placeholder="Tanggal akhir"
                :min="filterStartDate || ''"
              />

              <input
                v-model="filterTitle"
                type="text"
                placeholder="Cari judul..."
                class="bg-slate-700/50 border border-slate-600/40 rounded-xl px-4 py-2.5 text-white"
              />

              <!-- Status (custom dropdown) -->
              <div class="relative">
                <button
                  type="button"
                  @click.stop="toggleMenu('paid')"
                  class="w-full flex items-center justify-between gap-2 bg-slate-700/50 border border-slate-600/40 rounded-xl px-4 py-2.5 text-white hover:bg-slate-700 hover:border-slate-500/60 transition-all duration-150"
                  :class="openMenu === 'paid' ? 'border-violet-500/60 ring-1 ring-violet-500/30' : ''"
                >
                  <span>{{ paidLabel }}</span>
                  <svg
                    class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0"
                    :class="openMenu === 'paid' ? 'rotate-180 text-violet-400' : ''"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <Transition
                  enter-active-class="transition duration-150 ease-out"
                  enter-from-class="opacity-0 scale-95 -translate-y-1"
                  enter-to-class="opacity-100 scale-100 translate-y-0"
                  leave-active-class="transition duration-100 ease-in"
                  leave-from-class="opacity-100 scale-100 translate-y-0"
                  leave-to-class="opacity-0 scale-95 -translate-y-1"
                >
                  <div
                    v-if="openMenu === 'paid'"
                    @click.stop
                    class="absolute z-30 left-0 right-0 mt-2 origin-top rounded-xl border border-slate-700/60 bg-slate-800/95 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden py-1"
                  >
                    <button
                      v-for="item in PAID_OPTIONS"
                      :key="item.value"
                      @click="selectPaid(item.value)"
                      class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left transition-colors"
                      :class="
                        filterPaid === item.value
                          ? 'bg-violet-500/15 text-violet-300'
                          : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                      "
                    >
                      {{ item.label }}
                      <svg
                        v-if="filterPaid === item.value"
                        class="w-3.5 h-3.5 text-violet-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.5"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </Transition>
              </div>
            </div>

            <div v-if="activeFilterCount" class="flex justify-end mt-4">
              <button
                @click="
                  filterStartDate = '';
                  filterEndDate = '';
                  filterTitle = '';
                  filterPaid = '';
                "
                class="text-sm text-violet-300 hover:text-white transition"
              >
                Reset semua filter
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Table (grouped by date) -->
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

        <!--
          Grup per tanggal.
          PENTING: bagian ini SENGAJA tidak dibungkus overflow-x-auto/min-w, supaya
          header ringkas (tanggal, status, jumlah) selalu full-width dan tidak perlu
          discroll ke kanan-kiri di layar kecil. Scroll horizontal hanya berlaku di
          dalam dropdown (detail transaksi per hari) yang punya lebih banyak kolom.
        -->
        <div v-else>
          <div
            v-for="group in groupedExpenses"
            :key="group.dateKey"
            class="relative border-b border-slate-700/30 last:border-b-0 transition-colors duration-200"
            :class="isExpanded(group.dateKey) ? 'bg-slate-900/30' : ''"
          >

            <!-- Header grup ringkas: tanggal, status (warna jumlah + ikon), jumlah — klik untuk expand/collapse -->
            <button
              type="button"
              @click="toggleGroup(group.dateKey)"
              class="group/header w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-5 py-4 hover:bg-slate-700/20 active:bg-slate-700/25 transition-all duration-200 text-left"
            >
              <div class="flex items-center gap-2 sm:gap-3 min-w-0">
                <svg
                  class="w-4 h-4 shrink-0 transition-all duration-200"
                  :class="[isExpanded(group.dateKey) ? 'rotate-90' : '', groupStatus(group).chevronColor]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <div class="min-w-0">
                  <p class="text-white font-semibold text-sm truncate transition-colors duration-200 group-hover/header:text-violet-100">
                    {{ formatGroupDate(group.date) }}
                  </p>
                  <p class="text-slate-500 text-[11px] mt-0.5">
                    {{ group.items.length }} transaksi
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
                <span
                  class="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0 transition-transform duration-200 group-hover/header:scale-110"
                  :class="[groupStatus(group).iconBg, groupStatus(group).type === 'unpaid' ? 'animate-pulse' : '']"
                >
                  <svg
                    v-if="groupStatus(group).type === 'paid'"
                    class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                    :class="groupStatus(group).iconColor"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg
                    v-else-if="groupStatus(group).type === 'partial'"
                    class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                    :class="groupStatus(group).iconColor"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.25"
                  >
                    <circle cx="12" cy="12" r="9" stroke-width="2" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l2.5 2.5" />
                  </svg>
                  <svg
                    v-else-if="groupStatus(group).type === 'unpaid'"
                    class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                    :class="groupStatus(group).iconColor"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.25"
                  >
                    <circle cx="12" cy="12" r="9" stroke-width="2" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4.5m0 3h.01" />
                  </svg>
                </span>
                <span
                  class="font-bold text-xs sm:text-sm tabular-nums whitespace-nowrap transition-colors duration-200"
                  :class="groupStatus(group).amountClass"
                >
                  {{ formatCurrency(group.total) }}
                </span>
              </div>
            </button>

            <!-- Dropdown animasi berisi header kolom lengkap + list pengeluaran hari itu -->
            <Transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
              <div v-if="isExpanded(group.dateKey)" class="overflow-hidden">
                <div class="overflow-x-auto">
                  <div class="min-w-[760px]">
                    <!-- Header kolom (Judul, Kategori, Jumlah, Split Bill, Status, Aksi) -->
                    <div
                      class="expense-grid gap-2 px-6 py-2.5 border-t border-b border-slate-700/40 bg-slate-800/40"
                    >
                      <button
                        @click.stop="setSortBy('title')"
                        class="flex items-center gap-1.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-violet-300 transition-colors select-none"
                      >
                        Judul
                        <svg
                          class="w-3 h-3 transition-all"
                          :class="
                            sortBy === 'title'
                              ? sortOrder === 'asc'
                                ? 'text-violet-400 rotate-180'
                                : 'text-violet-400'
                              : 'text-slate-600'
                          "
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="2.5"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <button
                        @click.stop="setSortBy('category')"
                        class="flex items-center gap-1.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-violet-300 transition-colors select-none"
                      >
                        Kategori
                        <svg
                          class="w-3 h-3 transition-all"
                          :class="
                            sortBy === 'category'
                              ? sortOrder === 'asc'
                                ? 'text-violet-400 rotate-180'
                                : 'text-violet-400'
                              : 'text-slate-600'
                          "
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="2.5"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <button
                        @click.stop="setSortBy('amount')"
                        class="flex items-center justify-end gap-1.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-violet-300 transition-colors select-none"
                      >
                        Jumlah
                        <svg
                          class="w-3 h-3 transition-all"
                          :class="
                            sortBy === 'amount'
                              ? sortOrder === 'asc'
                                ? 'text-violet-400 rotate-180'
                                : 'text-violet-400'
                              : 'text-slate-600'
                          "
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="2.5"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <span class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Split Bill
                      </span>
                      <span class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Status
                      </span>
                      <span class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Aksi
                      </span>
                    </div>

                    <!-- Baris transaksi hari itu -->
                    <div
                      v-for="expense in group.items"
                      :key="expense.id"
                      class="row-item group/row relative expense-grid gap-2 items-center px-6 py-3 border-t border-slate-700/20 hover:bg-slate-700/10 hover:pl-7 transition-all duration-150"
                    >
                      <span
                        class="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full opacity-0 group-hover/row:opacity-100 group-hover/row:h-7 transition-all duration-150"
                        :class="expense.isPaid ? 'bg-emerald-400' : 'bg-amber-400'"
                      ></span>
                      <div class="min-w-0 pr-2">
                        <span class="text-white font-medium text-sm">{{ expense.title }}</span>
                      </div>

                      <div>
                        <span
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600/50"
                          >{{ expense.category || '-' }}</span
                        >
                      </div>

                      <div class="text-right">
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
                      </div>

                      <div class="flex justify-center">
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
                      </div>

                      <div class="flex justify-center">
                        <span
                          :class="
                          expense.isPaid
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          "
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                        >
                          <span
                            :class="expense.isPaid ? 'bg-emerald-400' : 'bg-rose-400'"
                            class="w-1.5 h-1.5 rounded-full"
                          ></span>
                          {{ expense.isPaid ? 'Lunas' : 'Belum' }}
                        </span>
                      </div>

                      <!-- Aksi -->
                      <div class="action-btns flex items-center justify-end gap-0.5 transition-all duration-150">
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
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && !error && totalPages >= 1 && filteredExpenses.length > 0"
          class="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-700/50"
        >
          <p class="text-slate-500 text-xs order-2 sm:order-1">
            Menampilkan hari
            <span class="text-slate-300 font-medium"
              >{{ (currentPage - 1) * limit + 1 }}–{{
                Math.min(currentPage * limit, totalGroups)
              }}</span
            >
            dari <span class="text-slate-300 font-medium">{{ totalGroups }}</span> hari
            <span class="text-slate-700">·</span>
            <span class="text-slate-300 font-medium">{{ filteredExpenses.length }}</span> transaksi di halaman ini
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
    <BulkDailyExpenseModal
      v-if="showBulkDaily"
      @close="showBulkDaily = false"
      @created="handleCreated"
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
/* Grid kolom untuk header & baris item di dalam dropdown (Judul, Kategori, Jumlah, Split Bill, Status, Aksi) */
.expense-grid {
  display: grid;
  grid-template-columns: minmax(180px, 2fr) minmax(110px, 1fr) minmax(120px, 1fr) 90px 110px 160px;
  align-items: center;
}

/* Mobile: action buttons always visible */
.action-btns {
  opacity: 1;
}

/* Desktop: hide until row hover */
@media (min-width: 768px) {
  .action-btns {
    opacity: 0;
  }
  .row-item:hover .action-btns {
    opacity: 1;
  }
}
</style>