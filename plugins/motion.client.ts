import { MotionPlugin } from '@motionone/vue'

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.use(MotionPlugin)
})
