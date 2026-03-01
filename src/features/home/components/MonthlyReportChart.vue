<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js'

Chart.register(DoughnutController, ArcElement, Tooltip, Legend)

const canvasRef = ref(null)
let chartInstance = null

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)
const loading = ref(false)
const reportData = ref(null)
const error = ref(null)

const months = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]
const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0)

const hasData = computed(
  () => reportData.value && (reportData.value.paidAmount > 0 || reportData.value.unpaidAmount > 0),
)

// ✅ Watch hasData: dipanggil SETELAH Vue selesai render v-if/v-else
// sehingga canvasRef.value sudah pasti ada di DOM saat renderChart() dipanggil
watch(hasData, async (val) => {
  if (!val) return
  await nextTick()
  renderChart()
})

const fetchReport = async () => {
  loading.value = true
  error.value = null

  // Destroy chart lama sebelum loading
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  try {
    const res = await fetch(
      `http://localhost:3000/api/expense/stats/monthly/${selectedYear.value}/${selectedMonth.value}`,
    )
    const json = await res.json()
    // Set data → memicu watch(hasData) → nextTick → renderChart()
    reportData.value = json.data || json
  } catch {
    error.value = 'Gagal memuat data'
  } finally {
    loading.value = false
  }
}

const renderChart = () => {
  if (!canvasRef.value) return

  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  chartInstance = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels: ['Sudah Dibayar', 'Belum Dibayar'],
      datasets: [
        {
          data: [reportData.value.paidPercentage ?? 0, reportData.value.unpaidPercentage ?? 0],
          backgroundColor: ['rgba(52, 211, 153, 0.85)', 'rgba(244, 63, 94, 0.85)'],
          borderColor: ['rgba(52, 211, 153, 1)', 'rgba(244, 63, 94, 1)'],
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%`,
          },
        },
      },
    },
  })
}

// Ganti bulan/tahun: reset data dulu agar watch(hasData) terpicu ulang
watch([selectedYear, selectedMonth], () => {
  reportData.value = null
  fetchReport()
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

onMounted(fetchReport)
</script>

<template>
  <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
    <!-- Header + filter -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h3 class="text-white font-semibold text-base">Laporan Bulanan</h3>
        <p class="text-slate-400 text-xs mt-0.5">
          {{ months[selectedMonth - 1] }} {{ selectedYear }}
        </p>
      </div>
      <div class="flex gap-2">
        <select
          v-model="selectedMonth"
          class="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option v-for="(m, i) in months" :key="i" :value="i + 1">{{ m }}</option>
        </select>
        <select
          v-model="selectedYear"
          class="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="h-56 flex items-center justify-center">
      <div
        class="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"
      />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="h-56 flex items-center justify-center text-rose-400 text-sm">
      {{ error }}
    </div>

    <!-- Konten -->
    <div v-else>
      <div class="relative h-52 flex items-center justify-center">
        <!-- Tidak ada data -->
        <div v-if="!hasData" class="flex flex-col items-center gap-2 text-slate-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-10 h-10 opacity-30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span class="text-sm">Tidak ada data di bulan ini</span>
        </div>

        <template v-else>
          <!-- canvas ada di DOM saat hasData = true -->
          <canvas ref="canvasRef" class="h-full" />

          <!-- Teks di tengah lubang donut -->
          <div class="absolute flex flex-col items-center pointer-events-none select-none">
            <span class="text-slate-400 text-[10px] uppercase tracking-wider">Total</span>
            <span class="text-white font-bold text-sm leading-snug">
              {{ formatCurrency(reportData?.totalAmount) }}
            </span>
            <span class="text-slate-500 text-[10px] mt-0.5">
              {{ reportData?.totalCount ?? 0 }} transaksi
            </span>
          </div>
        </template>
      </div>

      <!-- Legend -->
      <div v-if="hasData" class="flex justify-center gap-6 mt-3">
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <span class="text-slate-400 text-xs">
            Dibayar &nbsp;<strong class="text-emerald-400"
              >{{ reportData?.paidPercentage?.toFixed(1) }}%</strong
            >
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
          <span class="text-slate-400 text-xs">
            Belum Bayar &nbsp;<strong class="text-rose-400"
              >{{ reportData?.unpaidPercentage?.toFixed(1) }}%</strong
            >
          </span>
        </div>
      </div>

      <!-- Summary badges -->
      <div class="grid grid-cols-3 gap-3 mt-4">
        <div class="bg-slate-700/50 rounded-xl p-3 text-center">
          <div class="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Total</div>
          <div class="text-white text-sm font-semibold">
            {{ formatCurrency(reportData?.totalAmount) }}
          </div>
          <div class="text-slate-500 text-[10px] mt-0.5">
            {{ reportData?.totalCount ?? 0 }} item
          </div>
        </div>
        <div class="bg-emerald-900/30 border border-emerald-800/40 rounded-xl p-3 text-center">
          <div class="text-emerald-400 text-[10px] uppercase tracking-wider mb-1">Dibayar</div>
          <div class="text-emerald-300 text-sm font-semibold">
            {{ formatCurrency(reportData?.paidAmount) }}
          </div>
          <div class="text-emerald-700 text-[10px] mt-0.5">
            {{ reportData?.paidCount ?? 0 }} item
          </div>
        </div>
        <div class="bg-rose-900/30 border border-rose-800/40 rounded-xl p-3 text-center">
          <div class="text-rose-400 text-[10px] uppercase tracking-wider mb-1">Belum Bayar</div>
          <div class="text-rose-300 text-sm font-semibold">
            {{ formatCurrency(reportData?.unpaidAmount) }}
          </div>
          <div class="text-rose-700 text-[10px] mt-0.5">
            {{ reportData?.unpaidCount ?? 0 }} item
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
