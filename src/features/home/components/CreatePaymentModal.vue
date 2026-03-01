<script setup>
import { ref, onMounted, computed } from 'vue'

const emit = defineEmits(['close', 'created'])

const expenses = ref([])
const selected = ref([])
const loading = ref(false)
const fetching = ref(true)
const error = ref('')

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0)

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/expense')
    const json = await res.json()
    const all = json.data || json || []
    expenses.value = all.filter((e) => e.isPaid == false && !e.paymentId)
  } catch (e) {
    error.value = 'Gagal memuat pengeluaran'
  } finally {
    fetching.value = false
  }
})

const totalSelected = computed(() =>
  selected.value.reduce((s, id) => {
    const exp = expenses.value.find((e) => e.id === id)
    return s + (exp?.amount || 0)
  }, 0),
)

const toggleSelect = (id) => {
  const idx = selected.value.indexOf(id)
  if (idx === -1) selected.value.push(id)
  else selected.value.splice(idx, 1)
}

const selectAll = () => {
  if (selected.value.length === expenses.value.length) selected.value = []
  else selected.value = expenses.value.map((e) => e.id)
}

const submit = async () => {
  if (!selected.value.length) {
    error.value = 'Pilih minimal satu pengeluaran'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('http://localhost:3000/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseIds: selected.value }),
    })
    if (!res.ok) throw new Error('Gagal memproses pembayaran')
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
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-white font-semibold text-lg">Buat Pembayaran</h2>
          <p class="text-slate-400 text-xs mt-0.5">Pilih pengeluaran yang ingin dibayar</p>
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

      <!-- Expenses list -->
      <div v-if="fetching" class="space-y-2 mb-4">
        <div v-for="i in 3" :key="i" class="h-14 rounded-xl bg-slate-700/50 animate-pulse" />
      </div>
      <div v-else-if="!expenses.length" class="py-8 text-center mb-4">
        <div class="text-3xl mb-2">🎉</div>
        <p class="text-emerald-400 text-sm">Tidak ada pengeluaran yang belum dibayar</p>
      </div>
      <div v-else>
        <div class="flex items-center justify-between mb-2">
          <span class="text-slate-400 text-xs">{{ expenses.length }} pengeluaran tersedia</span>
          <button
            @click="selectAll"
            class="text-violet-400 text-xs hover:text-violet-300 transition-colors"
          >
            {{ selected.length === expenses.length ? 'Batalkan Semua' : 'Pilih Semua' }}
          </button>
        </div>
        <div class="max-h-56 overflow-y-auto space-y-2 mb-4 pr-1">
          <div
            v-for="exp in expenses"
            :key="exp.id"
            @click="toggleSelect(exp.id)"
            :class="[
              'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all',
              selected.includes(exp.id)
                ? 'border-violet-500 bg-violet-900/30'
                : 'border-slate-700 bg-slate-700/30 hover:border-slate-600',
            ]"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                :class="[
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  selected.includes(exp.id)
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-slate-500',
                ]"
              >
                <svg
                  v-if="selected.includes(exp.id)"
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
              <div class="min-w-0">
                <div class="text-slate-200 text-sm font-medium truncate">
                  {{ exp.title || exp.name }}
                </div>
                <div v-if="exp.category" class="text-slate-500 text-xs">{{ exp.category }}</div>
              </div>
            </div>
            <span class="text-slate-200 text-sm font-semibold ml-2 flex-shrink-0">{{
              formatCurrency(exp.amount)
            }}</span>
          </div>
        </div>

        <!-- Total -->
        <div class="bg-slate-700/50 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span class="text-slate-400 text-sm">Total Pembayaran</span>
          <span class="text-emerald-400 font-bold text-lg">{{
            formatCurrency(totalSelected)
          }}</span>
        </div>
      </div>

      <p v-if="error" class="text-rose-400 text-sm mb-3">{{ error }}</p>

      <div class="flex gap-3">
        <button
          @click="emit('close')"
          class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          Batal
        </button>
        <button
          v-if="expenses.length > 0"
          @click="submit"
          :disabled="loading || !selected.length"
          class="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          {{ loading ? 'Memproses...' : `Bayar (${selected.length})` }}
        </button>
      </div>
    </div>
  </div>
</template>
