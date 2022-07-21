import tz_lookup from 'tz-lookup'
import { GpxPoint } from '@/models/Gpx'

export class Timezone {
  public static fromGpx(point: GpxPoint): string {
    try {
      return tz_lookup(point.latitude, point.longitude)
    } catch (e) {
      return ''
    }
  }
}
