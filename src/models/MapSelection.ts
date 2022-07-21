export enum MapSelectedType {
  None,
  Segment,
  Waypoint,
}

export interface MapSelection {
  type: MapSelectedType
  primaryIndex?: number
  secondaryIndex?: number
}

export const noMapSelection = { type: MapSelectedType.None, primaryIndex: undefined, secondaryIndex: undefined } as MapSelection
