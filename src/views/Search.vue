<template>
  <div class="search box">

    <div class="p-inputgroup standard-row">
      <InputText placholder="Search text" v-model="searchText" @keyup.enter="onSearch" autocapitalize="none" autofocus />
      <Button label="Search" icon="pi pi-search" iconPos="right" @click="onSearch" />
    </div>

    <h2 class="search-result-info" v-if="totalMatchingResults == 0" >
      No matches were found {{searchDescription}}
    </h2>
    <h2 class="search-result-info" v-else>
      Results {{searchDescription}}
    </h2>

    <div class="search-result-info" v-if="totalMatchingResults > 0">
      <span v-if="totalPages == 1">
        Showing all {{totalMatchingResults}} items
      </span>
      <span v-else>
        <b>{{totalPages}}</b> pages / <b>{{totalMatchingResults}}</b> matching items
      </span>
    </div>

    <Paginator class="paginator standard-row" :rows="pageSize" :first="firstItemIndex" :totalRecords="totalMatchingResults" 
      :alwaysShow="false" :pageLinkSize="8" @page="onPageEvent" />

    <search-page-info :tracks="searchResults" />

    <div class="card standard-row" >
      <DataView :value="searchResults" :lazy="true">
        <template #list="slotProps">
          <div class="col-12">
            <div class="track-item">

              <div class="track-item-detail">
                <div> {{ Displayable.date(slotProps.data.startTime, slotProps.data.timezoneInfo.id) }} </div>
                <div> {{ Displayable.dayOfWeek(slotProps.data.startTime, slotProps.data.timezoneInfo.id) }} </div>
                <div> {{ Displayable.shortTime(slotProps.data.startTime, slotProps.data.timezoneInfo.id) }} </div>
                <div> {{ Displayable.shortTime(slotProps.data.endTime, slotProps.data.timezoneInfo.id) }} </div>
              </div>

              <div class="track-item-detail">
                <div> {{ Displayable.distance(slotProps.data.kilometers) }} </div>
                <div> {{ Displayable.durationSeconds(slotProps.data.seconds) }} </div>
              </div>

              <div class="track-item-wide-detail">
                <div v-if="slotProps.data.sites.length > 0">
                  <Tag class="sites-tag" value="Sites"></Tag>
                  {{ Displayable.firstFew(slotProps.data.sites.map(s => s.name), siteLimit) }} 
                  <span v-if="slotProps.data.sites.length > siteLimit"> 
                    <Tag severity="success" :rounded=true> 
                      +{{(slotProps.data.sites.length - siteLimit)}}
                    </Tag>
                  </span>                  
                </div>
                <div v-if="slotProps.data.cities.length > 0"> 
                  <Tag class="cities-tag" value="Cities"></Tag>
                    {{ Displayable.firstFew(slotProps.data.cities, 5) }}
                </div>
                <div v-if="slotProps.data.states.length > 0">
                  <Tag class="states-tag" value="States"></Tag>
                  {{ Displayable.firstFew(slotProps.data.states) }} 
                </div>
                <div>
                  <Tag class="countries-tag" value="Countries"></Tag>
                  {{ Displayable.firstFew(slotProps.data.countries) }} 
                </div>
              </div>

              <div class="track-item-action">
                <router-link :to="{ path:'/map/' + slotProps.data.id }" >
                  <Button icon="pi pi-map" iconPos="right" label="Show"  > </Button>
                </router-link>
              </div>

            </div>
          </div>
        </template>
      </DataView>
      <Paginator class="standard-row" :rows="pageSize" :first="firstItemIndex" :totalRecords="totalMatchingResults"
        :alwaysShow="false" @page="onPageEvent" />
    </div>

  </div>
</template>

<script lang="ts">

import "leaflet/dist/leaflet.css"
import { SearchTrack } from '@/models/SearchResults'
import { PageState } from 'primevue/paginator'

import { Options, Vue } from 'vue-class-component'
import { Watch } from 'vue-property-decorator'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import DataView from 'primevue/dataview'
import InputText from 'primevue/inputtext'
import Paginator from 'primevue/paginator'
import Tag from 'primevue/tag'
import { Displayable } from '@/utils/Displayable'

import SearchPageInfo from '@/components/SearchPageInfo.vue'

@Options({
  components: {
    Badge,
    Button,
    DataView,
    InputText,
    Paginator,
    Tag,

    SearchPageInfo,
  },
})
export default class Search extends Vue {
  Displayable = Displayable
  pageSize = 15
  siteLimit = 4
  searchText = ''
  firstItemIndex = 0
  totalMatchingResults = 0
  searchResults:SearchTrack[] = []
  searchDescription = ''

  get totalPages(): number {
    if (this.totalMatchingResults === 0) {
      return 0
    }
    return Math.ceil(this.totalMatchingResults / this.pageSize)
  }

  // To handle both first entry and clicking on a link to a specific page
  mounted(): void {
    let first = 0
    const query = this.$route.query
    if ('p' in query) {
      first = this.pageSize * (Number(query.p) - 1)
console.log(`mounted, query has ${first}`)
    }
console.log(`mounted, using ${first}, got `, this.$route.query)
    this.search(first, true)
  }

  // To handle browser previous & next page
  @Watch('$route.params')
  onRouteParamsChanged(): void {
    let first = 0
    const query = this.$route.query
    if ('p' in query) {
      first = this.pageSize * (Number(query.p) - 1)
console.log(`route params changed, first=${first}`)
    } else {
console.log(`route params does NOT include 'p'`)
    }
// console.log(`IGNORING route params changed, using ${first}, got `, this.$route.query)
    // this.search(first, false)
  }

  // Invoked by the search text (return) or button
  onSearch(): void {
    this.search(0, true)
  }

  // Invoked by the Paginator
  onPageEvent(event: PageState): void {
console.log(`Page event, using ${event.first}`)
    this.search(event.first, true)
  }

  async search(first: number, updateHistory: boolean): Promise<void> {
    let url = `${process.env.VUE_APP_TRACKS_URL}/search?q=${this.searchText.trim()}&first=${first + 1}&count=${this.pageSize}`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.text()
        const err = new Error(`${res.statusText}: ${body}`)
        throw err
      }

      if (this.searchText.trim() === '') {
        this.searchDescription = `for all items`
      } else {
        this.searchDescription = `for '${this.searchText.trim()}'`
      }

      const json = await res.json()
      this.totalMatchingResults = json.totalMatches
      this.searchResults = json.items
      this.firstItemIndex = Math.min(first, this.totalMatchingResults - 1)

      if (updateHistory) {
        const pageNumber = 1 + Math.floor(this.firstItemIndex / this.pageSize)
        // await this.$router.push({ name: 'search', params: { p: pageNumber } })
        // history.pushState(history.state, '', `?p=${pageNumber}`)
        history.pushState({ p: pageNumber }, '', `?p=${pageNumber}`)
console.log(`search, push state, `, this.$route.params)
      }
    } catch(err) {
      this.$toast.add({severity: 'error', summary: `Call to service failed (${url})`, detail: err})
    }
  }
}
</script>

<style scoped>

.sites-tag {
  background-color: lightpink;
}
.cities-tag {
  background-color: lightseagreen;;
  margin-top: 0.25rem;
}

.states-tag {
  background-color: lightgoldenrodyellow;
  margin-top: 0.25rem;
}
.countries-tag {
  background-color: lightblue;
  margin-top: 0.25rem;
}

.track-item {
	display: flex;
	align-items: center;
	padding: 1rem;
	width: 100%;
}

.box {
  display: flex;
  flex-flow: column;
  height: 100%;
}

.standard-row {
  flex: 0 1 auto;
}

.fill-space-row {
  flex: 1 1 auto;
}

.map-container {
  margin-top: 0.5em;
}

.track-item-detail {
  flex: 1 1 0;
}

.track-item-wide-detail {
  flex: 3 1 0;
}
.track-layout-selector {
  margin: 1em;
}

.search-result-info {
  text-align: center;
}

.paginator {
  border-width: 0px;
}

.site-list {
  background: lightpink;
  color: black;
}

</style>
