// Mock Base44 client for local development
export const base44 = {
  auth: {
    me: async () => ({ id: 'local-user', name: 'Local User' }),
    logout: () => console.log('Logout (local mode)'),
    redirectToLogin: (url) => console.log('Redirect to login (local mode)')
  }
};
