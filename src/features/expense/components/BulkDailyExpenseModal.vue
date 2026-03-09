<script setup>
import { ref, computed, watch } from 'vue'
import DatePicker from '../../../components/datePicker/DatePicker.vue'

const emit = defineEmits(['close', 'created'])

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// --- State ---
const step = ref(1)
const loadingStatus = ref(false)
const submitting = ref(false)
const submitDone = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const today = new Date().toISOString().split('T')[0]
const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0]

const startDate = ref(thirtyDaysAgo)
const endDate = ref(today)

const dailyStatus = ref([])
const selectedDates = ref(new Set())

// --- Computed ---
const availableDates = computed(() => dailyStatus.value.filter((d) => !d.exists))
const alreadyExistsDates = computed(() => dailyStatus.value.filter((d) => d.exists))

const allAvailableSelected = computed(
  () =>
    availableDates.value.length > 0 &&
    availableDates.value.every((d) => selectedDates.value.has(d.date)),
)

const totalAmount = computed(() => selectedDates.value.size * 15000)

// --- Methods ---
const fetchDailyStatus = async () => {
  if (!startDate.value || !endDate.value) {
    errorMsg.value = 'Pilih tanggal awal dan akhir terlebih dahulu.'
    return
  }
  loadingStatus.value = true
  errorMsg.value = ''
  try {
    const res = await fetch(
      `${BASE_URL}/expenses/daily-status?startDate=${startDate.value}&endDate=${endDate.value}`,
    )
    const json = await res.json()
    if (!json.success) throw new Error(json.message || 'Gagal memuat status harian')
    dailyStatus.value = json.data
    selectedDates.value = new Set(json.data.filter((d) => !d.exists).map((d) => d.date))
    step.value = 2
  } catch (e) {
    errorMsg.value = e.message || 'Gagal memuat status harian.'
  } finally {
    loadingStatus.value = false
  }
}

const toggleDate = (date) => {
  const s = new Set(selectedDates.value)
  s.has(date) ? s.delete(date) : s.add(date)
  selectedDates.value = s
}

const toggleAll = () => {
  if (allAvailableSelected.value) {
    selectedDates.value = new Set()
  } else {
    selectedDates.value = new Set(availableDates.value.map((d) => d.date))
  }
}

const submitBulk = async () => {
  if (selectedDates.value.size === 0) {
    errorMsg.value = 'Pilih minimal satu tanggal.'
    return
  }
  submitting.value = true
  submitDone.value = false
  errorMsg.value = ''
  try {
    const expenses = Array.from(selectedDates.value)
      .sort()
      .map((date) => ({
        title: 'Biaya harian',
        amount: 15000,
        category: 'Harian',
        isSplitBill: false,
        note: 'Biaya harian',
        spentAt: date,
      }))

    const res = await fetch(`${BASE_URL}/expense/daily-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || 'Gagal menyimpan')

    // Show success state inside overlay before closing
    submitDone.value = true
    successMsg.value = `Berhasil menambahkan ${expenses.length} expense harian.`
    emit('created')
    setTimeout(() => emit('close'), 1800)
  } catch (e) {
    submitting.value = false
    errorMsg.value = e.message || 'Gagal menyimpan expense.'
  }
}

const formatDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatCurrency = (v) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v ?? 0)

watch([startDate, endDate], () => {
  if (step.value === 2) {
    step.value = 1
    dailyStatus.value = []
    selectedDates.value = new Set()
    errorMsg.value = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          class="absolute inset-0 bg-black/70 backdrop-blur-sm"
          @click="!submitting && $emit('close')"
        />

        <div
          class="relative bg-slate-800 border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          <!-- ── Saving overlay ── -->
          <Transition
            enter-active-class="transition duration-300"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-200"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="submitting"
              class="saving-overlay absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 rounded-2xl"
            >
              <!-- Success state -->
              <Transition
                enter-active-class="transition duration-400"
                enter-from-class="opacity-0 scale-75"
                enter-to-class="opacity-100 scale-100"
              >
                <div v-if="submitDone" class="flex flex-col items-center gap-4">
                  <div
                    class="success-ring flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50"
                  >
                    <svg
                      class="w-8 h-8 text-emerald-400 checkmark-draw"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div class="text-center">
                    <p class="text-white font-semibold text-sm">Berhasil Disimpan!</p>
                    <p class="text-slate-400 text-xs mt-1">{{ successMsg }}</p>
                  </div>
                </div>
              </Transition>

              <!-- Loading state -->
              <Transition
                enter-active-class="transition duration-200"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition duration-150"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <div v-if="!submitDone" class="flex flex-col items-center gap-4">
                  <!-- Orbital spinner -->
                  <div class="orbital-wrapper">
                    <div class="orbital-ring"></div>
                    <div class="orbital-ring ring-2"></div>
                    <div class="orbital-core">
                      <svg
                        class="w-5 h-5 text-violet-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>

                  <div class="text-center">
                    <p class="text-white font-semibold text-sm">Menyimpan expense...</p>
                    <p class="text-slate-400 text-xs mt-1">
                      {{ selectedDates.size }} hari · {{ formatCurrency(totalAmount) }}
                    </p>
                  </div>

                  <!-- Animated progress dots -->
                  <div class="flex items-center gap-1.5">
                    <span
                      class="saving-dot w-1.5 h-1.5 rounded-full bg-violet-400"
                      style="animation-delay: 0ms"
                    ></span>
                    <span
                      class="saving-dot w-1.5 h-1.5 rounded-full bg-violet-400"
                      style="animation-delay: 160ms"
                    ></span>
                    <span
                      class="saving-dot w-1.5 h-1.5 rounded-full bg-violet-400"
                      style="animation-delay: 320ms"
                    ></span>
                  </div>
                </div>
              </Transition>
            </div>
          </Transition>

          <!-- Header -->
          <div
            class="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 shrink-0"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4 text-violet-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 class="text-white font-semibold text-sm">Bulk Expense Harian</h2>
                <p class="text-slate-500 text-xs">Rp 15.000 / hari</p>
              </div>
            </div>
            <button
              @click="$emit('close')"
              :disabled="submitting"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Step indicator -->
          <div class="flex items-center gap-2 px-6 pt-4 pb-1 shrink-0">
            <div
              :class="[
                'flex items-center gap-1.5 text-xs font-medium',
                step >= 1 ? 'text-violet-400' : 'text-slate-600',
              ]"
            >
              <span
                :class="[
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs border',
                  step >= 1
                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                    : 'bg-slate-700 border-slate-600 text-slate-500',
                ]"
                >1</span
              >
              Pilih Rentang
            </div>
            <div :class="['flex-1 h-px', step >= 2 ? 'bg-violet-500/40' : 'bg-slate-700']"></div>
            <div
              :class="[
                'flex items-center gap-1.5 text-xs font-medium',
                step >= 2 ? 'text-violet-400' : 'text-slate-600',
              ]"
            >
              <span
                :class="[
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs border',
                  step >= 2
                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                    : 'bg-slate-700 border-slate-600 text-slate-500',
                ]"
                >2</span
              >
              Pilih Tanggal
            </div>
          </div>

          <!-- Body -->
          <div class="modal-body flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <!-- Step 1: Date range -->
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label
                    class="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider"
                    >Dari</label
                  >
                  <DatePicker v-model="startDate" placeholder="Tanggal awal" :max="endDate || ''" />
                </div>
                <div>
                  <label
                    class="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider"
                    >Hingga</label
                  >
                  <DatePicker
                    v-model="endDate"
                    placeholder="Tanggal akhir"
                    :min="startDate || ''"
                  />
                </div>
              </div>
              <button
                @click="fetchDailyStatus"
                :disabled="loadingStatus || !startDate || !endDate"
                class="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-all border border-slate-600/50"
              >
                <svg
                  v-if="loadingStatus"
                  class="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="3"
                  />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <svg
                  v-else
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {{ loadingStatus ? 'Memuat...' : 'Cek Status Harian' }}
              </button>
            </div>

            <!-- Step 2 -->
            <template v-if="step === 2 && dailyStatus.length > 0">
              <div class="border-t border-slate-700/40 pt-4 space-y-3">
                <div class="flex gap-2 flex-wrap">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/50 border border-slate-600/40 text-slate-400 text-xs"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    {{ dailyStatus.length }} hari total
                  </span>
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {{ alreadyExistsDates.length }} sudah ada
                  </span>
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    {{ availableDates.length }} belum ada
                  </span>
                </div>

                <div
                  v-if="availableDates.length > 0"
                  class="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-700/30 border border-slate-600/30"
                >
                  <span class="text-slate-300 text-xs font-medium">Pilih semua yang belum ada</span>
                  <button
                    @click="toggleAll"
                    :class="[
                      'relative w-10 h-5 rounded-full border transition-all duration-200',
                      allAvailableSelected
                        ? 'bg-violet-500 border-violet-500'
                        : 'bg-slate-700 border-slate-600',
                    ]"
                  >
                    <span
                      :class="[
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                        allAvailableSelected ? 'translate-x-5' : 'translate-x-0.5',
                      ]"
                    ></span>
                  </button>
                </div>

                <div class="date-list space-y-1.5 max-h-52 overflow-y-auto">
                  <div
                    v-for="item in dailyStatus"
                    :key="item.date"
                    :class="[
                      'flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all',
                      item.exists
                        ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60 cursor-not-allowed'
                        : selectedDates.has(item.date)
                          ? 'bg-violet-500/15 border-violet-500/40 cursor-pointer hover:bg-violet-500/20'
                          : 'bg-slate-700/30 border-slate-600/30 cursor-pointer hover:bg-slate-700/50',
                    ]"
                    @click="!item.exists && toggleDate(item.date)"
                  >
                    <div class="flex items-center gap-2.5">
                      <div
                        :class="[
                          'w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-all',
                          item.exists
                            ? 'bg-emerald-500/20 border-emerald-500/40'
                            : selectedDates.has(item.date)
                              ? 'bg-violet-500 border-violet-500'
                              : 'bg-slate-700 border-slate-600',
                        ]"
                      >
                        <svg
                          v-if="item.exists"
                          class="w-2.5 h-2.5 text-emerald-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="3"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <svg
                          v-else-if="selectedDates.has(item.date)"
                          class="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="3"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span
                        :class="[
                          'text-xs font-medium',
                          item.exists
                            ? 'text-emerald-400'
                            : selectedDates.has(item.date)
                              ? 'text-white'
                              : 'text-slate-300',
                        ]"
                      >
                        {{ formatDate(item.date) }}
                      </span>
                    </div>
                    <span v-if="item.exists" class="text-xs text-emerald-500/80 font-medium"
                      >Sudah ada</span
                    >
                    <span
                      v-else-if="selectedDates.has(item.date)"
                      class="text-xs text-violet-400 font-medium"
                      >{{ formatCurrency(15000) }}</span
                    >
                  </div>
                </div>
              </div>
            </template>

            <!-- Empty state -->
            <div
              v-if="step === 2 && availableDates.length === 0 && dailyStatus.length > 0"
              class="flex flex-col items-center gap-2 py-4"
            >
              <svg
                class="w-8 h-8 text-emerald-500/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p class="text-slate-500 text-xs text-center">
                Semua hari di rentang ini sudah memiliki expense harian.
              </p>
            </div>

            <!-- Error -->
            <div
              v-if="errorMsg"
              class="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs"
            >
              <svg
                class="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
              {{ errorMsg }}
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-slate-700/50 shrink-0">
            <div
              v-if="selectedDates.size > 0"
              class="flex items-center justify-between mb-3 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20"
            >
              <span class="text-violet-300 text-xs">{{ selectedDates.size }} tanggal dipilih</span>
              <span class="text-violet-300 text-xs font-semibold"
                >Total: {{ formatCurrency(totalAmount) }}</span
              >
            </div>
            <div class="flex gap-3">
              <button
                @click="$emit('close')"
                :disabled="submitting"
                class="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm"
              >
                Batal
              </button>
              <button
                @click="submitBulk"
                :disabled="submitting || selectedDates.size === 0 || step < 2"
                class="flex-1 flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-violet-500/20"
              >
                <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="3"
                  />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {{
                  submitting
                    ? 'Menyimpan...'
                    : `Simpan${selectedDates.size > 0 ? ' (' + selectedDates.size + ')' : ''}`
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Saving overlay ── */
.saving-overlay {
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(6px);
}

/* ── Orbital spinner ── */
.orbital-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orbital-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: rgba(139, 92, 246, 0.9);
  border-right-color: rgba(139, 92, 246, 0.3);
  animation: orbit 1s linear infinite;
}

.orbital-ring.ring-2 {
  inset: 8px;
  border-top-color: transparent;
  border-bottom-color: rgba(167, 139, 250, 0.7);
  border-left-color: rgba(167, 139, 250, 0.2);
  animation: orbit 0.7s linear infinite reverse;
}

.orbital-core {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-core 1.5s ease-in-out infinite;
}

@keyframes orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse-core {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(139, 92, 246, 0);
  }
}

/* ── Saving dots ── */
.saving-dot {
  animation: dot-bounce 0.9s ease-in-out infinite;
}

@keyframes dot-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ── Checkmark draw animation ── */
.checkmark-draw {
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: draw-check 0.5s ease-out 0.1s forwards;
}

@keyframes draw-check {
  to {
    stroke-dashoffset: 0;
  }
}

.success-ring {
  animation: ring-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes ring-pop {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* ── Modal body scrollbar ── */
.modal-body {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.25) transparent;
}
.modal-body::-webkit-scrollbar {
  width: 3px;
}
.modal-body::-webkit-scrollbar-track {
  background: transparent;
}
.modal-body::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.25);
  border-radius: 99px;
}
.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.45);
}

/* ── Date list scrollbar ── */
.date-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 92, 246, 0.25) transparent;
}
.date-list::-webkit-scrollbar {
  width: 3px;
}
.date-list::-webkit-scrollbar-track {
  background: transparent;
}
.date-list::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.25);
  border-radius: 99px;
}
.date-list::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 92, 246, 0.55);
}
</style>
