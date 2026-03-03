<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  expenseId: {
    type: [String, Number],
    required: true,
  },
})

const emit = defineEmits(['close'])

const expense = ref(null)
const loading = ref(false)
const error = ref(null)

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const fetchDetail = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${BASE_URL}/expense/${props.expenseId}`)
    const json = await res.json()
    expense.value = json.data
  } catch {
    error.value = 'Gagal memuat detail pengeluaran.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)

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
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-modal"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-slate-700/50">
        <h2 class="text-lg font-bold text-white">Detail Pengeluaran</h2>
        <button
          @click="emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="px-6 py-6">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
          <div
            class="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-center py-12">
          <p class="text-red-400 text-sm">{{ error }}</p>
          <button @click="fetchDetail" class="mt-2 text-violet-400 text-sm hover:underline">
            Coba lagi
          </button>
        </div>

        <!-- Content -->
        <div v-else-if="expense" class="space-y-5">
          <!-- Status banner -->
          <div
            :class="
              expense.isPaid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            "
            class="flex items-center gap-3 px-4 py-3 rounded-xl border"
          >
            <svg
              v-if="expense.isPaid"
              class="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <svg
              v-else
              class="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="font-semibold text-sm">
              {{
                expense.isPaid ? 'Pengeluaran ini sudah dibayar' : 'Pengeluaran ini belum dibayar'
              }}
            </span>
          </div>

          <!-- Title & amount -->
          <div class="bg-slate-800/60 rounded-xl p-4 flex items-start justify-between gap-4">
            <div>
              <p class="text-xs text-slate-500 mb-1">Judul</p>
              <p class="text-white font-semibold text-base">{{ expense.title }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs text-slate-500 mb-1">Total Akhir</p>
              <p class="text-emerald-400 font-bold text-lg tabular-nums">
                {{ formatCurrency(expense.finalAmount) }}
              </p>
            </div>
          </div>

          <!-- Details grid -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-slate-800/40 rounded-xl p-3">
              <p class="text-xs text-slate-500 mb-1">Kategori</p>
              <p class="text-slate-200 text-sm font-medium">{{ expense.category || '-' }}</p>
            </div>
            <div class="bg-slate-800/40 rounded-xl p-3">
              <p class="text-xs text-slate-500 mb-1">Tanggal</p>
              <p class="text-slate-200 text-sm font-medium">{{ formatDate(expense.spentAt) }}</p>
            </div>
            <div class="bg-slate-800/40 rounded-xl p-3">
              <p class="text-xs text-slate-500 mb-1">Jumlah Awal</p>
              <p class="text-slate-200 text-sm font-medium tabular-nums">
                {{ formatCurrency(expense.amount) }}
              </p>
            </div>
            <div class="bg-slate-800/40 rounded-xl p-3">
              <p class="text-xs text-slate-500 mb-1">Split Bill</p>
              <p class="text-slate-200 text-sm font-medium">
                {{ expense.isSplitBill ? 'Ya' : 'Tidak' }}
              </p>
            </div>
          </div>

          <!-- Note -->
          <div v-if="expense.note" class="bg-slate-800/40 rounded-xl p-4">
            <p class="text-xs text-slate-500 mb-1.5">Catatan</p>
            <p class="text-slate-300 text-sm leading-relaxed">{{ expense.note }}</p>
          </div>

          <!-- Payment info (if paid) -->
          <div v-if="expense.isPaid && expense.payment" class="bg-slate-800/40 rounded-xl p-4">
            <p class="text-xs text-slate-500 mb-3">Info Pembayaran</p>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p class="text-xs text-slate-500">Total Bayar</p>
                <p class="text-emerald-400 font-medium tabular-nums">
                  {{ formatCurrency(expense.payment.totalAmount) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Tanggal Bayar</p>
                <p class="text-slate-200">{{ formatDate(expense.payment.paidAt) }}</p>
              </div>
              <div v-if="expense.payment.note" class="col-span-2">
                <p class="text-xs text-slate-500">Catatan</p>
                <p class="text-slate-300">{{ expense.payment.note }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 pb-6">
        <button
          @click="emit('close')"
          class="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-modal {
  animation: modal-in 0.2s ease-out;
}
</style>
