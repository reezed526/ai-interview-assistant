<template>
  <div ref="chartRef" style="height: 260px; width: 100%;" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  dimensions: { type: Object, required: true },
})

const chartRef = ref(null)
let chart = null

const LABELS = {
  logic:        '逻辑性',
  completeness: '完整性',
  depth:        '专业深度',
  expression:   '表达力',
  relevance:    '岗位匹配度',
}

function buildOption(dims) {
  const keys = Object.keys(LABELS)
  const indicators = keys.map((k) => ({ name: LABELS[k], max: 100 }))
  const values     = keys.map((k) => dims[k] ?? 0)

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        return keys
          .map((k, i) => `${LABELS[k]}：<b>${params.value[i]}</b>`)
          .join('<br/>')
      },
    },
    radar: {
      indicator: indicators,
      radius: '62%',
      center: ['50%', '52%'],
      axisName: {
        color: '#6b7280',
        fontSize: 11,
        formatter: (name, indicator) => {
          const key = Object.entries(LABELS).find(([, v]) => v === name)?.[0]
          const score = dims[key] ?? 0
          return `{name|${name}}\n{score|${score}}`
        },
        rich: {
          name:  { color: '#6b7280', fontSize: 11, lineHeight: 16 },
          score: { color: '#374151', fontSize: 12, fontWeight: 'bold', lineHeight: 16 },
        },
      },
      splitLine:  { lineStyle: { color: '#f3f4f6' } },
      splitArea:  { areaStyle: { color: ['#fafafa', '#f9fafb'] } },
      axisLine:   { lineStyle: { color: '#e5e7eb' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        name: '综合能力',
        symbol: 'circle',
        symbolSize: 5,
        areaStyle: {
          color: {
            type: 'radial',
            x: 0.5, y: 0.5, r: 0.5,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.25)' },
              { offset: 1, color: 'rgba(59,130,246,0.05)' },
            ],
          },
        },
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6', borderColor: '#fff', borderWidth: 2 },
      }],
    }],
  }
}

onMounted(async () => {
  const echarts = await import('echarts')
  chart = echarts.init(chartRef.value)
  chart.setOption(buildOption(props.dimensions))
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
})

function onResize() { chart?.resize() }

watch(() => props.dimensions, (val) => chart?.setOption(buildOption(val)), { deep: true })
</script>
