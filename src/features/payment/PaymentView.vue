<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Navbar from '../../components/navbar/Navbar.vue'
import CreatePaymentModal from './component/CreatePaymentModal.vue'
import PaymentDetailModal from './component/PaymentDetailModal.vue'
import DatePicker from '../../components/datePicker/DatePicker.vue'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// --- State ---
const payments = ref([])
const loading = ref(false)
const error = ref(null)
const totalItems = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const limit = ref(10)
const expandedId = ref(null)

// Filters & sort
const filterStartDate = ref('')
const filterEndDate = ref('')
const sortBy = ref('createdAt')
const sortOrder = ref('desc')

// Modals
const showCreatePayment = ref(false)
const selectedPaymentId = ref(null)
const showDetail = ref(false)

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Tanggal Bayar' },
  { value: 'totalAmount', label: 'Total' },
]

// --- Fetch ---
const fetchPayments = async () => {
  loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: limit.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
    if (filterStartDate.value) params.append('startDate', filterStartDate.value)
    if (filterEndDate.value) params.append('endDate', filterEndDate.value)

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
  } catch {
    error.value = 'Gagal memuat data pembayaran.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchPayments)
watch([filterStartDate, filterEndDate, sortBy, sortOrder], () => {
  currentPage.value = 1
  fetchPayments()
})
watch([currentPage, limit], fetchPayments)

const setSortBy = (field) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
}

const resetDateFilter = () => {
  filterStartDate.value = ''
  filterEndDate.value = ''
}

const toggleExpand = (id) => {
  expandedId.value = expandedId.value === id ? null : id
}

const openDetail = (id) => {
  selectedPaymentId.value = id
  showDetail.value = true
}

const handleCreated = () => {
  currentPage.value = 1
  fetchPayments()
}

// Pagination
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

// Helpers
const formatCurrency = (v) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v ?? 0)

// Format tanggal singkat: "4 Mar 2026"
const formatDateShort = (d) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

// Format tanggal panjang untuk subtitle: "Rab, 04 Mar 2026"
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-'

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

// ── Label utama payment: "Pembayaran pengeluaran dari X hingga Y"
// Jika minSpentAt === maxSpentAt (atau hanya 1 expense), tampilkan tanggal tunggal
const paymentLabel = (payment) => {
  const min = formatDateShort(payment.minSpentAt)
  const max = formatDateShort(payment.maxSpentAt)

  if (!min && !max) return `Pembayaran #${payment.id}`
  if (!max || min === max) return `Pembayaran pengeluaran ${min}`
  return `Pembayaran pengeluaran dari ${min} hingga ${max}`
}

// Subtitle: tanggal transaksi dibayar
const paymentSubtitle = (payment) => {
  const parts = []
  if (payment.expenseCount) parts.push(`${payment.expenseCount} pengeluaran`)
  parts.push(`Dibayar ${formatDateTime(payment.paidAt)}`)
  return parts.join(' · ')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 font-sans">
    <Navbar />

    <main class="pt-28 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white tracking-tight">Pembayaran</h1>
          <p class="text-slate-400 mt-1 text-sm">{{ totalItems }} total transaksi pembayaran</p>
        </div>
        <button
          @click="showCreatePayment = true"
          class="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-105 w-fit"
        >
          <svg
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
          Buat Pembayaran
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
        </div>

        <!-- Active chips -->
        <div
          v-if="filterStartDate || filterEndDate"
          class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700/40"
        >
          <span class="text-xs text-slate-500 self-center">Filter aktif:</span>
          <span
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
        </div>
      </div>

      <!-- Table Controls -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 px-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-slate-500 font-medium uppercase tracking-wider">Urutkan:</span>
          <div class="flex items-center gap-1.5">
            <button
              v-for="opt in SORT_OPTIONS"
              :key="opt.value"
              @click="setSortBy(opt.value)"
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                sortBy === opt.value
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
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
              @click="((limit = size), (currentPage = 1))"
              :class="[
                'w-9 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all duration-150',
                limit === size
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:text-white hover:bg-slate-700/60',
              ]"
            >
              {{ size }}
            </button>
          </div>
          <span class="text-xs text-slate-500">per halaman</span>
        </div>
      </div>

      <!-- Payment List -->
      <div
        class="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden"
      >
        <div v-if="loading" class="flex items-center justify-center py-20">
          <div
            class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"
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
          <button @click="fetchPayments" class="text-emerald-400 text-sm hover:underline">
            Coba lagi
          </button>
        </div>

        <div
          v-else-if="payments.length === 0"
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
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p class="text-slate-500 text-sm">Belum ada data pembayaran</p>
        </div>

        <!-- List -->
        <div v-else class="divide-y divide-slate-700/30">
          <div v-for="payment in payments" :key="payment.id" class="group">
            <!-- Payment row header -->
            <div
              class="flex items-center gap-4 px-6 py-4 hover:bg-slate-700/20 transition-colors duration-150 cursor-pointer"
              @click="toggleExpand(payment.id)"
            >
              <!-- <div class="shrink-0">
                <div
                  class="w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200"
                  :class="
                    expandedId === payment.id
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-700/40 border-slate-600/40 text-slate-500'
                  "
                >
                  <svg
                    class="w-4 h-4 transition-transform duration-200"
                    :class="expandedId === payment.id ? 'rotate-180' : ''"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div> -->

              <!-- Icon -->
              <div
                class="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
              >
                <svg
                  class="w-5 h-5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div class="min-w-0">
                    <!-- ── Label utama dari spentAt range ── -->
                    <p class="text-white font-semibold text-sm truncate">
                      {{ paymentLabel(payment) }}
                    </p>
                    <!-- ── Subtitle: jumlah item + waktu dibayar ── -->
                    <p class="text-slate-500 text-xs mt-0.5">
                      {{ paymentSubtitle(payment) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-3 shrink-0">
                    <!-- Note badge -->
                    <span
                      v-if="payment.note"
                      class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/60 border border-slate-600/40 text-slate-400 text-xs"
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
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                      </svg>
                      {{
                        payment.note.length > 20 ? payment.note.slice(0, 20) + '…' : payment.note
                      }}
                    </span>
                    <!-- Total -->
                    <span class="text-emerald-400 font-bold text-base tabular-nums">
                      {{ formatCurrency(payment.totalAmount) }}
                    </span>
                    <!-- Detail button -->
                    <button
                      @click.stop="openDetail(payment.id)"
                      class="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-slate-400 hover:text-violet-300 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-violet-500/10 transition-all whitespace-nowrap"
                    >
                      <svg
                        class="w-3.5 h-3.5"
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
                      <span class="hidden sm:inline">Detail</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Expanded: expense list (fetch on demand) -->
            <PaymentExpenseList
              v-if="expandedId === payment.id"
              :payment-id="payment.id"
              :format-currency="formatCurrency"
              :format-date="formatDate"
            />
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && !error && totalPages >= 1 && payments.length > 0"
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
              title="Pertama"
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
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
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
              title="Terakhir"
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
              class="w-14 h-8 text-center text-xs bg-slate-700/50 border border-slate-600/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span class="text-xs text-slate-600">/ {{ totalPages }}</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Modals -->
    <CreatePaymentModal
      v-if="showCreatePayment"
      @close="showCreatePayment = false"
      @created="handleCreated"
    />
    <PaymentDetailModal
      v-if="showDetail"
      :payment-id="selectedPaymentId"
      @close="showDetail = false"
    />
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'

const PaymentExpenseList = defineComponent({
  name: 'PaymentExpenseList',
  props: {
    paymentId: { type: String, required: true },
    formatCurrency: { type: Function, required: true },
    formatDate: { type: Function, required: true },
  },
  setup(props) {
    const expenses = ref([])
    const loading = ref(true)
    const error = ref(false)

    const load = async () => {
      loading.value = true
      error.value = false
      try {
        const res = await fetch(`${BASE_URL}/payment/${props.paymentId}`)
        const json = await res.json()
        expenses.value = json.data?.expenses ?? []
      } catch {
        error.value = true
      } finally {
        loading.value = false
      }
    }

    load()

    return { expenses, loading, error }
  },
  template: `
    <div class="border-t border-slate-700/30 bg-slate-900/30">
      <div v-if="loading" class="flex items-center justify-center py-6">
        <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <div v-else-if="error" class="px-6 py-4 text-red-400 text-xs">Gagal memuat expense.</div>
      <div v-else-if="expenses.length === 0" class="px-6 py-4 text-slate-500 text-xs">Tidak ada expense.</div>
      <div v-else>
        <div class="grid grid-cols-12 gap-2 px-6 py-2 border-b border-slate-700/20">
          <span class="col-span-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama</span>
          <span class="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategori</span>
          <span class="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Jumlah</span>
          <span class="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</span>
          <span class="col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Split</span>
        </div>
        <div
          v-for="exp in expenses"
          :key="exp.id"
          class="grid grid-cols-12 gap-2 px-6 py-3 border-b border-slate-700/10 hover:bg-slate-700/10 transition-colors"
        >
          <span class="col-span-5 text-white text-sm font-medium truncate self-center">{{ exp.title }}</span>
          <span class="col-span-2 self-center">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600/50">
              {{ exp.category || '-' }}
            </span>
          </span>
          <div class="col-span-2 text-right self-center">
            <div v-if="exp.isSplitBill" class="flex flex-col items-end gap-0.5">
              <span class="text-slate-500 text-xs tabular-nums line-through">{{ formatCurrency(exp.amount) }}</span>
              <span class="text-emerald-400 font-semibold text-sm tabular-nums">{{ formatCurrency(exp.finalAmount) }}</span>
            </div>
            <span v-else class="text-emerald-400 font-semibold text-sm tabular-nums">{{ formatCurrency(exp.finalAmount ?? exp.amount) }}</span>
          </div>
          <span class="col-span-2 text-slate-400 text-xs self-center">{{ formatDate(exp.spentAt) }}</span>
          <div class="col-span-1 flex justify-center items-center">
            <span v-if="exp.isSplitBill" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/40">
              <svg class="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span v-else class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-700/40 border border-slate-600/40">
              <svg class="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
})

export default {
  components: { PaymentExpenseList },
}
</script>
