// Local app parameters for offline development
export const appParams = {
  appId: 'local-app-id',
  token: null,
  fromUrl: typeof window !== 'undefined' ? window.location.href : null,
  functionsVersion: 'v1',
  appBaseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
}
