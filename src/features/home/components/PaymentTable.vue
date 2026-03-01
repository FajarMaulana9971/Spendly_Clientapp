<script setup>
import { ref, onMounted } from 'vue'

const payments = ref([])
const loading = ref(true)

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0)

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/payment')
    const json = await res.json()
    payments.value = json.data.payments || json || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-5 h-full">
    <div class="mb-4">
      <h3 class="text-white font-semibold text-base">Riwayat Pembayaran</h3>
      <p class="text-slate-400 text-xs mt-0.5">{{ payments.length }} pembayaran</p>
    </div>

    <div class="overflow-x-auto">
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 5" :key="i" class="h-10 rounded-lg bg-slate-700/50 animate-pulse" />
      </div>
      <div v-else-if="!payments.length" class="py-10 text-center text-slate-500 text-sm">
        Belum ada pembayaran
      </div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-slate-400 text-xs uppercase tracking-wider">
            <!-- <th class="text-left pb-2 font-medium">ID</th> -->
            <th class="text-center pb-2 font-medium hidden sm:table-cell">Tanggal</th>
            <th class="text-right pb-2 font-medium">Total</th>
            <th class="text-center pb-2 font-medium hidden md:table-cell">Note</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-700/50">
          <tr v-for="pay in payments" :key="pay.id" class="hover:bg-slate-700/30 transition-colors">
            <!-- <td class="py-2.5 pr-3">
              <div class="text-slate-200 font-mono text-xs">#{{ String(pay.id).slice(0, 8) }}</div>
              <div v-if="pay.method || pay.paymentMethod" class="text-slate-500 text-xs">
                {{ pay.method || pay.paymentMethod }}
              </div>
            </td> -->
            <td class="py-2.5 text-center text-slate-400 text-xs hidden sm:table-cell">
              {{ formatDate(pay.paidAt) }}
            </td>
            <td class="py-2.5 text-right">
              <span class="text-emerald-400 font-semibold">{{
                formatCurrency(pay.totalAmount)
              }}</span>
            </td>
            <td class="py-2.5 text-center text-slate-400 text-xs hidden sm:table-cell">
              {{ pay.note }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
