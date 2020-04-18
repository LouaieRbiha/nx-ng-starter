import { WebAppEnvironment } from '@nx-ng-starter/shared-core/data-access';

/**
 * Production environment variables.
 */
export const environment: WebAppEnvironment = {
  production: true,
  appName: 'Nx Ng Starter Client',
  api: /localhost/.test(window.location.origin)
    ? 'http://localhost:8080/api'
    : window.location.origin,
  envoyUrl: 'http://localhost:8081', // TODO
};
