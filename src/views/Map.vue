<template>
  <div class="map">
    <div>
      <Dialog ref="loadingPanel" v-model:visible="isLoading" :closeOnEscape="false" 
        :dismissableMask="false" :closable="false" :draggable="false" :modal="true" >
          <p> Loading {{ gpxName }} </p>
          <ProgressBar mode="indeterminate" style="height: 1em;" />
      </Dialog>
    </div>

    <Dialog header="Enter a lat/lon coordinate" v-model:visible="latLonDialogActive" :closeOnEscape="true" position="top">
      <span class="p-input-icon-left">
        <i class="pi pi-map-marker" />
        <InputText type="text" v-model="latLonEntryText" placeholder="lat/lon or lon|lat" autofocus v-on:keypress="latLonEntryKeyPress" />
        <Button label="Go" icon="pi pi-arrow-right" @click="processGotoLatLon()" />
      </span>
      <template #footer>
        <Button label="Close" class="p-button-secondary" @click="setactiveTool(Tool.None)" />
      </template>
    </Dialog>

    <Splitter class="page-container" layout="horizontal" stateKey="rangic.tracks.map" stateStorage="local"
        @resizeend="map?.invalidateSize()">

      <SplitterPanel>
        <Info :tracks="tracks" :gpxList="[gpx]" :selection="currentSelection" 
          @selectionChanged="selectionChanged" @sizeToBounds="sizeToBounds" />
      </SplitterPanel>

      <SplitterPanel class="fill-space-row">
        <div class="map-content" id="map" ref="map" > 
        </div>
      </SplitterPanel>

    </Splitter>
  </div>
</template>


<script lang="ts">

import { createVNode, render } from 'vue'
import "leaflet/dist/leaflet.css"
import L, { Control } from 'leaflet'
import 'leaflet-easybutton'
import { LeafletMouseEvent } from 'leaflet'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import ProgressBar from 'primevue/progressbar'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'

import { Options, Vue } from 'vue-class-component'
import { Watch } from 'vue-property-decorator'

import Info from '@/components/Info.vue'
import SitePopup from '@/components/SitePopup.vue'
import { emptyGpx, Gpx, GpxBounds, GpxParser } from '@/models/Gpx'
import { MapHelper } from '@/utils/MapHelper'
import { LocationLookup } from "@/service/LocationLookup"
import { ErrorMessage } from "@/models/ErrorMessage"
import { Measure } from "@/service/Measure"
import { SearchTrack } from "@/models/SearchResults"
import { LeafletIcons } from "@/utils/LeafletIcons"
import { GpxFeatureGroup } from "@/utils/GpxFeatureGroup"
import { MapSelection, noMapSelection } from '@/models/MapSelection'
import { RangicMapEvent } from '@/models/RangicMapEvent'

export enum Tool {
  None,
  NameLookup,
  Measure,
  GotoLocation,
}

@Options({
  components: {
    Button,
    Dialog,
    InputText,
    ProgressBar,
    Splitter,
    SplitterPanel,

    Info,
    SitePopup
  },
})
export default class Map extends Vue {
  map?: L.Map
  isLoading = false
  activeTool = Tool.None
  latLonDialogActive = false
  latLonEntryText = ''
  gpxId = ''
  gpxName = ''
  gpx: Gpx = emptyGpx
  tracks: SearchTrack[] = []
  mapHelper?: MapHelper
  locationLookup?: LocationLookup
  measureTool?: Measure
  locationButton?: Control.EasyButton
  measureButton?: Control.EasyButton
  gotoLocationButton?: Control.EasyButton
  currentSelection: MapSelection = noMapSelection
  defaultEasyButtonClassNames = 'easy-button-button leaflet-bar-part leaflet-interactive unnamed-state-active'
  

  mounted(): void {
    this.initMap()
    if ('id' in this.$route.params) {
      this.gpxId = this.$route.params.id as string
      this.loadGpxTrack(this.gpxId, true)
    }
  }

  // Invoked by the vue-leaflet wrapper when the underlying Leaflet map is ready
  onMapReady(): void {
    this.populateMap()
  }

  latLonEntryKeyPress(e: KeyboardEvent): void {
    // Accept:
    //    number,number (assume lat/lon)
    //    number|number (assume lon/lat) [pasted from the CVS files the service indexes]
    if (e.key === 'Enter') {
      this.processGotoLatLon()
    }
  }

  processGotoLatLon(): void {
    try {
      let converted = false
      let lat = 0
      let lon = 0 
      let tokens = this.latLonEntryText.split(',').map( (s) => s.trim() )
      if (tokens.length === 2) {
        lat = +tokens[0]
        lon = +tokens[1]
        converted = true
      } else {
        tokens = this.latLonEntryText.split('|').map( (s) => s.trim() )
        if (tokens.length === 2) {
          lat = +tokens[1]
          lon = +tokens[0]
          converted = true
        }
      }
      if (converted) {
        this.map?.setView(L.latLng(lat, lon, 18))
        this.setActiveTool(Tool.None)
      }
    } catch(err) {
      this.$toast.add({severity: 'error', summary: `Failed converting lat/lon`, detail: err})
    }
  }

  @Watch('activeTool')
  nameLookupToggled(): void {
    let cursorName = ''
    switch(this.activeTool) {
      case Tool.NameLookup:
        cursorName = 'help'
        break
      case Tool.Measure:
        cursorName = 'crosshair'
        break
    }
    ((this.$refs.map) as HTMLElement).style.cursor = cursorName
  }

  async loadSearchTrack(id: string): Promise<void> {
    const url = `${process.env.VUE_APP_TRACKS_URL}/${id}`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.text()
        const err = new Error(`${res.statusText}: ${body}`)
        throw err
      }
      this.tracks = []
      this.tracks.push(await res.json() as SearchTrack)
      this.populateSites(this.tracks[this.tracks.length - 1])
    } catch(err) {
      this.$toast.add({severity: 'error', summary: `Failed getting track`, detail: err})
    }
  }

  async loadGpxTrack(id: string, processed: boolean): Promise<void> {
    try {
      this.gpxName = id
      this.isLoading = true
      let skipGapDetection = true
      let path = `/gpx/${id}`
      if (!processed) {
        path = `/original/${id}`
        skipGapDetection = false
      }
      const url = `${process.env.VUE_APP_TRACKS_URL}${path}`
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.text()
        const err = new Error(`${res.statusText}: ${body}`)
        throw err
      }
      const body = await res.text()
      new GpxParser().parse(id, body, skipGapDetection)
      .then( loadedGpx => {
        this.gpx = loadedGpx
        this.populateMap()
        this.loadSearchTrack(this.gpxId)
      })
      .catch( err => {
        this.$toast.add({severity: 'error', summary: `Failed parsing GPX`, detail: err})
      })
    } catch(err) {
      this.$toast.add({severity: 'error', summary: `Failed retrieving GPX`, detail: err})
    } finally { this.isLoading = false }
  }

  errorCallback(error: ErrorMessage): void {
    this.$toast.add({severity: error.severity, summary: error.summary, detail: error.detail})
  }

  sizeToBounds(bounds: GpxBounds): void {
    this.mapHelper?.fitBounds(bounds)
  }

  selectionChanged(selection: MapSelection): void {
    this.currentSelection = selection
    this.mapHelper?.selection(this.currentSelection, true)
  }

  helperSelectionCallback(selection: MapSelection): void {
    this.currentSelection = selection
    this.mapHelper?.selection(this.currentSelection, false)
  }

  populateMap(): void {
    if (!GpxParser.isValidGpx(this.gpx) || !this.map) {
      return
    }

    if (!this.mapHelper) {
      this.mapHelper = new MapHelper(this.map, this.gpx, this.helperSelectionCallback)
    }

    this.mapHelper.fitGpx()
    this.mapHelper.populateMap()
  }

  populateSites(track: SearchTrack): void {
    if (!this.map) { return }
    let layer: L.FeatureGroup | L.Map = this.map
    if (this.mapHelper && this.mapHelper.gpxLayer) {
      layer = this.mapHelper.gpxLayer
    }
    const sitesGroup = new GpxFeatureGroup().addTo(layer)
    track.sites.forEach( (site, index) => {
      const siteName = site.name.join(', ')
      const instance = createVNode(SitePopup, { site: site })
      render(instance, document.createElement('div'))
      if (this.map) {
        const mapSize = this.map.getSize()
        L.marker([site.lat, site.lon], { icon: LeafletIcons.getIcon(index), title: siteName })
          .bindPopup(instance.el as HTMLElement, {maxWidth: mapSize.x * 2 /3, maxHeight: mapSize.y * 2 / 3})
          .addTo(sitesGroup)
      }
    })
    if (sitesGroup.getLayers().length > 0) {
      if (this.mapHelper) {
        this.mapHelper.addToMapLayersControl(sitesGroup, this.mapHelper.textAndIconLabel('fa-location-pin', 'Sites'))
      }
    }
  }

  clearMeasureTool(): void {
    if (this.measureTool) {
      this.measureTool.close()
      this.measureTool = undefined
    }
  }

  setActiveTool(newTool: Tool): void {
    if (this.activeTool === newTool) {
      newTool = Tool.None
    }

    switch(this.activeTool) {
      case Tool.NameLookup: {
        this.setMapButtonState(false, this.locationButton)
        break
      }
      case Tool.Measure: {
        this.clearMeasureTool()
        this.setMapButtonState(false, this.measureButton)
        this.measureTool?.stop()
        break
      }
      case Tool.GotoLocation: {
        this.setMapButtonState(false, this.gotoLocationButton)
        this.latLonDialogActive = false
        break
      }
    }

    this.activeTool = newTool
    switch(newTool) {
      case Tool.NameLookup: {
        this.setMapButtonState(true, this.locationButton)
        break
      }
      case Tool.Measure: {
        this.clearMeasureTool()
        this.setMapButtonState(true, this.measureButton)
        if (this.map) {
          this.measureTool = new Measure(this.map)
        }
        break
      }
      case Tool.GotoLocation: {
        this.setMapButtonState(true, this.gotoLocationButton)
        this.latLonDialogActive = true
        break
      }
    }
  }

  setMapButtonState(isActive: boolean, button?: Control.EasyButton): void {
    const btnEl = (button as any).button as HTMLElement
    if (isActive) {
      btnEl.className = this.defaultEasyButtonClassNames + ' active-button'
    } else {
      btnEl.className = this.defaultEasyButtonClassNames
    }
  }

  initMap(): void {
    if (this.map) { return }

    this.map = L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      zoomControl: false,
    })

    L.control.zoom({ position: 'topright' }).addTo(this.map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19,
      maxZoom: 22,
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(this.map)

    L.control.scale({ position: 'bottomright', maxWidth: 300 }).addTo(this.map)
    this.locationLookup = new LocationLookup(this.map, this.errorCallback)

    // The tool buttons in the top left
    this.locationButton = L.easyButton(
      'map-button-size fa-solid fa-magnifying-glass-location',
      () => {
        this.setActiveTool(Tool.NameLookup)
      },
      'Lookup location name')
      .addTo(this.map)
    this.measureButton = L.easyButton(
      'map-button-size fa-solid fa-ruler',
      () => {
        this.setActiveTool(Tool.Measure)
      },
      'Measure')
      .addTo(this.map)
    this.gotoLocationButton = L.easyButton(
      'map-button-size fa-solid fa-map-location-dot',
      () => {
        this.setActiveTool(Tool.GotoLocation)
      },
      'Goto Location')
      .addTo(this.map)
    L.easyButton(
      'map-button-size fa-solid fa-file-import',
      () => {
        this.loadGpxTrack(this.gpxId, false)
      },
      'Load Original')
      .addTo(this.map)

    this.map.on('click', (e) => {
      const le = e as LeafletMouseEvent
      if (le.originalEvent && (le.originalEvent as unknown as RangicMapEvent)._gpxHandled) { return }

      switch(this.activeTool) {
        case Tool.None:
          this.selectionChanged(noMapSelection)
          break
        case Tool.NameLookup:
          if (this.locationLookup) {
            this.locationLookup.lookup(le.latlng.lat, le.latlng.lng)
          }
          break
        case Tool.Measure:
          break
        default:
          this.$toast.add({severity: 'error', summary: `Unhandled 'Tool' enum: ${this.activeTool}`, detail: "Fix it!"})
          break
      }
    })
  }
}

</script>

<style global>

.leaflet-popup, .leaflet-control-layers-list {
  font-size: 1.3em;
}

.leaflet-control-scale-line {
  font-size: 1.2em;
}

.map-button-size {
  font-size: 2em;
}

.moving-tooltip {
  background-color: rgba(255, 255, 255, .7);
  background-clip: padding-box;
  opacity: 0.5;
  border: dotted;
  border-color: red;
  font-size: larger;
}

.active-button {
  background-color: #007cff94;
}
</style>

<style scoped>
.page-container {
  display: flex;
  flex-flow: row;
  height: 100%;
  width: 100%;
  flex-grow: 1;
}

.standard-row {
  flex: 0 1 auto;
}

.fill-space-row {
  flex: 1 1 auto;
}

.map {
  height: 100%;
}
.map-content {
  height: 100%;
}

</style>
