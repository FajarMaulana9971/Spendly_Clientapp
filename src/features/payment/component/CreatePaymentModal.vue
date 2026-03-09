<script setup>
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['close', 'created'])

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Steps: 'select' | 'confirm'
const step = ref('select')

// Unpaid expenses
const expenses = ref([])
const loadingExpenses = ref(true)
const expenseError = ref(null)

// Selected IDs
const selectedIds = ref(new Set())

// Submit
const loading = ref(false)
const submitError = ref('')

// Note
const note = ref('')
const paidAt = ref(new Date().toISOString().split('T')[0])

// Fetch all unpaid expenses (loop pages if needed)
const fetchUnpaidExpenses = async () => {
  loadingExpenses.value = true
  expenseError.value = null
  try {
    let page = 1
    const limit = 50
    let allItems = []
    let totalPages = 1

    do {
      const params = new URLSearchParams({ page, limit, paid: 'false' })
      const res = await fetch(`${BASE_URL}/expense?${params}`)
      const json = await res.json()
      const data = json.data.expenseResponse

      const expenseData = data?.expenseResponse ?? data
      const pg = data?.pagination

      const items = expenseData?.items ?? (Array.isArray(expenseData) ? expenseData : [])
      allItems = [...allItems, ...items]

      if (pg) {
        totalPages = pg.totalPages ?? 1
      } else {
        totalPages = expenseData?.totalPages ?? 1
      }
      page++
    } while (page <= totalPages)

    expenses.value = allItems
  } catch {
    expenseError.value = 'Gagal memuat daftar pengeluaran.'
  } finally {
    loadingExpenses.value = false
  }
}

onMounted(fetchUnpaidExpenses)

// Toggle selection
const toggleSelect = (id) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

const toggleAll = () => {
  if (selectedIds.value.size === expenses.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(expenses.value.map((e) => e.id))
  }
}

const allSelected = computed(
  () => expenses.value.length > 0 && selectedIds.value.size === expenses.value.length,
)

const selectedExpenses = computed(() => expenses.value.filter((e) => selectedIds.value.has(e.id)))

const totalAmount = computed(() =>
  selectedExpenses.value.reduce((sum, e) => sum + (e.finalAmount ?? e.amount ?? 0), 0),
)

const canProceed = computed(() => selectedIds.value.size > 0)

// Proceed to confirm
const goConfirm = () => {
  if (!canProceed.value) return
  step.value = 'confirm'
}

const goBack = () => {
  step.value = 'select'
  submitError.value = ''
}

// Submit
const submit = async () => {
  loading.value = true
  submitError.value = ''
  try {
    const payload = {
      expenseIds: Array.from(selectedIds.value),
      totalAmount: totalAmount.value,
      paidAt: paidAt.value,
      note: note.value.trim() || undefined,
    }

    const res = await fetch(`${BASE_URL}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json?.message || 'Gagal membuat pembayaran')
    }

    emit('created')
    emit('close')
  } catch (e) {
    submitError.value = e.message || 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}

const formatCurrency = (v) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v ?? 0)

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-'
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />

    <div
      class="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-5 border-b border-slate-700/50 shrink-0"
      >
        <div>
          <h2 class="text-white font-semibold text-lg">Buat Pembayaran</h2>
          <div class="flex items-center gap-2 mt-1">
            <!-- Step indicators -->
            <span
              class="text-xs font-medium px-2 py-0.5 rounded-full transition-all"
              :class="
                step === 'select'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-500'
              "
            >
              1. Pilih Pengeluaran
            </span>
            <svg
              class="w-3 h-3 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span
              class="text-xs font-medium px-2 py-0.5 rounded-full transition-all"
              :class="
                step === 'confirm'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-500'
              "
            >
              2. Konfirmasi
            </span>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="text-slate-400 hover:text-white transition-colors p-1"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- ─── STEP 1: SELECT ─── -->
      <template v-if="step === 'select'">
        <!-- Loading -->
        <div v-if="loadingExpenses" class="flex items-center justify-center py-16 flex-1">
          <div
            class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>

        <!-- Error -->
        <div
          v-else-if="expenseError"
          class="flex flex-col items-center justify-center py-16 gap-3 flex-1"
        >
          <p class="text-red-400 text-sm">{{ expenseError }}</p>
          <button @click="fetchUnpaidExpenses" class="text-emerald-400 text-sm hover:underline">
            Coba lagi
          </button>
        </div>

        <!-- Empty -->
        <div
          v-else-if="expenses.length === 0"
          class="flex flex-col items-center justify-center py-16 gap-3 flex-1"
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-slate-500 text-sm">Semua pengeluaran sudah dibayar!</p>
        </div>

        <!-- List -->
        <div v-else class="flex flex-col flex-1 min-h-0">
          <!-- Select all bar -->
          <div
            class="flex items-center justify-between px-6 py-3 bg-slate-900/40 border-b border-slate-700/30 shrink-0"
          >
            <label class="flex items-center gap-3 cursor-pointer">
              <div
                class="w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer"
                :class="
                  allSelected
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'border-slate-500 hover:border-emerald-500'
                "
                @click="toggleAll"
              >
                <svg
                  v-if="allSelected"
                  class="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <!-- indeterminate -->
                <div
                  v-else-if="selectedIds.size > 0"
                  class="w-2 h-0.5 bg-emerald-400 rounded"
                ></div>
              </div>
              <span class="text-slate-300 text-sm">
                Pilih semua
                <span class="text-slate-500">({{ expenses.length }} item)</span>
              </span>
            </label>
            <span v-if="selectedIds.size > 0" class="text-xs text-emerald-400 font-medium">
              {{ selectedIds.size }} dipilih
            </span>
          </div>

          <!-- Expense items scroll area -->
          <div class="overflow-y-auto flex-1">
            <div
              v-for="expense in expenses"
              :key="expense.id"
              class="flex items-center gap-4 px-6 py-3.5 border-b border-slate-700/20 hover:bg-slate-700/15 transition-colors cursor-pointer"
              :class="selectedIds.has(expense.id) ? 'bg-emerald-500/5' : ''"
              @click="toggleSelect(expense.id)"
            >
              <!-- Checkbox -->
              <div
                class="shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all"
                :class="
                  selectedIds.has(expense.id)
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'border-slate-500'
                "
              >
                <svg
                  v-if="selectedIds.has(expense.id)"
                  class="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-white text-sm font-medium truncate">{{ expense.title }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600/50"
                      >
                        {{ expense.category || '-' }}
                      </span>
                      <span class="text-slate-500 text-xs">{{ formatDate(expense.spentAt) }}</span>
                      <span v-if="expense.isSplitBill" class="text-xs text-violet-400">split</span>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <div v-if="expense.isSplitBill" class="flex flex-col items-end">
                      <span class="text-slate-500 text-xs line-through tabular-nums">{{
                        formatCurrency(expense.amount)
                      }}</span>
                      <span class="text-emerald-400 font-semibold text-sm tabular-nums">{{
                        formatCurrency(expense.finalAmount)
                      }}</span>
                    </div>
                    <span v-else class="text-emerald-400 font-semibold text-sm tabular-nums">
                      {{ formatCurrency(expense.finalAmount ?? expense.amount) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer: total + action -->
          <div class="shrink-0 border-t border-slate-700/50 px-6 py-4 bg-slate-900/30">
            <div class="flex items-center justify-between mb-4">
              <span class="text-slate-400 text-sm">
                Total dipilih
                <span class="text-slate-300">({{ selectedIds.size }} item)</span>
              </span>
              <span class="text-emerald-400 font-bold text-xl tabular-nums">
                {{ formatCurrency(totalAmount) }}
              </span>
            </div>
            <div class="flex gap-3">
              <button
                @click="emit('close')"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm"
              >
                Batal
              </button>
              <button
                @click="goConfirm"
                :disabled="!canProceed"
                class="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Lanjut →
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- ─── STEP 2: CONFIRM ─── -->
      <template v-if="step === 'confirm'">
        <div class="flex flex-col flex-1 min-h-0">
          <!-- Selected expenses summary (scrollable) -->
          <div class="overflow-y-auto flex-1 px-6 py-4 space-y-2">
            <p class="text-slate-400 text-xs uppercase tracking-wider font-medium mb-3">
              Pengeluaran yang akan dibayar
            </p>
            <div
              v-for="exp in selectedExpenses"
              :key="exp.id"
              class="flex items-center justify-between gap-3 bg-slate-700/30 border border-slate-600/30 rounded-xl px-4 py-3"
            >
              <div class="min-w-0">
                <p class="text-white text-sm font-medium truncate">{{ exp.title }}</p>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-slate-500 text-xs">{{ exp.category || '-' }}</span>
                  <span class="text-slate-600 text-xs">·</span>
                  <span class="text-slate-500 text-xs">{{ formatDate(exp.spentAt) }}</span>
                </div>
              </div>
              <span class="text-emerald-400 font-semibold text-sm tabular-nums shrink-0">
                {{ formatCurrency(exp.finalAmount ?? exp.amount) }}
              </span>
            </div>
          </div>

          <!-- Summary + form -->
          <div class="shrink-0 border-t border-slate-700/50 px-6 py-5 space-y-4 bg-slate-900/30">
            <!-- Total highlight -->
            <div
              class="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3"
            >
              <span class="text-emerald-300 text-sm font-medium">Total Pembayaran</span>
              <span class="text-emerald-400 font-bold text-2xl tabular-nums">{{
                formatCurrency(totalAmount)
              }}</span>
            </div>

            <!-- Date + Note -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5"
                  >Tanggal Bayar</label
                >
                <input
                  v-model="paidAt"
                  type="date"
                  class="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div>
                <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5"
                  >Catatan
                  <span class="text-slate-600 normal-case font-normal">(opsional)</span></label
                >
                <input
                  v-model="note"
                  placeholder="mis. Bayar bareng..."
                  class="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-slate-500"
                />
              </div>
            </div>

            <p v-if="submitError" class="text-rose-400 text-sm">{{ submitError }}</p>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                @click="goBack"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm"
              >
                ← Kembali
              </button>
              <button
                @click="submit"
                :disabled="loading"
                class="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                {{ loading ? 'Memproses...' : 'Konfirmasi Pembayaran' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
