import type { CurrentUser } from '../auth';
import { Company } from '../company';
import { Location } from '../locations';
import { Site } from '../sites';

export interface WorkspaceState {
  me: CurrentUser | null;
  company: Company | null;
  locations: Location[];
  currentLocationId: string | null;
  sites: Site[];
  currentSiteId: string | null;

  loading: boolean;
  error: string | null;
}

export const initialWorkspace: WorkspaceState = {
  me: null,
  company: null,
  locations: [],
  currentLocationId: null,
  sites: [],
  currentSiteId: null,
  loading: false,
  error: null,
};
