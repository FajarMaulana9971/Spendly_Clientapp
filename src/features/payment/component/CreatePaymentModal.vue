<script setup>
import { ref, computed, onMounted } from 'vue'
import DatePicker from '../../../components/datePicker/DatePicker.vue'

const emit = defineEmits(['close', 'created'])

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// step: 'mode' | 'select' | 'amount-input' | 'amount-results'
//       | 'date-input' | 'date-results' | 'confirm'
const step = ref('mode')
const previousStep = ref('mode') // buat tombol "kembali" dari confirm balik ke step yg bener

// ── Pool: kumpulan expense yang bisa dipilih di step confirm.
// Diisi beda-beda tergantung mode (semua unpaid / hasil kombinasi jumlah uang / hasil rentang tanggal)
const pool = ref([])
const selectedIds = ref(new Set())

// Submit
const loading = ref(false)
const submitError = ref('')

// Note
const note = ref('')
const paidAt = ref(new Date().toISOString().split('T')[0])

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

// ────────────────────────────────────────────────────────────
// MODE 1: Pilih Item (existing behaviour)
// ────────────────────────────────────────────────────────────
const loadingExpenses = ref(true)
const expenseError = ref(null)

const fetchUnpaidExpenses = async () => {
  loadingExpenses.value = true
  expenseError.value = null
  try {
    const res = await fetch(`${BASE_URL}/expenses/unpaid`)
    const json = await res.json()
    const data = json.data
    const expenseData = data?.expenseResponse ?? data
    pool.value = Array.isArray(expenseData) ? expenseData : (expenseData?.items ?? [])
  } catch {
    expenseError.value = 'Gagal memuat daftar pengeluaran.'
  } finally {
    loadingExpenses.value = false
  }
}

const goToSelectMode = () => {
  selectedIds.value = new Set()
  step.value = 'select'
  fetchUnpaidExpenses()
}

// ────────────────────────────────────────────────────────────
// MODE 2: Cari via Jumlah Uang
// ────────────────────────────────────────────────────────────
const amountDigits = ref('') // nilai mentah, cuma digit (mis. "10000")
const amountSearching = ref(false)
const amountSearchError = ref('')
const amountCombinations = ref([])
const amountTruncated = ref(false)
const amountNotFoundMessage = ref('')
const selectedComboIndex = ref(null)

// v-model buat input: user ngetik "1000", yang ditampilkan otomatis "1.000",
// tapi nilai asli yang dipakai buat request tetap angka murni (amountDigits).
const displayAmount = computed({
  get() {
    if (!amountDigits.value) return ''
    return new Intl.NumberFormat('id-ID').format(Number(amountDigits.value))
  },
  set(val) {
    amountDigits.value = String(val).replace(/[^\d]/g, '')
  },
})

const goToAmountMode = () => {
  amountDigits.value = ''
  amountCombinations.value = []
  amountNotFoundMessage.value = ''
  selectedComboIndex.value = null
  step.value = 'amount-input'
}

const searchByAmount = async () => {
  const amount = Number(amountDigits.value)
  if (!amount || amount <= 0) {
    amountSearchError.value = 'Masukkan jumlah uang yang valid'
    return
  }

  amountSearching.value = true
  amountSearchError.value = ''
  amountNotFoundMessage.value = ''
  amountCombinations.value = []

  try {
    const res = await fetch(`${BASE_URL}/payment/search-by-amount?amount=${amount}`)
    const json = await res.json()
    const data = json.data

    if (!data?.found) {
      amountNotFoundMessage.value =
        data?.message || `Tidak ada pembayaran dengan jumlah ${formatCurrency(amount)}`
      return
    }

    amountCombinations.value = data.combinations
    amountTruncated.value = !!data.truncated
    step.value = 'amount-results'
  } catch {
    amountSearchError.value = 'Gagal mencari kombinasi pembayaran.'
  } finally {
    amountSearching.value = false
  }
}

const chooseCombo = (index) => {
  selectedComboIndex.value = index
}

const confirmComboSelection = () => {
  if (selectedComboIndex.value === null) return
  const combo = amountCombinations.value[selectedComboIndex.value]
  pool.value = combo.expenses
  selectedIds.value = new Set(combo.expenses.map((e) => e.id))
  previousStep.value = 'amount-results'
  step.value = 'confirm'
}

// ────────────────────────────────────────────────────────────
// MODE 3: Pilih via Rentang Tanggal
// ────────────────────────────────────────────────────────────
const rangeStart = ref('')
const rangeEnd = ref('')
const rangeSearching = ref(false)
const rangeSearchError = ref('')

const goToDateMode = () => {
  rangeStart.value = ''
  rangeEnd.value = ''
  step.value = 'date-input'
}

const searchByDateRange = async () => {
  if (!rangeStart.value || !rangeEnd.value) {
    rangeSearchError.value = 'Pilih tanggal awal dan akhir'
    return
  }

  rangeSearching.value = true
  rangeSearchError.value = ''

  try {
    const params = new URLSearchParams({ startDate: rangeStart.value, endDate: rangeEnd.value })
    const res = await fetch(`${BASE_URL}/expenses/unpaid?${params}`)
    const json = await res.json()
    const data = json.data
    const expenseData = data?.expenseResponse ?? data
    const items = Array.isArray(expenseData) ? expenseData : (expenseData?.items ?? [])

    if (items.length === 0) {
      rangeSearchError.value = 'Tidak ada pengeluaran belum dibayar di rentang tanggal ini'
      return
    }

    pool.value = items
    // pre-checked semua, user masih bisa uncheck di step ini
    selectedIds.value = new Set(items.map((e) => e.id))
    step.value = 'date-results'
  } catch {
    rangeSearchError.value = 'Gagal memuat pengeluaran pada rentang tanggal ini.'
  } finally {
    rangeSearching.value = false
  }
}

// ────────────────────────────────────────────────────────────
// Selection helpers (dipakai bareng oleh mode select & date-results)
// ────────────────────────────────────────────────────────────
const toggleSelect = (id) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

const toggleAll = () => {
  if (selectedIds.value.size === pool.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(pool.value.map((e) => e.id))
  }
}

const allSelected = computed(
  () => pool.value.length > 0 && selectedIds.value.size === pool.value.length,
)

const selectedExpenses = computed(() => pool.value.filter((e) => selectedIds.value.has(e.id)))

const totalAmount = computed(() =>
  selectedExpenses.value.reduce((sum, e) => sum + (e.finalAmount ?? e.amount ?? 0), 0),
)

const canProceed = computed(() => selectedIds.value.size > 0)

const goConfirm = () => {
  if (!canProceed.value) return
  previousStep.value = step.value
  step.value = 'confirm'
}

const goBackFromConfirm = () => {
  step.value = previousStep.value
  submitError.value = ''
}

const backToMode = () => {
  step.value = 'mode'
}

// ────────────────────────────────────────────────────────────
// Submit
// ────────────────────────────────────────────────────────────
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
          <p class="text-slate-500 text-xs mt-1">
            <template v-if="step === 'mode'">Pilih metode pembayaran</template>
            <template v-else-if="step === 'select'">Pilih pengeluaran secara manual</template>
            <template v-else-if="step === 'amount-input' || step === 'amount-results'"
              >Cari berdasarkan jumlah uang</template
            >
            <template v-else-if="step === 'date-input' || step === 'date-results'"
              >Pilih berdasarkan rentang tanggal</template
            >
            <template v-else-if="step === 'confirm'">Konfirmasi pembayaran</template>
          </p>
        </div>
        <button
          @click="emit('close')"
          class="text-slate-400 hover:text-white transition-colors p-1"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- ═══ STEP: MODE SELECT ═══ -->
      <div v-if="step === 'mode'" class="p-6 space-y-3">
        <button
          @click="goToSelectMode"
          class="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-slate-700/40 border border-slate-600/40 hover:border-emerald-500/50 hover:bg-slate-700/60 transition-all text-left"
        >
          <div class="w-10 h-10 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p class="text-white font-semibold text-sm">Pilih Item</p>
            <p class="text-slate-400 text-xs mt-0.5">Centang manual pengeluaran yang mau dibayar</p>
          </div>
        </button>

        <button
          @click="goToAmountMode"
          class="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-slate-700/40 border border-slate-600/40 hover:border-emerald-500/50 hover:bg-slate-700/60 transition-all text-left"
        >
          <div class="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-white font-semibold text-sm">Cari via Jumlah Uang</p>
            <p class="text-slate-400 text-xs mt-0.5">Masukkan nominal, sistem cari item/kombinasi yang cocok</p>
          </div>
        </button>

        <button
          @click="goToDateMode"
          class="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-slate-700/40 border border-slate-600/40 hover:border-emerald-500/50 hover:bg-slate-700/60 transition-all text-left"
        >
          <div class="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p class="text-white font-semibold text-sm">Pilih via Rentang Tanggal</p>
            <p class="text-slate-400 text-xs mt-0.5">Ambil semua pengeluaran belum dibayar di rentang tanggal tertentu</p>
          </div>
        </button>
      </div>

      <!-- ═══ STEP: AMOUNT INPUT ═══ -->
      <div v-else-if="step === 'amount-input'" class="p-6 flex flex-col gap-4">
        <button @click="backToMode" class="text-slate-400 hover:text-white text-xs flex items-center gap-1 w-fit">
          ← Kembali pilih metode
        </button>

        <div>
          <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5">Jumlah Uang</label>
          <input
            v-model="displayAmount"
            type="text"
            inputmode="numeric"
            placeholder="mis. 10.000"
            @keyup.enter="searchByAmount"
            class="w-full bg-slate-700 text-slate-200 rounded-lg px-4 py-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>

        <p v-if="amountSearchError" class="text-rose-400 text-sm">{{ amountSearchError }}</p>
        <p v-if="amountNotFoundMessage" class="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
          {{ amountNotFoundMessage }}
        </p>

        <button
          @click="searchByAmount"
          :disabled="amountSearching"
          class="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          {{ amountSearching ? 'Mencari...' : 'Cari Pembayaran' }}
        </button>
      </div>

      <!-- ═══ STEP: AMOUNT RESULTS ═══ -->
      <div v-else-if="step === 'amount-results'" class="flex flex-col flex-1 min-h-0">
        <div class="px-6 py-3 border-b border-slate-700/30 flex items-center justify-between shrink-0">
          <button @click="step = 'amount-input'" class="text-slate-400 hover:text-white text-xs">← Cari ulang</button>
          <span class="text-xs text-slate-500">{{ amountCombinations.length }} opsi ditemukan</span>
        </div>
        <p v-if="amountTruncated" class="px-6 pt-3 text-xs text-amber-400">
          Menampilkan sebagian kombinasi (masih ada kemungkinan lain, hasil dibatasi demi performa).
        </p>

        <div class="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          <button
            v-for="(combo, idx) in amountCombinations"
            :key="idx"
            @click="chooseCombo(idx)"
            class="w-full text-left rounded-xl border px-4 py-3 transition-all"
            :class="
              selectedComboIndex === idx
                ? 'bg-emerald-500/10 border-emerald-500/50'
                : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'
            "
          >
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-slate-300 text-xs font-medium">
                {{ combo.expenses.length }} item
              </span>
              <span class="text-emerald-400 font-bold text-sm tabular-nums">
                {{ formatCurrency(combo.totalAmount) }}
              </span>
            </div>
            <div class="space-y-1.5">
              <div
                v-for="exp in combo.expenses"
                :key="exp.id"
                class="flex items-center justify-between gap-3 bg-slate-800/50 rounded-lg px-3 py-2"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <p class="text-white text-xs font-medium truncate">{{ exp.title }}</p>
                    <span v-if="exp.isSplitBill" class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 font-medium">
                      split
                    </span>
                  </div>
                  <p class="text-slate-500 text-[11px] mt-0.5">{{ formatDate(exp.spentAt) }}</p>
                </div>
                <div class="text-right shrink-0">
                  <div v-if="exp.isSplitBill" class="flex flex-col items-end">
                    <span class="text-slate-500 text-[11px] line-through tabular-nums">{{ formatCurrency(exp.amount) }}</span>
                    <span class="text-emerald-400 font-semibold text-xs tabular-nums">{{ formatCurrency(exp.finalAmount) }}</span>
                  </div>
                  <span v-else class="text-emerald-400 font-semibold text-xs tabular-nums">
                    {{ formatCurrency(exp.finalAmount ?? exp.amount) }}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div class="shrink-0 border-t border-slate-700/50 px-6 py-4 bg-slate-900/30">
          <button
            @click="confirmComboSelection"
            :disabled="selectedComboIndex === null"
            class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
          >
            Lanjut →
          </button>
        </div>
      </div>

      <!-- ═══ STEP: DATE INPUT ═══ -->
      <div v-else-if="step === 'date-input'" class="p-6 flex flex-col gap-4">
        <button @click="backToMode" class="text-slate-400 hover:text-white text-xs flex items-center gap-1 w-fit">
          ← Kembali pilih metode
        </button>

        <div class="flex items-end gap-3">
          <div class="flex-1">
            <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5">Dari</label>
            <DatePicker v-model="rangeStart" placeholder="Tanggal awal" :max="rangeEnd || ''" />
          </div>
          <div class="flex-1">
            <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5">Hingga</label>
            <DatePicker v-model="rangeEnd" placeholder="Tanggal akhir" :min="rangeStart || ''" />
          </div>
        </div>

        <p v-if="rangeSearchError" class="text-rose-400 text-sm">{{ rangeSearchError }}</p>

        <button
          @click="searchByDateRange"
          :disabled="rangeSearching"
          class="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          {{ rangeSearching ? 'Memuat...' : 'Tampilkan Pengeluaran' }}
        </button>
      </div>

      <!-- ═══ STEP: SELECT (mode manual) / DATE RESULTS (shared UI) ═══ -->
      <template v-else-if="step === 'select' || step === 'date-results'">
        <div v-if="step === 'select' && loadingExpenses" class="flex items-center justify-center py-16 flex-1">
          <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div v-else-if="step === 'select' && expenseError" class="flex flex-col items-center justify-center py-16 gap-3 flex-1">
          <p class="text-red-400 text-sm">{{ expenseError }}</p>
          <button @click="fetchUnpaidExpenses" class="text-emerald-400 text-sm hover:underline">Coba lagi</button>
        </div>
        <div v-else-if="pool.length === 0" class="flex flex-col items-center justify-center py-16 gap-3 flex-1">
          <p class="text-slate-500 text-sm">Tidak ada pengeluaran untuk ditampilkan.</p>
        </div>

        <div v-else class="flex flex-col flex-1 min-h-0">
          <div class="flex items-center justify-between px-6 py-3 bg-slate-900/40 border-b border-slate-700/30 shrink-0">
            <button
              v-if="step === 'date-results'"
              @click="step = 'date-input'"
              class="text-slate-400 hover:text-white text-xs"
            >
              ← Ubah rentang
            </button>
            <button v-else @click="backToMode" class="text-slate-400 hover:text-white text-xs">
              ← Kembali pilih metode
            </button>
            <span v-if="selectedIds.size > 0" class="text-xs text-emerald-400 font-medium">
              {{ selectedIds.size }} dipilih
            </span>
          </div>

          <div class="flex items-center justify-between px-6 py-2.5 border-b border-slate-700/20 shrink-0">
            <label class="flex items-center gap-3 cursor-pointer" @click="toggleAll">
              <div
                class="w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer"
                :class="allSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-500 hover:border-emerald-500'"
              >
                <svg v-if="allSelected" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div v-else-if="selectedIds.size > 0" class="w-2 h-0.5 bg-emerald-400 rounded"></div>
              </div>
              <span class="text-slate-300 text-sm">
                Pilih semua <span class="text-slate-500">({{ pool.length }} item)</span>
              </span>
            </label>
          </div>

          <div class="overflow-y-auto flex-1">
            <div
              v-for="expense in pool"
              :key="expense.id"
              class="flex items-center gap-4 px-6 py-3.5 border-b border-slate-700/20 hover:bg-slate-700/15 transition-colors cursor-pointer"
              :class="selectedIds.has(expense.id) ? 'bg-emerald-500/5' : ''"
              @click="toggleSelect(expense.id)"
            >
              <div
                class="shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all"
                :class="selectedIds.has(expense.id) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-500'"
              >
                <svg v-if="selectedIds.has(expense.id)" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-white text-sm font-medium truncate">{{ expense.title }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600/50">
                        {{ expense.category || '-' }}
                      </span>
                      <span class="text-slate-500 text-xs">{{ formatDate(expense.spentAt) }}</span>
                      <span v-if="expense.isSplitBill" class="text-xs text-violet-400">split</span>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <div v-if="expense.isSplitBill" class="flex flex-col items-end">
                      <span class="text-slate-500 text-xs line-through tabular-nums">{{ formatCurrency(expense.amount) }}</span>
                      <span class="text-emerald-400 font-semibold text-sm tabular-nums">{{ formatCurrency(expense.finalAmount) }}</span>
                    </div>
                    <span v-else class="text-emerald-400 font-semibold text-sm tabular-nums">
                      {{ formatCurrency(expense.finalAmount ?? expense.amount) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="shrink-0 border-t border-slate-700/50 px-6 py-4 bg-slate-900/30">
            <div class="flex items-center justify-between mb-4">
              <span class="text-slate-400 text-sm">
                Total dipilih <span class="text-slate-300">({{ selectedIds.size }} item)</span>
              </span>
              <span class="text-emerald-400 font-bold text-xl tabular-nums">{{ formatCurrency(totalAmount) }}</span>
            </div>
            <div class="flex gap-3">
              <button @click="emit('close')" class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm">
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

      <!-- ═══ STEP: CONFIRM (sama untuk semua mode) ═══ -->
      <template v-else-if="step === 'confirm'">
        <div class="flex flex-col flex-1 min-h-0">
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

          <div class="shrink-0 border-t border-slate-700/50 px-6 py-5 space-y-4 bg-slate-900/30">
            <div class="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
              <span class="text-emerald-300 text-sm font-medium">Total Pembayaran</span>
              <span class="text-emerald-400 font-bold text-2xl tabular-nums">{{ formatCurrency(totalAmount) }}</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5">Tanggal Bayar</label>
                <input
                  v-model="paidAt"
                  type="date"
                  class="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div>
                <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5">
                  Catatan <span class="text-slate-600 normal-case font-normal">(opsional)</span>
                </label>
                <input
                  v-model="note"
                  placeholder="mis. Bayar bareng..."
                  class="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-slate-500"
                />
              </div>
            </div>

            <p v-if="submitError" class="text-rose-400 text-sm">{{ submitError }}</p>

            <div class="flex gap-3">
              <button @click="goBackFromConfirm" class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm">
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