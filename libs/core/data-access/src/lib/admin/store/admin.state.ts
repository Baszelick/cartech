export interface AdminState {
  locations: []
  selectedLocationId: string | null
  sites: []

  loadingLocations: boolean
  loadingSates: boolean

  error: string | null

}

export const initialAdminState: AdminState = {
  locations: [],
  selectedLocationId: null,
  sites: [],

  loadingLocations: false,
  loadingSates: false,
  error: null

}
