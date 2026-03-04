<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  paymentId: { type: String, required: true },
})

const emit = defineEmits(['close'])

const BASE_URL = 'http://localhost:3000/api'

const payment = ref(null)
const loading = ref(true)
const error = ref(null)

const fetchDetail = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${BASE_URL}/payment/${props.paymentId}`)
    const json = await res.json()
    payment.value = json.data
  } catch {
    error.value = 'Gagal memuat detail pembayaran.'
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

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-'
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />

    <div
      class="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[88vh]"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-5 border-b border-slate-700/50 shrink-0"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
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
          <div>
            <h2 class="text-white font-semibold text-base">Detail Pembayaran</h2>
            <p class="text-slate-500 text-xs">#{{ paymentId }}</p>
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

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16 flex-1">
        <div
          class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"
        ></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-16 gap-3 flex-1">
        <p class="text-red-400 text-sm">{{ error }}</p>
        <button @click="fetchDetail" class="text-emerald-400 text-sm hover:underline">
          Coba lagi
        </button>
      </div>

      <!-- Content -->
      <div v-else-if="payment" class="flex flex-col flex-1 min-h-0">
        <!-- Payment meta -->
        <div class="px-6 py-5 space-y-4 shrink-0">
          <!-- Total -->
          <div
            class="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-5 py-4 flex items-center justify-between"
          >
            <span class="text-emerald-300 text-sm font-medium">Total Pembayaran</span>
            <span class="text-emerald-400 font-bold text-2xl tabular-nums">{{
              formatCurrency(payment.totalAmount)
            }}</span>
          </div>

          <!-- Meta grid -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-slate-700/30 border border-slate-600/30 rounded-xl px-4 py-3">
              <p class="text-slate-500 text-xs uppercase tracking-wider mb-1">Dibayar pada</p>
              <p class="text-white text-sm font-medium">{{ formatDateTime(payment.paidAt) }}</p>
            </div>
            <div class="bg-slate-700/30 border border-slate-600/30 rounded-xl px-4 py-3">
              <p class="text-slate-500 text-xs uppercase tracking-wider mb-1">Jumlah Item</p>
              <p class="text-white text-sm font-medium">
                {{ payment.expenses?.length ?? 0 }} pengeluaran
              </p>
            </div>
          </div>

          <!-- Note -->
          <div
            v-if="payment.note"
            class="bg-slate-700/30 border border-slate-600/30 rounded-xl px-4 py-3"
          >
            <p class="text-slate-500 text-xs uppercase tracking-wider mb-1">Catatan</p>
            <p class="text-slate-300 text-sm">{{ payment.note }}</p>
          </div>
        </div>

        <!-- Expense list -->
        <div class="flex-1 min-h-0 overflow-y-auto border-t border-slate-700/40">
          <div class="px-6 py-3 bg-slate-900/30 border-b border-slate-700/20">
            <p class="text-slate-400 text-xs uppercase tracking-wider font-medium">
              Pengeluaran dalam pembayaran ini
            </p>
          </div>

          <div
            v-for="exp in payment.expenses"
            :key="exp.id"
            class="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-slate-700/20 hover:bg-slate-700/10 transition-colors"
          >
            <div class="min-w-0 flex-1">
              <p class="text-white text-sm font-medium truncate">{{ exp.title }}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600/50"
                >
                  {{ exp.category || '-' }}
                </span>
                <span class="text-slate-500 text-xs">{{ formatDate(exp.spentAt) }}</span>
                <span v-if="exp.isSplitBill" class="text-xs text-violet-400 font-medium"
                  >split</span
                >
              </div>
              <p v-if="exp.note" class="text-slate-500 text-xs mt-0.5 truncate">{{ exp.note }}</p>
            </div>

            <div class="text-right shrink-0">
              <div v-if="exp.isSplitBill" class="flex flex-col items-end gap-0.5">
                <span class="text-slate-500 text-xs line-through tabular-nums">{{
                  formatCurrency(exp.amount)
                }}</span>
                <span class="text-emerald-400 font-semibold text-sm tabular-nums">{{
                  formatCurrency(exp.finalAmount)
                }}</span>
              </div>
              <span v-else class="text-emerald-400 font-semibold text-sm tabular-nums">
                {{ formatCurrency(exp.finalAmount ?? exp.amount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-slate-700/50 shrink-0">
          <button
            @click="emit('close')"
            class="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
