import { createVNode, render } from 'vue'
import L from 'leaflet'

import { ErrorMessage } from "@/models/ErrorMessage"
import { LocationResponse } from "@/models/LocationResponse"
import LocationInfoPopup from '@/components/LocationInfoPopup.vue'

export class LocationLookup {
  map: L.Map
  errorCallback:(message: ErrorMessage) => void

  constructor(map: L.Map, errorCallback:(message: ErrorMessage) => void) {
    this.map = map
    this.errorCallback = errorCallback
  }

  async lookup(lat: number, lon: number): Promise<void> {
      L.popup()
        .setLatLng([lat, lon])
        .setContent(`Resolving name...`)
        .openOn(this.map)
    const url = `${process.env.VUE_APP_POI_URL}pois?lat=${lat}&lon=${lon}&poi-radius=40`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.text()
        const err = new Error(`${res.statusText}: ${body}`)
        throw err
      }
      const lr = await res.json() as LocationResponse
      const instance = createVNode(LocationInfoPopup, { location: lr, lat: lat, lon: lon })
      render(instance, document.createElement('div'))
      const mapSize = this.map.getSize()
      L.popup({maxWidth: mapSize.x * 2 /3, maxHeight: mapSize.y * 2 / 3})
        .setLatLng([lat, lon])
        .setContent(instance.el as HTMLElement)
        .openOn(this.map)
    } catch(err) {
      this.errorCallback({severity: 'error', summary: `Call to service failed`, detail: `${err}`})
    }
  }
}
