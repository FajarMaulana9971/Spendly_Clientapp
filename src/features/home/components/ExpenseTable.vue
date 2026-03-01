<script setup>
import { ref, onMounted, computed } from 'vue'

const emit = defineEmits(['pay'])
const expenses = ref([])
const loading = ref(true)
const search = ref('')
const filter = ref('all')

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
    const res = await fetch('http://localhost:3000/api/expense/specific')
    const json = await res.json()
    expenses.value = json.data.expenses || json || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  let list = expenses.value
  if (filter.value === 'paid') list = list.filter((e) => e.isPaid == true)
  if (filter.value === 'unpaid') list = list.filter((e) => e.isPaid == false)
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter((e) => (e.title || e.name || '').toLowerCase().includes(s))
  }

  return list
})

const getDisplayAmount = (exp) => {
  return exp.isSplitBill ? exp.finalAmount : exp.amount
}

// const handleDelete = async (id) => {
//   if (!confirm('Hapus pengeluaran ini?')) return
//   try {
//     await fetch(`http://localhost:3000/api/expense/${id}`, { method: 'DELETE' })
//     expenses.value = expenses.value.filter((e) => e.id !== id)
//   } catch (e) {
//     alert('Gagal menghapus')
//   }
// }
</script>

<template>
  <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-white font-semibold text-base">Daftar Pengeluaran</h3>
        <p class="text-slate-400 text-xs mt-0.5">
          {{ filtered.length }} dari {{ expenses.length }} transaksi
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 mb-4">
      <input
        v-model="search"
        placeholder="Cari..."
        class="flex-1 min-w-32 bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500"
      />
      <select
        v-model="filter"
        class="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        <option value="all">Semua</option>
        <option value="paid">Dibayar</option>
        <option value="unpaid">Belum Bayar</option>
      </select>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 5" :key="i" class="h-10 rounded-lg bg-slate-700/50 animate-pulse" />
      </div>
      <div v-else-if="!filtered.length" class="py-10 text-center text-slate-500 text-sm">
        Tidak ada data
      </div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-slate-400 text-xs uppercase tracking-wider">
            <th class="text-left pb-2 font-medium">Nama</th>
            <th class="text-right pb-2 font-medium">Jumlah</th>
            <th class="text-center pb-2 font-medium hidden sm:table-cell">Dibuat</th>
            <th class="text-center pb-2 font-medium hidden sm:table-cell">Pelunasan</th>
            <th class="text-center pb-2 font-medium">Status</th>
            <!-- <th class="pb-2"></th> -->
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-700/50">
          <tr
            v-for="exp in filtered"
            :key="exp.id"
            class="group hover:bg-slate-700/30 transition-colors"
          >
            <td class="py-2.5 pr-3">
              <div class="text-slate-200 font-medium truncate max-w-36">
                {{ exp.title || exp.name || 'Pengeluaran' }}
              </div>
              <div v-if="exp.category" class="text-slate-500 text-xs">{{ exp.category }}</div>
            </td>
            <td class="py-2.5 text-right text-slate-200 font-medium">
              {{ formatCurrency(getDisplayAmount(exp)) }}
            </td>
            <td class="py-2.5 text-center text-slate-400 text-xs hidden sm:table-cell">
              {{ formatDate(exp.spentAt) }}
            </td>
            <td class="py-2.5 text-center text-slate-400 text-xs hidden sm:table-cell">
              {{ formatDate(exp.paymentPaidAt) }}
            </td>
            <td class="py-2.5 text-center">
              <span
                :class="
                  exp.isPaid || exp.paymentId
                    ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                    : 'bg-rose-900/50 text-rose-400 border border-rose-700/50'
                "
                class="text-xs px-2 py-0.5 rounded-full"
              >
                {{ exp.isPaid || exp.paymentId ? 'Lunas' : 'Belum' }}
              </span>
            </td>
            <!-- <td class="py-2.5 pl-2">
              <button
                @click="handleDelete(exp.id)"
                class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-400 p-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </td> -->
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
