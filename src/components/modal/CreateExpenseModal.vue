<script setup>
import { ref, computed } from 'vue'
import DatePicker from '../../components/datePicker/DatePicker.vue'

const emit = defineEmits(['close', 'created'])

const form = ref({
  title: '',
  amount: '',
  category: '',
  spentAt: new Date().toISOString().split('T')[0],
  isSplitBill: false,
  description: '',
})
const loading = ref(false)
const error = ref('')
const showSuggestions = ref(false)

const categories = [
  'Makanan',
  'Transportasi',
  'Utilitas',
  'Hiburan',
  'Kesehatan',
  'Belanja',
  'Pendidikan',
  'Lainnya',
]

// ── Amount suggestions ──────────────────────────────────────
// Given raw digits e.g. "20", suggest ["20", "200", "2.000", "20.000", "200.000", "2.000.000"]
const amountSuggestions = computed(() => {
  const raw = form.value.amount
  if (!raw) return []

  const num = parseInt(raw, 10)
  if (isNaN(num) || num === 0) return []

  // Generate multipliers: x1, x10, x100, x1000, x10000, x100000
  const multipliers = [1, 10, 100, 1_000, 10_000, 100_000]
  const seen = new Set()
  const results = []

  for (const m of multipliers) {
    const val = num * m
    if (val > 1_000_000_000) break // cap at 1B
    if (!seen.has(val)) {
      seen.add(val)
      results.push(val)
    }
  }

  // Filter: only show values >= 1000 (sensible rupiah amounts), plus exact input
  return results.filter((v) => v >= 1_000 || v === num).slice(0, 5)
})

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val)

const formatDisplay = (val) => new Intl.NumberFormat('id-ID').format(val)

// ── Handlers ────────────────────────────────────────────────
const handleAmountInput = (event) => {
  const raw = event.target.value.replace(/[^0-9]/g, '')
  form.value.amount = raw
  showSuggestions.value = raw.length > 0
}

const selectSuggestion = (val) => {
  form.value.amount = String(val)
  showSuggestions.value = false
}

const handleAmountBlur = () => {
  // Delay to allow click on suggestion to register first
  setTimeout(() => {
    showSuggestions.value = false
  }, 150)
}

const handleAmountFocus = () => {
  if (form.value.amount) showSuggestions.value = true
}

// Formatted display value for the input
const displayAmount = computed(() =>
  form.value.amount ? new Intl.NumberFormat('id-ID').format(Number(form.value.amount)) : '',
)

// ── Submit ───────────────────────────────────────────────────
const submit = async () => {
  if (!form.value.title || !form.value.amount) {
    error.value = 'Nama dan jumlah wajib diisi'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const res = await fetch(`${API_URL}/expense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form.value, amount: Number(form.value.amount) }),
    })
    if (!res.ok) throw new Error('Gagal menyimpan')
    emit('created')
    emit('close')
  } catch (e) {
    error.value = e.message || 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
    <div
      class="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-white font-semibold text-lg">Tambah Pengeluaran</h2>
          <p class="text-slate-400 text-xs mt-0.5">Catat pengeluaran baru</p>
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

      <div class="space-y-4">
        <!-- Nama -->
        <div>
          <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5"
            >Nama Pengeluaran *</label
          >
          <input
            v-model="form.title"
            placeholder="mis. Makan siang, Bensin..."
            class="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm placeholder:text-slate-500"
          />
        </div>

        <!-- Jumlah + Split -->
        <div>
          <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5"
            >Jumlah (Rp) *</label
          >
          <div class="flex items-center gap-3">
            <!-- Amount input + suggestions -->
            <div class="relative flex-1">
              <input
                :value="displayAmount"
                @input="handleAmountInput"
                @focus="handleAmountFocus"
                @blur="handleAmountBlur"
                type="text"
                inputmode="numeric"
                placeholder="0"
                class="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm placeholder:text-slate-500"
              />

              <!-- Suggestions dropdown -->
              <Transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 translate-y-1 scale-98"
                enter-to-class="opacity-100 translate-y-0 scale-100"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0 translate-y-1"
              >
                <div
                  v-if="showSuggestions && amountSuggestions.length"
                  class="absolute top-full left-0 right-0 mt-1.5 bg-slate-750 border border-slate-600 rounded-xl shadow-xl z-10 overflow-hidden"
                  style="background: #1e293b"
                >
                  <div class="px-3 py-1.5 border-b border-slate-700/60">
                    <span class="text-slate-500 text-xs">Pilih nominal</span>
                  </div>
                  <button
                    v-for="val in amountSuggestions"
                    :key="val"
                    @mousedown.prevent="selectSuggestion(val)"
                    class="w-full flex items-center justify-between px-3 py-2 hover:bg-violet-500/10 transition-colors group"
                  >
                    <span class="text-slate-200 text-sm font-medium tabular-nums">
                      {{ formatDisplay(val) }}
                    </span>
                    <span
                      class="text-slate-500 text-xs group-hover:text-violet-400 transition-colors"
                    >
                      {{ formatRupiah(val) }}
                    </span>
                  </button>
                </div>
              </Transition>
            </div>

            <!-- Split Bill Toggle -->
            <label
              class="flex items-center gap-2 cursor-pointer select-none bg-slate-700/60 px-3 py-2 rounded-lg border border-slate-600 hover:border-violet-500 transition-colors"
            >
              <input type="checkbox" v-model="form.isSplitBill" class="peer hidden" />
              <div
                class="w-5 h-5 rounded-md border border-slate-500 flex items-center justify-center peer-checked:bg-violet-600 peer-checked:border-violet-600 transition-all"
              >
                <svg
                  v-if="form.isSplitBill"
                  class="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span
                :class="form.isSplitBill ? 'text-violet-400' : 'text-slate-400'"
                class="text-xs font-medium transition-colors"
                >Split</span
              >
            </label>
          </div>
        </div>

        <!-- Kategori + Tanggal -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5"
              >Kategori</label
            >
            <select
              v-model="form.category"
              class="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            >
              <option value="">Pilih kategori</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div>
            <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5"
              >Tanggal *</label
            >
            <DatePicker v-model="form.spentAt" placeholder="Pilih tanggal" />
          </div>
        </div>

        <!-- Keterangan -->
        <div>
          <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5"
            >Keterangan</label
          >
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="Opsional..."
            class="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm placeholder:text-slate-500 resize-none"
          />
        </div>

        <p v-if="error" class="text-rose-400 text-sm">{{ error }}</p>

        <!-- Buttons -->
        <div class="flex gap-3 pt-2">
          <button
            @click="emit('close')"
            class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            Batal
          </button>
          <button
            @click="submit"
            :disabled="loading"
            class="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            {{ loading ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
