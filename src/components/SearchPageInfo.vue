<template>
  <div class="search-page-info">
    From {{earliestDate}} to {{latestDate}}
  </div>
  <div>
    <Chip class="country-chip chip-spacing" v-for="country in countries" :key="country" :label="country">
    </Chip>
    <span class="chip-type-spacing" />
    <Chip class="state-chip chip-spacing" v-for="state in states" :key="state" :label="state">
    </Chip>
    <span class="chip-type-spacing" />
    <Chip class="city-chip chip-spacing" v-for="city in cities" :key="city" :label="city">
    </Chip>
    <div class="chip-type-spacing" />
    <span v-if="showingShortSites">
      <Chip class="disclosure chip-spacing" icon="fa-solid fa-caret-right" :label="`+${(sites.length - shortSites.length)}`"
        @click="showingShortSites = false"></Chip>
      <Chip class="site-chip chip-spacing" v-for="site in shortSites" :key="site" :label="site"> </Chip>
      <Chip class="disclosure chip-spacing" icon="fa-solid fa-caret-right" :label="`+${(sites.length - shortSites.length)}`"
        @click="showingShortSites = false"></Chip>
    </span>
    <span v-else>
      <Chip class="disclosure chip-spacing" icon="fa-solid fa-caret-down" :label="`&nbsp;`" @click="showingShortSites = true"></Chip>
      <Chip class="site-chip chip-spacing" v-for="site in sites" :key="site" :label="site"> </Chip>
    </span>
  </div>

</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import { Prop, Watch } from 'vue-property-decorator'

import Chip from 'primevue/chip'

import { Displayable } from '@/utils/Displayable'
import { SearchTrack } from '@/models/SearchResults'

@Options({
  components: {
    Chip
  }
})
export default class SearchPageInfo extends Vue {
  @Prop({ required: true, type: Object as () => SearchTrack[]}) readonly tracks: SearchTrack[] = []
  earliestDate = ''
  latestDate = ''
  countries: string[] = []
  states: string[] = []
  cities: string[] = []
  sites: string[] = []
  shortSites: string[] = []
  showingShortSites = true

  mounted(): void {
    this.update()
  }

  @Watch('tracks')
  searchResultsChanged(): void {
    this.update()
  }

  update(): void {
    if (!this.tracks || this.tracks.length < 1) {
      return
    }
    const countriesSet = new Set<string>()
    const statesSet = new Set<string>()
    const citiesSet = new Set<string>()
    const sitesSet = new Set<string>()
    const primarySites: string[] = []
    let earliest = this.tracks[0].startTime
    let latest = this.tracks[0].endTime
    this.tracks.forEach( (t) => {
      if (t.startTime < earliest) {
        earliest = t.startTime
      }
      if (t.endTime > latest) [
        latest = t.endTime
      ]
      t.countries.forEach( (c) => countriesSet.add(c) )
      t.states.forEach( (s) => statesSet.add(s) )
      t.cities.forEach( (c) => citiesSet.add(c) )
      t.sites.forEach( (site) => site.name.forEach( (n) => sitesSet.add(n) ) )
      if (t.sites.length > 0) {
        primarySites.push(t.sites[0].name[0])
      }
    })

    this.earliestDate = Displayable.dateToLocaleDate(earliest)
    this.latestDate = Displayable.dateToLocaleDate(latest)
    this.countries = [...countriesSet].sort().filter( (s) => s.length > 0)
    this.states = [...statesSet].sort().filter( (s) => s.length > 0)
    this.cities = [...citiesSet].sort().filter( (s) => s.length > 0)
    this.sites = [...sitesSet].filter( (s) => s.length > 0)
    this.shortSites = primarySites.slice(0, 10)
  }
}
</script>

<style scoped>
.chip-spacing {
  margin-right: 0.5em;
  margin-bottom: 0.25em;
}

.chip-type-spacing {
  margin-right: 1em;
}

.country-chip {
  background: lightblue;
  color: black;
}

.state-chip {
  background: lightgoldenrodyellow;
  color: black;
}

.city-chip {
  background: lightseagreen;
  color: black;
}

.site-chip {
  background: lightpink;
  color: black;
}

.p-chip.disclosure {
  background: var(--primary-color);
  color: var(--primary-color-text);
	}
</style>
