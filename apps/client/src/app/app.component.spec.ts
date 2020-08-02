import { async, ComponentFixture, TestBed, TestModuleMetadata } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppIndexComponent } from '@nx-ng-starter/client-components';
import {
  getTestBedConfig,
  newTestBedMetadata,
  setupJestSpiesFor,
  TClassMemberSpiesObject,
} from '@nx-ng-starter/mocks-core';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  const testBedMetadata: TestModuleMetadata = newTestBedMetadata({
    declarations: [AppComponent, AppIndexComponent],
    imports: [
      RouterTestingModule.withRoutes([
        { path: '', component: AppIndexComponent },
        { path: '', redirectTo: '', pathMatch: 'full' },
        { path: '**', redirectTo: '' },
      ]),
    ],
  });
  const testBedConfig: TestModuleMetadata = getTestBedConfig(testBedMetadata);

  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let spy: {
    component: TClassMemberSpiesObject<AppComponent>;
  };

  beforeEach(async(() => {
    void TestBed.configureTestingModule(testBedConfig)
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        spy = {
          component: setupJestSpiesFor<AppComponent>(component),
        };
        expect(spy.component).toBeDefined();
        fixture.detectChanges();
      });
  }));

  it('should be defined', () => {
    expect(component).toBeDefined();
  });

  it('should render two toolbars', () => {
    const compiled: HTMLElement = fixture.debugElement.nativeElement;
    const expectedLength = 2;
    expect(compiled.querySelectorAll('mat-toolbar').length).toEqual(expectedLength);
  });
});