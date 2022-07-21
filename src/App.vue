<template>
  <Toast position="top-left"/>
  <router-view/>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import Toast from 'primevue/toast'

@Options({
  components: {
    Toast,
  },
})
export default class App extends Vue {
}
</script>

<style>
#app {
  font-size: 1.2em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
}

html {
  height: calc(100vh - 1em);
  width: 100vw;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--surface-a);
  font-family: var(--font-family);
  color: var(--text-color);
  height: 100%;
}

.p-component {
  font-size: 1.15rem !important;
}

</style>
