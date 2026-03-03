<script setup>
import { ref } from 'vue'

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

const submit = async () => {
  if (!form.value.title || !form.value.amount) {
    error.value = 'Nama dan jumlah wajib diisi'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('http://localhost:3000/api/expense', {
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

const formatNumber = (value) => {
  if (!value) return ''

  const number = value.toString().replace(/[^0-9]/g, '')
  return new Intl.NumberFormat('en-US').format(number)
}

const handleAmountInput = (event) => {
  const rawValue = event.target.value.replace(/[^0-9]/g, '')
  form.value.amount = formatNumber(rawValue)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
    <div
      class="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
    >
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
            xmlns="http://www.w3.org/2000/svg"
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

        <!-- <div>
          <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5"
            >Jumlah (Rp) *</label
          >
          <input
            v-model="form.amount"
            type="number"
            placeholder="0"
            class="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm placeholder:text-slate-500"
          />
        </div>

        <div>
          <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5"
            >Split Bill</label
          >
          <input
            type="checkbox"
            v-model="form.isSplitBill"
            class="w-5 h-5 accent-violet-600 cursor-pointer"
          />
        </div> -->

        <div>
          <label class="text-slate-400 text-xs uppercase tracking-wider block mb-1.5">
            Jumlah (Rp) *
          </label>

          <div class="flex items-center gap-3">
            <!-- Input Amount -->
            <input
              :value="form.amount"
              @input="handleAmountInput"
              type="text"
              inputmode="numeric"
              placeholder="0"
              class="flex-1 bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm placeholder:text-slate-500"
            />

            <!-- Split Bill Toggle -->
            <label
              class="flex items-center gap-2 cursor-pointer select-none bg-slate-700/60 px-3 py-2 rounded-lg border border-slate-600 hover:border-violet-500 transition-colors"
            >
              <input type="checkbox" v-model="form.isSplitBill" class="peer hidden" />

              <!-- Custom Box -->
              <div
                class="w-5 h-5 rounded-md border border-slate-500 flex items-center justify-center peer-checked:bg-violet-600 peer-checked:border-violet-600 transition-all"
              >
                <svg
                  v-if="form.isSplitBill"
                  xmlns="http://www.w3.org/2000/svg"
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
              >
                Split
              </span>
            </label>
          </div>
        </div>

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
            <input
              v-model="form.spentAt"
              type="date"
              class="w-full bg-slate-700 text-slate-200 rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>
        </div>

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
