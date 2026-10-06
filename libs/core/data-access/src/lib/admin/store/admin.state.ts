import { Location } from '../../locations';
import { Site } from '../../sites';

export interface AdminState {
  locations: Location[];
  selectedLocationId: string | null;
  sites: Site[];

  loadingLocations: boolean;
  loadingSites: boolean;

  error: string | null;
}

export const initialAdminState: AdminState = {
  locations: [],
  selectedLocationId: null,
  sites: [],

  loadingLocations: false,
  loadingSites: false,
  error: null

}
