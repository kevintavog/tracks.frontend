<template>
  <div class="site-popup">
    <div>
      {{ site.name.join(', ') }}
    </div>
    <div style="margin-top: 0.8rem;">
      <div>
        <PoiTags :tags="site.tags"></PoiTags>
      </div>
    </div>
    <div style="margin-top: 0.8rem;">
      {{round(site.lat)}},{{round(site.lon)}}
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from 'vue-property-decorator'
import { SearchTrackSite } from "@/models/SearchResults";
import PoiTags from "./PoiTags.vue";

@Options({
  components: {
    PoiTags
    }
})
export default class SitePopup extends Vue {
  @Prop({ required: true, type: Object as () => SearchTrackSite}) readonly site: SearchTrackSite = { name: [], lat: 0, lon: 0 }
  round(n: number): string {
    return n.toString().substring(0, 10)
  }
}
</script>

<style scoped>
.tag {

  display: inline-block;
  margin-right: 1em;
}
</style>