<template>
  <div class="site" v-if="site.name.length > 0">
    <span class="site-name">{{site.name}}</span>
    <Button class="zoom-button p-button-rounded p-button-text p-button-plain " 
      icon="fa-solid fa-magnifying-glass-location"
      @click="zoomToSite" >
    </Button>

    <div v-for="childSite in site.children" :key="childSite.id">
      <Site v-bind="$attrs" :site="childSite"></Site>
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import { Prop } from 'vue-property-decorator'
import Button from 'primevue/button'

import { SearchLocationNamesSite } from "@/models/SearchResults"

@Options({
  components: {
    Button,
  }
})
export default class Site extends Vue {
  @Prop({ required: true, type: Object as () => SearchLocationNamesSite}) readonly site: SearchLocationNamesSite = {id: '', name: '', lat: 0, lon: 0, children: []}

  zoomToSite(): void {
    this.$emit('zoomToSite', this.site)
  }
}

</script>

<style scoped>
.site {
  padding-top: 0.15em;
  padding-bottom: 0.15em;
  padding-left: 1em;
  background-color: #003366;
  clear: both;
}

.zoom-button {
  float: right;
  height: 1.6rem !important;
}
</style>
