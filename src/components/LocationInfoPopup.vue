<template>
  <div class="location-info-popup">
    <div>
      {{ fullName(location) }}
    </div>
    <div style="margin-top: 0.8rem;">
      <div v-for="poi in location.inside" :key="poi.id">
        {{poi.name}}
        <div style="display: inline">
          <PoiTags class="poitag" :tags="poi.tags"></PoiTags>
        </div>
      </div>
    </div>
    <div v-if="location.nearby.length > 0" style="margin-top: 0.8rem;">
      Nearby:
      <div v-for="poi in location.nearby" :key="poi.id">
        {{poi.name}}
        <div style="display: inline">
          <PoiTags class="poitag" :tags="poi.tags"></PoiTags>
        </div>
      </div>
    </div>
    <div style="margin-top: 0.8rem">{{ round(lat) }},{{ round(lon) }}</div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component"
import { Prop } from 'vue-property-decorator'
import { LocationResponse } from "@/models/LocationResponse"
import PoiTags from "./PoiTags.vue"

@Options({
    components: {
      PoiTags
    }
})
export default class LocationInfoPopup extends Vue {
  @Prop({ required: true, type: Object as () => LocationResponse}) readonly location: LocationResponse = { totalCount: 0, inside: [], nearby: [] }
  @Prop({ required: true, type: Number}) readonly lat: number = 0
  @Prop({ required: true, type: Number}) readonly lon: number = 0

  round(n: number): string {
    return n.toString().substring(0, 10)
  }

  fullName(location: LocationResponse): string {
    let sites = location.inside
      .map(m => m.name)
    let city: string[] = [location.cityName, location.stateName, location.countryName]
    .filter((f: string|undefined): f is string => !!f)
    return sites
      .concat(city)
      .join(', ')
  }
}
</script>

<style scoped>
.poitag {
  padding-left: 1em;
}
</style>