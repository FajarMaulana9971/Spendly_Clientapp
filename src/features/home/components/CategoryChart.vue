<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js'

Chart.register(DoughnutController, ArcElement, Tooltip, Legend)

const canvasRef = ref(null)
const categories = ref([])
const loading = ref(true)

const COLORS = [
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#10b981',
  '#f43f5e',
  '#3b82f6',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#6366f1',
]

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0)

onMounted(async () => {
  try {
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const res = await fetch(`${BASE_URL}/expense/stats/category`)
    const json = await res.json()
    categories.value = json.data || json || []
    renderChart()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
  await nextTick()
  renderChart()
})

const renderChart = async () => {
  if (!canvasRef.value || !categories.value.length) return

  // const { Chart, registerables } = await import('https://cdn.jsdelivr.net/npm/chart.js@4/+esm')
  // Chart.register(...registerables)

  new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels: categories.value.map((c) => c.category || c.name),
      datasets: [
        {
          data: categories.value.map((c) => c.totalAmount || c.total || c.amount || 0),
          backgroundColor: COLORS.slice(0, categories.value.length),
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  })
}
</script>

<template>
  <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-5 h-full">
    <h3 class="text-white font-semibold text-base mb-1">Kategori</h3>
    <p class="text-slate-400 text-xs mb-4">Distribusi pengeluaran</p>

    <div v-if="loading" class="h-48 flex items-center justify-center">
      <div
        class="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"
      />
    </div>
    <div
      v-else-if="!categories.length"
      class="h-48 flex items-center justify-center text-slate-500 text-sm"
    >
      Tidak ada data
    </div>
    <div v-else>
      <div class="h-44">
        <canvas ref="canvasRef" />
      </div>
      <div class="mt-4 space-y-2 max-h-40 overflow-y-auto">
        <div
          v-for="(cat, i) in categories"
          :key="i"
          class="flex items-center justify-between text-xs"
        >
          <div class="flex items-center gap-2">
            <div
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: COLORS[i] }"
            />
            <span class="text-slate-300 truncate max-w-24">{{ cat.category || cat.name }}</span>
          </div>
          <span class="text-slate-400">{{
            formatCurrency(cat.totalAmount || cat.total || cat.amount)
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
