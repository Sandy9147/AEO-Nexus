import { AeoNexusApiClient } from '@aeo-nexus/api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function getApiClient(): AeoNexusApiClient {
  return new AeoNexusApiClient({
    baseUrl: API_BASE,
    getAccessToken: () => {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('aeo_access_token');
      }
      return null;
    },
    getWorkspaceId: () => {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('aeo_active_workspace_id');
      }
      return null;
    },
  });
}
