<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  expense: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'updated'])

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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

// Snapshot nilai asli dari server untuk dirty-check
const original = {
  title: props.expense.title ?? '',
  amount: props.expense.amount ?? '',
  category: props.expense.category ?? '',
  isSplitBill: props.expense.isSplitBill ?? false,
  note: props.expense.note ?? '',
  spentAt: props.expense.spentAt ? new Date(props.expense.spentAt).toISOString().split('T')[0] : '',
}

// Form state (copy dari original)
const form = ref({ ...original })

const loading = ref(false)
const error = ref('')

// Format angka dengan pemisah ribuan
const formatNumber = (value) => {
  if (!value && value !== 0) return ''
  const number = value.toString().replace(/[^0-9]/g, '')
  return new Intl.NumberFormat('en-US').format(number)
}

const handleAmountInput = (event) => {
  const rawValue = event.target.value.replace(/[^0-9]/g, '')
  form.value.amount = rawValue ? Number(rawValue) : ''
}

// Hanya field yang benar-benar berubah dari original
const dirtyPayload = computed(() => {
  const payload = {}
  if (form.value.title !== original.title) payload.title = form.value.title
  if (Number(form.value.amount) !== Number(original.amount))
    payload.amount = Number(form.value.amount)
  if (form.value.category !== original.category) payload.category = form.value.category
  if (form.value.isSplitBill !== original.isSplitBill) payload.isSplitBill = form.value.isSplitBill
  if (form.value.note !== original.note) payload.note = form.value.note
  if (form.value.spentAt !== original.spentAt) payload.spentAt = form.value.spentAt
  return payload
})

const isDirty = computed(() => Object.keys(dirtyPayload.value).length > 0)

const changedFields = computed(() => Object.keys(dirtyPayload.value))

const submit = async () => {
  if (!isDirty.value) {
    emit('close')
    return
  }

  if (dirtyPayload.value.title !== undefined && !dirtyPayload.value.title.trim()) {
    error.value = 'Nama pengeluaran tidak boleh kosong'
    return
  }
  if (
    dirtyPayload.value.amount !== undefined &&
    (!dirtyPayload.value.amount || dirtyPayload.value.amount <= 0)
  ) {
    error.value = 'Jumlah harus lebih dari 0'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res = await fetch(`${BASE_URL}/expense/${props.expense.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dirtyPayload.value),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json?.message || 'Gagal memperbarui pengeluaran')
    }

    emit('updated')
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
          <h2 class="text-white font-semibold text-lg">Edit Pengeluaran</h2>
          <p class="text-slate-400 text-xs mt-0.5">Hanya field yang diubah yang akan disimpan</p>
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
        <!-- Title -->
        <div>
          <label
            class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5 flex items-center gap-2"
          >
            Nama Pengeluaran
            <span
              v-if="changedFields.includes('title')"
              class="text-violet-400 normal-case font-normal tracking-normal"
              >● diubah</span
            >
          </label>
          <input
            v-model="form.title"
            placeholder="mis. Makan siang, Bensin..."
            :class="[
              'w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 text-sm placeholder:text-slate-500 transition-colors',
              changedFields.includes('title')
                ? 'border-violet-500/60 focus:ring-violet-500'
                : 'border-slate-600 focus:ring-violet-500',
            ]"
          />
        </div>

        <!-- Amount + Split Bill -->
        <div>
          <label
            class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5 flex items-center gap-2"
          >
            Jumlah (Rp)
            <span
              v-if="changedFields.includes('amount')"
              class="text-violet-400 normal-case font-normal tracking-normal"
              >● diubah</span
            >
          </label>
          <div class="flex items-center gap-3">
            <input
              :value="formatNumber(form.amount)"
              @input="handleAmountInput"
              type="text"
              inputmode="numeric"
              placeholder="0"
              :class="[
                'flex-1 bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 text-sm placeholder:text-slate-500 transition-colors',
                changedFields.includes('amount')
                  ? 'border-violet-500/60 focus:ring-violet-500'
                  : 'border-slate-600 focus:ring-violet-500',
              ]"
            />

            <!-- Split Bill toggle -->
            <label
              class="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg border transition-colors"
              :class="
                changedFields.includes('isSplitBill')
                  ? 'bg-violet-500/10 border-violet-500/50'
                  : 'bg-slate-700/60 border-slate-600 hover:border-violet-500'
              "
            >
              <input type="checkbox" v-model="form.isSplitBill" class="peer hidden" />
              <div
                class="w-5 h-5 rounded-md border border-slate-500 flex items-center justify-center transition-all"
                :class="form.isSplitBill ? 'bg-violet-600 border-violet-600' : ''"
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

        <!-- Category + Date -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label
              class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5 flex items-center gap-1.5"
            >
              Kategori
              <span
                v-if="changedFields.includes('category')"
                class="text-violet-400 normal-case font-normal tracking-normal"
                >●</span
              >
            </label>
            <select
              v-model="form.category"
              :class="[
                'w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm transition-colors',
                changedFields.includes('category') ? 'border-violet-500/60' : 'border-slate-600',
              ]"
            >
              <option value="">Pilih kategori</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div>
            <label
              class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5 flex items-center gap-1.5"
            >
              Tanggal
              <span
                v-if="changedFields.includes('spentAt')"
                class="text-violet-400 normal-case font-normal tracking-normal"
                >●</span
              >
            </label>
            <input
              v-model="form.spentAt"
              type="date"
              :class="[
                'w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm transition-colors',
                changedFields.includes('spentAt') ? 'border-violet-500/60' : 'border-slate-600',
              ]"
            />
          </div>
        </div>

        <!-- Note -->
        <div>
          <label
            class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5 flex items-center gap-2"
          >
            Catatan
            <span
              v-if="changedFields.includes('note')"
              class="text-violet-400 normal-case font-normal tracking-normal"
              >● diubah</span
            >
          </label>
          <textarea
            v-model="form.note"
            rows="2"
            placeholder="Opsional..."
            :class="[
              'w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm placeholder:text-slate-500 resize-none transition-colors',
              changedFields.includes('note') ? 'border-violet-500/60' : 'border-slate-600',
            ]"
          />
        </div>

        <!-- Dirty summary -->
        <div
          v-if="isDirty"
          class="flex items-start gap-2 bg-violet-500/10 border border-violet-500/25 rounded-xl px-3 py-2.5"
        >
          <svg
            class="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-violet-300 text-xs">
            Akan memperbarui: <span class="font-medium">{{ changedFields.join(', ') }}</span>
          </p>
        </div>
        <div
          v-else
          class="flex items-center gap-2 bg-slate-700/30 border border-slate-600/30 rounded-xl px-3 py-2.5"
        >
          <svg
            class="w-3.5 h-3.5 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-slate-500 text-xs">Belum ada perubahan</p>
        </div>

        <p v-if="error" class="text-rose-400 text-sm">{{ error }}</p>

        <!-- Actions -->
        <div class="flex gap-3 pt-1">
          <button
            @click="emit('close')"
            class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            Batal
          </button>
          <button
            @click="submit"
            :disabled="loading"
            :class="[
              'flex-1 font-semibold py-2.5 rounded-xl transition-all text-sm',
              isDirty
                ? 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed',
            ]"
          >
            {{ loading ? 'Menyimpan...' : isDirty ? 'Simpan Perubahan' : 'Tidak Ada Perubahan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
