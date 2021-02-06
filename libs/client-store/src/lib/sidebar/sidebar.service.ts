import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { concatMap, first } from 'rxjs/operators';

import { AppSidebarState, sidebarUiActions } from './sidebar.store';

@Injectable({
  providedIn: 'root',
})
export class AppSidebarService {
  public readonly sidebarOpened$ = this.store.select(AppSidebarState.getSidebarOpened);

  constructor(private readonly store: Store) {}

  public open() {
    return this.store.dispatch(new sidebarUiActions.setState({ sidebarOpened: true }));
  }

  public close() {
    return this.store.dispatch(new sidebarUiActions.setState({ sidebarOpened: false }));
  }

  public toggle() {
    void this.sidebarOpened$
      .pipe(
        first(),
        concatMap(opened => {
          return opened ? this.close() : this.open();
        }),
      )
      .subscribe();
  }
}