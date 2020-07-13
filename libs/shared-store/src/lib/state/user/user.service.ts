import { Injectable, Provider } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import {
  AppUserStateModel,
  IUserHandlers,
  IUserObservableOutput,
  IUserStatePayload,
} from './user.interface';
import { userActions, UserState } from './user.store';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  public readonly output: IUserObservableOutput = {
    model$: this.store.select(UserState.model),
    email$: this.store.select(UserState.email),
    token$: this.store.select(UserState.token),
    admin$: this.store.select(UserState.admin),
    isLoggedInSubscription$: this.store
      .select(UserState.model)
      .pipe(map((model: AppUserStateModel) => (model.token ? true : false))),
  };

  public readonly handlers: IUserHandlers = {
    setState: (payload: IUserStatePayload) => this.setState(payload),
  };

  constructor(private readonly store: Store) {
    this.restoreUserFromLocalStorage();
  }

  private saveUserToLocalStorage(model: AppUserStateModel): void {
    localStorage.setItem('userService', JSON.stringify(model));
  }

  private restoreUserFromLocalStorage(): void {
    const userService = localStorage.getItem('userService');
    if (
      userService !== null &&
      typeof userService !== 'undefined' &&
      JSON.parse(userService) instanceof AppUserStateModel
    ) {
      void this.setState(JSON.parse(userService));
    }
  }

  private setState(payload: IUserStatePayload): Observable<AppUserStateModel> {
    return this.store.dispatch(new userActions.setState(payload)).pipe(
      tap((state: AppUserStateModel) => {
        this.saveUserToLocalStorage(state);
      }),
    );
  }
}

/**
 * User service factory constructor.
 */
export type TUserServiceFactoryConstructor = (store: Store) => UserService;

/**
 * User service factory.
 */
export const userServiceFactory: TUserServiceFactoryConstructor = (store: Store) => {
  return new UserService(store);
};

/**
 * User service provider.
 */
export const userServiceProvider: Provider = {
  provide: UserService,
  useFactory: userServiceFactory,
  deps: [Store],
};
