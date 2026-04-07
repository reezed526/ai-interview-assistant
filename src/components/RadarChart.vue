<template>
  <div ref="chartRef" style="height: 260px; width: 100%;" />
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  dimensions: { type: Object, required: true },
})

const chartRef = ref(null)
let chart = null

const LABELS = {
  logic: '逻辑性',
  completeness: '完整性',
  depth: '专业深度',
  expression: '表达能力',
  relevance: '岗位匹配',
}

function buildOption(dimensions) {
  const keys = Object.keys(LABELS)
  const indicators = keys.map((key) => ({ name: LABELS[key], max: 100 }))
  const values = keys.map((key) => dimensions[key] ?? 0)

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => keys.map((key, index) => `${LABELS[key]}：<b>${params.value[index]}</b>`).join('<br/>'),
    },
    radar: {
      indicator: indicators,
      radius: '62%',
      center: ['50%', '52%'],
      axisName: {
        color: '#6b7280',
        fontSize: 11,
        formatter: (name) => {
          const key = Object.entries(LABELS).find(([, value]) => value === name)?.[0]
          const score = dimensions[key] ?? 0
          return `{name|${name}}\n{score|${score}}`
        },
        rich: {
          name: { color: '#6b7280', fontSize: 11, lineHeight: 16 },
          score: { color: '#374151', fontSize: 12, fontWeight: 'bold', lineHeight: 16 },
        },
      },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      splitArea: { areaStyle: { color: ['#fafafa', '#f9fafb'] } },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
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
            x: 0.5,
            y: 0.5,
            r: 0.5,
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

function onResize() {
  chart?.resize()
}

watch(() => props.dimensions, (value) => {
  chart?.setOption(buildOption(value))
}, { deep: true })
</script>
