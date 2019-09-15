import {
  Injectable,
  Inject
} from '@angular/core';

import {
  HttpResponse,
  HttpHeaders,
  HttpErrorResponse
} from '@angular/common/http';

import {
  ApolloLink,
  ExecutionResult,
  Observable as ApolloObservable,
  split
} from 'apollo-link';

import { onError, ErrorResponse } from 'apollo-link-error';
import { HttpLink } from 'apollo-angular-link-http';

import { getMainDefinition } from 'apollo-utilities';
import { createUploadLink } from 'apollo-upload-client';

import { TranslateService } from '@ngx-translate/core';

import { UserService } from '../user/user.service';
import { APP_ENV, AppEnvironment } from '../interfaces';
import { ToasterService } from '../toaster/toaster.service';
import { ProgressService } from '../progress/progress.service';

import {
  Observable,
  concat,
  throwError
} from 'rxjs';

import {
  timeout,
  take,
  map,
  tap,
  catchError
} from 'rxjs/operators';

/**
 * Http handers service.
 */
@Injectable()
export class HttpHandlersService {

  /**
   * Default timeout interval for http-requests.
   */
  public defaultHttpTimeout = 10000;

  /**
   * Rest server api domain.
   */
  private api: string = this.window.location.origin;

  /**
   * Constructor.
   * @param user user service
   * @param toaster app toaster service
   * @param httpLink apollo Http Link
   * @param progress app progress service
   * @param translate ngx translate service
   * @param window window reference
   * @param appEnv app environment
   */
  constructor(
    private user: UserService,
    private toaster: ToasterService,
    private httpLink: HttpLink,
    private progress: ProgressService,
    private translate: TranslateService,
    @Inject('Window') private window: Window,
    @Inject(APP_ENV) private appEnv: AppEnvironment
  ) {
    this.api = this.appEnv.api || this.api;
  }

  /**
   * Resolves if app is running on localhost.
   */
  public isLocalhost(): boolean {
    return this.window.location.origin.indexOf('localhost') !== -1;
  }

  /**
   * Resolver graphQL base url, adds correct protocol.
   */
  public graphQlEndpoint(): string {
    const url: string = `${this.window.location.protocol}//${this.api}/graphql`;
    console.log('graphQlEndpoint, url', url);
    return url;
  }

  /**
   * Returns new http headers for GraphQL.
   */
  public getGraphQLHttpHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Token ${this.user.getUser().token}`
    });
  }

  /**
   * Returns API base url concatenated with provided endpoint path.
   * Adds preceding slash before endpoint path if it is missing.
   * @param path endpoint path
   */
  public getEndpoint(path: string): string {
    path = /^\/.*$/.test(path) ? path : `/${path}`;
    return this.api + path;
  }

  /**
   * Extracts response in format { val1: {}, val2: '' }.
   * @param res http response, either extracted (body in json) or http response that should be parsed
   */
  public extractObject(res: any): object {
    return !res
      ? {}
      : typeof res.json === 'function'
      ? res.json() || {}
      : res || {};
  }

  /**
   * Extracts response in format { data: [ {}, {}, {} ] }.
   * @param res http response, either extracted (body in json) or http response that should be parsed
   */
  public extractArray(res: any): any[] {
    return !res
      ? []
      : typeof res.json === 'function'
      ? res.json().data || []
      : res.data || [];
  }

  /**
   * Extracts HttpResponse.
   * @param res Http response
   */
  public extractHttpResponse(res: HttpResponse<any>): any {
    return res.body;
  }

  /**
   * Extracts GraphQL data.
   * Returns data only, excluding meta information located in response object root.
   * @param res Execution result
   */
  public extractGraphQLData(res: ExecutionResult): any {
    if (res.errors) {
      throw res.errors;
    }
    return res.data ? res.data : res;
  }

  /**
   * Check error status, and reset token if status is 401.
   * Note on errors:
   * 401 - unauthorized token expired
   * @param status error status
   */
  public checkErrorStatusAndRedirect(status: any): void {
    console.log('checkErrorStatusAndRedirect, status', status);
    if (status === 401) {
      this.user.saveUser({ token: '' });
    }
  }

  /**
   * Parses error response in the following format
   * { _body: "{ errors: [ { code: 'c', detail: 'd' } ] }" } where _body is a string
   * or
   * { _body: "{ code: 'c', message: 'm', detail: { inn: ['Invalid inn'] } }" } where _body is a string.
   * @param error error object
   */
  public handleError(error: any): Observable<any> {
    console.log('ERROR', error);
    let msg: string;
    let errors: any;
    if (typeof error._body === 'string' && error._body !== 'null') {
      // unwrap body
      error._body = JSON.parse(error._body);
      errors = error._body.errors
        ? error._body.errors
        : error._body.code && error._body.message
        ? error._body
        : null;
    }
    errors =
      !errors && error.errors
        ? error.errors
        : error.code && error.message
        ? error
        : errors;
    if (errors) {
      if (Array.isArray(errors)) {
        // Parse errors as array: { errors: [ { code: 'c', detail: 'd' } ] }
        if (errors.length) {
          const e = errors[0]; // grab only first error
          msg = e.code && e.detail ? `${e.code} - ${e.detail}` : null;
        }
      } else {
        // Parse errors as object: { code: 'c', message: 'm', detail: { inn: ['Invalid inn'] } }
        let errDetail = '';
        if (errors.detail && typeof errors.detail === 'object') {
          // Unwrap nested structure for errors.detail first, it must be flat.
          console.log('errors.detail is object');
          for (const key in errors.detail) {
            if (errors.detail[key]) {
              if (
                !Array.isArray(errors.detail[key]) &&
                typeof errors.detail[key] === 'object'
              ) {
                for (const subkey in errors.detail[key]) {
                  if (errors.detail[key][subkey]) {
                    errors.detail[subkey] = errors.detail[key][subkey];
                  }
                }
                delete errors.detail[key];
              }
            }
          }
          // Now parse it.
          for (const key in errors.detail) {
            if (errors.detail[key]) {
              errDetail += key + ' - ' + errors.detail[key].join(', ') + ' ';
            }
          }
          errDetail = errDetail.trim();
        }
        msg = errDetail
          ? `${errors.code} - ${errors.message}: ${errDetail}`
          : `${errors.code} - ${errors.message}`;
      }
    }
    // Parse error response, fallback: { status: '400', statusText: 'Bad request' }
    const errMsg: string = msg
      ? msg
      : error.status
      ? `${error.status} - ${error.statusText}`
      : 'Server error';
    return concat(throwError(errMsg));
  }

  /**
   * Handles graphQL error response.
   * @param error error message
   */
  private handleGraphQLError(error: string): Observable<any> {
    return throwError(error);
  }

  /**
   * Pipes request with object response.
   * @param observable request observable
   * @param listenX number of responses to catch
   */
  public pipeRequestWithObjectResponse(
    observable: Observable<any>,
    listenX: number = 1
  ) {
    return observable.pipe(
      timeout(this.defaultHttpTimeout),
      take(listenX),
      map(this.extractObject),
      catchError(this.handleError)
    );
  }

  /**
   * Pipes request with array response.
   * @param observable request observable
   * @param listenX number of responses to catch
   */
  public pipeRequestWithArrayResponse(
    observable: Observable<any>,
    listenX: number = 1
  ) {
    return observable.pipe(
      timeout(this.defaultHttpTimeout),
      take(listenX),
      map(this.extractArray),
      catchError(this.handleError)
    );
  }

  /**
   * Pipes graphQL request response.
   * @param observable request observable
   * @param listenX number of responses to catch
   * @param withprogress should request start progress
   */
  public pipeGraphQLRequest(
    observable: Observable<any>,
    listenX: number = 1,
    withprogress = true
  ) {
    const oldSubscribe = observable.subscribe;

    observable.subscribe = (...args) => {
      withprogress && this.progress.show();
      const oldSubscribtion = oldSubscribe.apply(observable, args);
      const oldUnsubscribe = oldSubscribtion.unsubscribe;
      oldSubscribtion.unsubscribe = (...args) => {
        withprogress && this.progress.hide();
        oldUnsubscribe.apply(oldSubscribtion, args);
      };

      return oldSubscribtion;
    };

    return observable.pipe(
      timeout(this.defaultHttpTimeout),
      this.progressTap(withprogress),
      take(listenX),
      tap(
        (result: any) => console.log('tapped graphQL result', result),
        (error: any) => {
          console.log('tapped graphQL error', error);
          const unauthorized: boolean =
            error.networkError && error.networkError.status === 401;
          if (unauthorized) {
            this.checkErrorStatusAndRedirect(401);
          }
        }
      ),
      map(this.extractGraphQLData),
      catchError(this.handleGraphQLError)
    );
  }

  /**
   * Taps progress.
   * @param applied indicates if progress should be applied
   */
  private progressTap(applied: boolean) {
    const handler = () => applied && this.progress.hide();
    return tap(handler, handler, handler);
  }

  /**
   * Creates apollo link with error handler.
   * @param errorLinkHandler custom error handler
   */
  public createApolloLinkFor(
    errorLinkHandler?: ApolloLink
  ): ApolloLink {
    const uri = this.graphQlEndpoint();

    const httpLinkHandler = this.httpLink.create({ uri });

    if (!errorLinkHandler) {
      errorLinkHandler = onError((error: ErrorResponse) => {
        console.log('error', error);

        let resultMessage = '';

        /**
         * Error code in uppercase, e.g. ACCESS_FORBIDDEN.
         * Should be used as a translate service dictionary key
         * to retrieve a localized substring for UI display.
         * Only last error code is translated and displayed in UI.
         */
        let errorCode: string = null;
        let errorCodeUITranslation: string = null;

        const { graphQLErrors, networkError } = error;

        if (graphQLErrors) {
          console.log(
            `Apollo errorLinkHandler [GraphQL error]: `,
            graphQLErrors
          );
          graphQLErrors.map(({ message, extensions }) => {
            resultMessage += `[GraphQL]: ${message}`;
            errorCode = extensions && extensions.code;
          });
        }

        if (networkError) {
          console.log(
            `Apollo errorLinkHandler [Network error]: `,
            networkError
          );

          if (networkError instanceof HttpErrorResponse) {
            resultMessage += networkError.error.detail;
          } else {
            networkError['error'].errors.map(
              ({ message, extensions }) => {
                resultMessage += `[Network]: ${message}`;
                errorCode = extensions.code;
              }
            );
          }
        }

        if (errorCode) {
          errorCodeUITranslation = this.translate.instant(
            `request.error.${errorCode}`
          );
          if (errorCodeUITranslation.indexOf(errorCode) === -1) {
            resultMessage = errorCodeUITranslation;
          }
        }

        if (!resultMessage) {
          resultMessage = 'Graphql request error';
        }

        this.toaster.showToaster(resultMessage, 'error');
      });
    }

    const networkLink = split(
      ({ query }) => {
        const { name } = getMainDefinition(query);
        return !name;
      },
      httpLinkHandler,
      createUploadLink({
        uri,
        headers: { Authorization: `Token ${this.user.getUser().token}` }
      })
    );

    return errorLinkHandler.concat(networkLink);
  }

}