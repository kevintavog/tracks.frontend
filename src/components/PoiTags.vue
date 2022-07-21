<template>
  <div class="poi-tags">
    <div>
      <div >
        <span class="tag" v-for="tv in tags" :key="tv.key">
          <span v-if="tv.key==='website'">
            {{tv.key}}=<b><a target="blank" :href="tv.value">{{tv.value}}</a></b>
          </span>
          <span v-else-if="tv.key==='wikipedia'">
            {{tv.key}}=<a target="blank" :href="`https://wikipedia.org/wiki/${tv.value}`">{{tv.value}}</a>
          </span>
          <span v-else-if="tv.key==='wikidata'">
            {{tv.key}}=<a target="blank" :href="`https://www.wikidata.org/wiki/${tv.value}`">{{tv.value}}</a>
          </span>
          <span v-else>
            {{tv.key}}=<b>{{tv.value}}</b>
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from 'vue-property-decorator'
import { OsmTagValue } from "@/models/OsmPoi";

@Options({})
export default class PoiTags extends Vue {
  @Prop({ required: true, type: Object as () => OsmTagValue[]}) readonly tags: OsmTagValue[] = []
}
</script>

<style scoped>
.tag {
  display: inline-block;
  margin-right: 1em;
}
</style>