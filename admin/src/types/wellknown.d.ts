declare module 'wellknown' {
  export type GeoJsonGeometry =
    | { type: 'Point', coordinates: number[] }
    | { type: 'MultiPoint', coordinates: number[][] }
    | { type: 'LineString', coordinates: number[][] }
    | { type: 'MultiLineString', coordinates: number[][][] }
    | { type: 'Polygon', coordinates: number[][][] }
    | { type: 'MultiPolygon', coordinates: number[][][][] }
    | { type: 'GeometryCollection', geometries: GeoJsonGeometry[] }

  export interface GeoJsonFeature {
    type: 'Feature'
    properties?: Record<string, unknown> | null
    geometry: GeoJsonGeometry | null
  }

  export interface GeoJsonCrs {
    type: 'name'
    properties: { name: string }
  }

  export type GeoJsonGeometryWithCrs = (GeoJsonGeometry & { crs?: GeoJsonCrs }) | null

  function parse(wkt: string): GeoJsonGeometryWithCrs
  function stringify(gj: GeoJsonFeature | GeoJsonGeometry): string

  const wellknown: {
    parse: typeof parse
    stringify: typeof stringify
  }

  export default wellknown
}

