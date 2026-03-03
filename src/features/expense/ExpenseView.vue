<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Navbar from '../../components/navbar/Navbar.vue'
import CreateExpenseModal from '../home/components/CreateExpenseModal.vue'
import ExpenseDetailModal from './components/ExpenseDetailModal.vue'
import DatePicker from '../../components/datePicker/DatePicker.vue'

// --- State ---
const expenses = ref([])
const loading = ref(false)
const error = ref(null)
const showCreateExpense = ref(false)
const selectedExpenseId = ref(null)
const showDetail = ref(false)
const filterStartDate = ref('')
const filterEndDate = ref('')

// Filters
const search = ref('')
const filterCategory = ref('')
const filterPaid = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)
const limit = 10

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
]

// --- Fetch ---
const fetchExpenses = async () => {
  loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams({ page: currentPage.value, limit })
    if (filterPaid.value !== '') params.append('paid', filterPaid.value)
    if (filterStartDate.value) params.append('startDate', filterStartDate.value)
    if (filterEndDate.value) params.append('endDate', filterEndDate.value)

    const res = await fetch(`${BASE_URL}/expense?${params}`)
    const json = await res.json()
    const data = json.data.expenseResponse

    if (data?.items) {
      expenses.value = data.items
      totalPages.value = data.totalPages ?? 1
      totalItems.value = data.totalItems ?? data.items.length
    } else if (Array.isArray(data)) {
      expenses.value = data
      totalPages.value = 1
      totalItems.value = data.length
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
watch([filterPaid, filterStartDate, filterEndDate], () => {
  currentPage.value = 1
  fetchExpenses()
})
watch(currentPage, fetchExpenses)

const resetDateFilter = () => {
  filterStartDate.value = ''
  filterEndDate.value = ''
}

// --- Local search filter ---
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

// --- Helpers ---
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
          Tambah Pengeluaran
        </button>
      </div>

      <!-- Filters -->
      <!-- Filters -->
      <div class="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-4 mb-6">
        <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <!-- Date range -->
          <div class="flex flex-col sm:flex-row gap-3 flex-1">
            <!-- From -->
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

            <!-- Arrow -->
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

            <!-- To -->
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

            <!-- Reset dates -->
            <div class="flex items-end">
              <button
                v-if="filterStartDate || filterEndDate"
                @click="resetDateFilter"
                class="h-[42px] px-3 flex items-center gap-1.5 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl border border-slate-600/50 text-xs font-medium transition-all"
                title="Reset tanggal"
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

          <!-- Divider -->
          <div class="hidden sm:block w-px h-10 bg-slate-700/50 self-end mb-0.5"></div>

          <!-- Status filter -->
          <div class="w-full sm:w-48">
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
          v-if="filterStartDate || filterEndDate || filterPaid"
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

      <!-- Table -->
      <div
        class="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden"
      >
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-20">
          <div
            class="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>

        <!-- Error -->
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

        <!-- Empty -->
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

        <!-- Table content -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-700/50">
                <th
                  class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4"
                >
                  Title
                </th>
                <th
                  class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-4"
                >
                  Kategori
                </th>
                <th
                  class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-4"
                >
                  Jumlah
                </th>
                <th
                  class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-4"
                >
                  Split Bill
                </th>
                <th
                  class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-4"
                >
                  Status
                </th>
                <th
                  class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-4"
                >
                  Tanggal
                </th>
                <th class="px-2 py-4"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/30">
              <tr
                v-for="expense in filteredExpenses"
                :key="expense.id"
                class="group hover:bg-slate-700/20 transition-colors duration-150"
              >
                <!-- Title -->
                <td class="px-6 py-4">
                  <span class="text-white font-medium text-sm">{{ expense.title }}</span>
                </td>

                <!-- Category -->
                <td class="px-4 py-4">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600/50"
                  >
                    {{ expense.category || '-' }}
                  </span>
                </td>

                <!-- Amount -->
                <td class="px-4 py-4 text-right">
                  <div v-if="expense.isSplitBill" class="flex flex-col items-end gap-0.5">
                    <span
                      class="text-slate-500 text-xs tabular-nums line-through decoration-slate-500/70"
                    >
                      {{ formatCurrency(expense.amount) }}
                    </span>
                    <span class="text-emerald-400 font-semibold text-sm tabular-nums">
                      {{ formatCurrency(expense.finalAmount) }}
                    </span>
                  </div>
                  <span v-else class="text-emerald-400 font-semibold text-sm tabular-nums">
                    {{ formatCurrency(expense.finalAmount ?? expense.amount) }}
                  </span>
                </td>

                <!-- split bill -->
                <td class="px-4 py-4 text-center">
                  <span
                    v-if="expense.isSplitBill"
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/40"
                    title="Split Bill aktif"
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
                    title="Tidak split bill"
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

                <!-- isPaid -->
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

                <!-- spentAt -->
                <td class="px-4 py-4">
                  <span class="text-slate-400 text-sm">{{ formatDate(expense.spentAt) }}</span>
                </td>

                <!-- Detail button -->
                <td class="px-2 py-4">
                  <button
                    @click="openDetail(expense.id)"
                    class="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-xs font-medium transition-all duration-150 hover:gap-2"
                  >
                    Detail
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && !error && totalPages > 1"
          class="flex items-center justify-between px-6 py-4 border-t border-slate-700/50"
        >
          <p class="text-slate-500 text-xs">Halaman {{ currentPage }} dari {{ totalPages }}</p>
          <div class="flex items-center gap-2">
            <button
              @click="currentPage--"
              :disabled="currentPage <= 1"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
              ‹
            </button>
            <template v-for="p in totalPages" :key="p">
              <button
                v-if="Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages"
                @click="currentPage = p"
                :class="
                  p === currentPage
                    ? 'bg-violet-500 text-white'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                "
                class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all"
              >
                {{ p }}
              </button>
              <span v-else-if="Math.abs(p - currentPage) === 3" class="text-slate-600 text-xs"
                >…</span
              >
            </template>
            <button
              @click="currentPage++"
              :disabled="currentPage >= totalPages"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Modals -->
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
  </div>
</template>
