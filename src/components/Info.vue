<template>
  <div class="info">
    <div class="full-track-info" v-for="(track, gpxIndex) in tracks" :key="track.id">
      <div class="info-header">
        <div>
          {{track.path}}
        </div>
        <div>
          {{Displayable.dayOfWeek(track.startTime, track.timezoneInfo.id)}}
          {{Displayable.date(track.startTime, track.timezoneInfo.id)}}
          {{Displayable.distance(track.kilometers)}}
          {{Displayable.durationSeconds(track.seconds)}}
        </div>
        <div>
          {{track.countries.join(', ')}}
        </div>
        <div>
          {{track.cities.join(', ')}}
        </div>
      </div>

      <div class="track-details">
        <TabView>
          <TabPanel header="Details">
            <div :class="itemClass(item, gpxIndex, itemIndex)" 
                v-for="(item, itemIndex) in trackDetails[gpxIndex]" :key="`${gpxIndex}:${itemIndex}`" 
                @click="select(item)"
                ref="refTrackDetails">
              <span>
                <i :class="itemIcon(item)"></i>
                {{itemTime(item)}}
              </span>
              <Button class="zoom-button p-button-rounded p-button-text p-button-plain p-button-lg" 
                icon="fa-solid fa-magnifying-glass-location"
                @click="zoomToItem(item)" ></Button>
              <div class="item-detail-inset" v-if="isSegment(item)">
                {{Displayable.distance(item.segment.kilometers)}},
                {{Displayable.speed(item.segment.seconds, item.segment.kilometers)}},
                {{Displayable.durationSeconds(item.segment.seconds)}}
                <div v-if="item.segment.rangic && item.segment.rangic.transportationTypes" >
                  {{ item.segment.rangic.transportationTypes[0].mode }}
                </div>
              </div>
              <div class="item-detail-inset" v-if="isWaypoint(item)">
                {{Displayable.durationSeconds(item.waypoint.seconds)}}
              </div>
            </div>
          </TabPanel>
          <TabPanel header="Names & Sites">
            <div v-for="trk in tracks" :key="trk.id" >
              <div v-for="ln in trk.hierarchicalNames" :key="ln.countryCode">
                <span v-if="ln.cityName">{{ln.cityName}},</span> <span v-if="ln.stateName">{{ln.stateName}},</span> {{ln.countryName}}
                <div v-for="site in ln.sites" :key="site.id">
                  <Site @zoomToSite="zoomToSite" :site="site"></Site>
                </div>
              </div>
            </div>
          </TabPanel>
        </TabView>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import { Prop, Watch } from 'vue-property-decorator'
import Button from 'primevue/button'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'

import Site from '@/components/Site.vue'
import { Geo } from '@/utils/Geo'
import { SearchLocationNamesSite, SearchTrack } from "@/models/SearchResults"
import { Displayable } from '@/utils/Displayable'
import { emptyGpxBounds, Gpx, GpxBounds, GpxParser, GpxSegment, GpxWaypoint } from '@/models/Gpx'
import { MapSelectedType, MapSelection, noMapSelection } from '@/models/MapSelection'

interface SegmentTracking {
  segment: GpxSegment
  trackIndex: number
  segmentIndex: number
}

interface WaypointTracking {
  waypoint: GpxWaypoint
  waypointIndex: number
}

@Options({
  components: {
    Button,
    Site,
    TabPanel,
    TabView,
  }
})
export default class Info extends Vue {
  Displayable = Displayable
  GpxParser = GpxParser
  @Prop({ required: true, type: Object as () => SearchTrack[]}) readonly tracks: SearchTrack[] = []
  @Prop({ required: true, type: Object as () => Gpx[]}) readonly gpxList: Gpx[] = []
  @Prop({ required: true, type: Object as () => MapSelection}) readonly selection: MapSelection = noMapSelection

  trackDetails: { [id: string]: (SegmentTracking | WaypointTracking)[] } = {}
  trackSegmentIndex = new Map<string, number>()
  trackWaypointIndex = new Map<string, number>()
  selectedTrackIndex = -1
  selectedItemIndex = -1
  siteZoomOffset = 75.0

  mounted(): void {
    this.processLists()
  }

  zoomToSite(site: SearchLocationNamesSite): void {
    const bounds = {
      minLat: Geo.metersOffset(site.lat, -this.siteZoomOffset),
      minLon: Geo.metersOffset(site.lon, -this.siteZoomOffset),
      maxLat: Geo.metersOffset(site.lat, this.siteZoomOffset),
      maxLon: Geo.metersOffset(site.lon, this.siteZoomOffset),
    } as GpxBounds
    this.$emit('sizeToBounds', bounds)
  }

  zoomToItem(item: (SegmentTracking | WaypointTracking)): void {
    let bounds: GpxBounds = emptyGpxBounds
    if (this.isSegment(item)) {
      bounds = GpxParser.segmentBounds(item.segment)
    } else if (this.isWaypoint(item)) {
      bounds = {
        minLat: Geo.metersOffset(item.waypoint.latitude, -this.siteZoomOffset),
        minLon: Geo.metersOffset(item.waypoint.longitude, -this.siteZoomOffset),
        maxLat: Geo.metersOffset(item.waypoint.latitude, this.siteZoomOffset),
        maxLon: Geo.metersOffset(item.waypoint.longitude, this.siteZoomOffset)
      } as GpxBounds
    }

    if (bounds !== emptyGpxBounds) {
      this.$emit('sizeToBounds', bounds)
    }
  }

  select(item: (SegmentTracking | WaypointTracking)): void {
    let newSelection = noMapSelection
    if (this.isSegment(item)) {
      newSelection = { type: MapSelectedType.Segment, primaryIndex: item.trackIndex, secondaryIndex: item.segmentIndex }
    } else if (this.isWaypoint(item)) {
      newSelection = { type: MapSelectedType.Waypoint, primaryIndex: item.waypointIndex, secondaryIndex: undefined }
    }

    this.$emit('selectionChanged', newSelection)
  }

  itemClass(item: (SegmentTracking | WaypointTracking), trackIndex: number, itemIndex: number): string {
    let names = 'item-detail'
    if (this.isSegment(item)) {
      names += ' item-segment'
    } else if (this.isWaypoint(item)) {
      if (item.waypoint.rangic) {
        if (item.waypoint.rangic.seconds < 180) {
          names += ' item-short-waypoint'
        } else {
          names += ' item-long-waypoint'
        }
      } else {
        names += ' item-waypoint'
      }
    }
    if (trackIndex === this.selectedTrackIndex && itemIndex === this.selectedItemIndex) {
      names += ' item-detail-selected'
    }
    return names
  }

  itemIcon(item: (SegmentTracking | WaypointTracking)): string {
    if (this.isSegment(item)) {
      return 'fa-solid fa-route'
    } else if (this.isWaypoint(item)) {
      if (item.waypoint.rangic && item.waypoint.rangic.seconds < 180) {
        return 'fa-solid fa-diamond'
      } else {
        return 'fa-solid fa-circle'
      }
    }
    return ''
  }

  itemTime(item: (SegmentTracking | WaypointTracking)): string {
    if (this.isSegment(item)) {
      if (item.segment.points.length === 0) { return ''}
      const start = item.segment.points[0].timestamp
      const end =  item.segment.points[item.segment.points.length - 1].timestamp
      return `${Displayable.timeWithSeconds(start, item.segment.timezoneName)} - ${Displayable.timeWithSeconds(end, item.segment.timezoneName)}`
    } else if (this.isWaypoint(item)) {
      if (item.waypoint.rangic) {
        const start = item.waypoint.rangic.beginTime
        const end =  item.waypoint.rangic.finishTime
        return `${Displayable.timeWithSeconds(start, item.waypoint.timezoneName)} - ${Displayable.timeWithSeconds(end, item.waypoint.timezoneName)}`
      }
      return `${Displayable.timeWithSeconds(item.waypoint.timestamp, item.waypoint.timezoneName)}`
    }
    return ''
  }

  processLists(): void {
    this.gpxList.forEach( (gpx, gpxIndex) => {
      let items: { [id: string]: (SegmentTracking | WaypointTracking) } = {}
      gpx.tracks.forEach( (track, trackIndex) => {
        track.segments.forEach( (segment, segmentIndex) => {
          if (segment.points.length > 0) {
            const startTime = Displayable.timeWithSeconds(segment.points[0].timestamp, segment.timezoneName)
            items[startTime] = { segment, trackIndex, segmentIndex }
          }
        })
      })
      gpx.waypoints.forEach( (waypoint, waypointIndex) => {
        const startTime = Displayable.timeWithSeconds(waypoint.timestamp, waypoint.timezoneName)
        items[startTime] = { waypoint, waypointIndex }
      })

      const sorted = Object.keys(items).sort().map( key => items[key])
      sorted.forEach( (item, index) => {
        if (this.isSegment(item)) {
          this.trackSegmentIndex.set(`${item.trackIndex}:${item.segmentIndex}`, index)
        } else if (this.isWaypoint(item)) {
          this.trackWaypointIndex.set(`${item.waypointIndex}`, index)
        }
      })
      this.trackDetails[`${gpxIndex}`] = sorted
    })
  }

  isSegment(item: SegmentTracking | WaypointTracking): item is SegmentTracking {
    return (item as SegmentTracking).segment !== undefined
  }

  isWaypoint(item: SegmentTracking | WaypointTracking): item is WaypointTracking  {
    return (item as WaypointTracking).waypoint !== undefined
  }

  @Watch('selection', { deep: true })
  selectionUpdated(): void {
      this.selectedTrackIndex = -1
      this.selectedItemIndex = -1
    switch (this.selection.type) {
      case MapSelectedType.None:
        this.selectedTrackIndex = -1
        this.selectedItemIndex = -1
        break
      case MapSelectedType.Segment: {
        const segmentIndex = this.trackSegmentIndex.get(`${this.selection.primaryIndex}:${this.selection.secondaryIndex}`)
        if (segmentIndex !== undefined) {
          this.selectedTrackIndex = 0
          this.selectedItemIndex = segmentIndex
          this.makeVisible(this.selectedItemIndex)
        } else {
          console.error(`Unable to find matching segment ${this.selection.primaryIndex}:${this.selection.secondaryIndex}`)
        }
        break
      }
      case MapSelectedType.Waypoint: {
        const waypointIndex = this.trackWaypointIndex.get(`${this.selection.primaryIndex}`)
        if (waypointIndex !== undefined) {
          this.selectedTrackIndex = 0
          this.selectedItemIndex = waypointIndex
          this.makeVisible(this.selectedItemIndex)
        } else {
          console.error(`Unable to find matching waypoint ${this.selection.primaryIndex}`)
        }
        break
      }
    }
  }

  makeVisible(index: number): void {
    // NOTE: According to https://vuejs.org/guide/essentials/template-refs.html#refs-inside-v-for, there is
    // no guarantee of order for the refs. It's not clear how this can be reconciled.
    const details = this.$refs.refTrackDetails as HTMLElement[]
    if (index >= 0 && index < details.length) {
      const el = details[index]
      const parent = el.parentElement
      const grandparent = parent?.parentElement
      const greatGrandparent = grandparent?.parentElement
      const container = greatGrandparent?.parentElement
      if (parent && grandparent && greatGrandparent && container) {
// console.log(`e=${el.offsetTop} e/st=${el.scrollTop} p=${parent.offsetTop} p/st=${parent.scrollTop} g=${grandparent.offsetTop} gg=${greatGrandparent.offsetTop} c=${container.offsetTop}`)
        const elTop = el.offsetTop - parent.scrollTop
        const elBottom = elTop + el.scrollHeight
        const containerBottom = container.scrollTop + container.offsetHeight
        if (elTop < container.scrollTop || elBottom > containerBottom) {
          el.scrollIntoView()
        }
      } else {
        el.scrollIntoView()
      }
    }
  }

  @Watch('tracks')
  tracksUpdated(): void {
    this.processLists()
  }

  @Watch('gpxList')
  gpxListUpdated(): void {
    this.processLists()
  }
}

</script>

<style scoped>
.info {
  min-height: 100vh;
  max-height: 100vh;
  height: 100vh;
}

.full-track-info {
  display: flex;
  flex-direction: column;
  height: 100vh;  
}

.info-header {
  height: auto;
  margin-bottom: 0.2em;
}

.track-details {
  flex-grow: 1;
  overflow-y: scroll;
}

.item-detail {
  margin-top: 4px;
  padding-top: 0.2em;
  padding-bottom: 0.2em;
  padding-left: 0.4em;
  padding-right: 0.4em;
}

.zoom-button {
  float: right;
}
.item-detail-inset {
  margin-left: 1.3em;
}

.item-segment {
  background-color: #003366;
}

.item-waypoint {
  background-color: #660000;
}

.item-short-waypoint {
  background-color: #CC9900;
  color: black;
}

.item-long-waypoint {
  background-color: #CC0000;
}

.item-detail-selected {
  color: white;
  background-color: #7957d5;
  border-color: #7957d5;
  border-width: 4px;
  border-style: solid;
}

</style>
