import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuscadorClanes } from './buscador-clanes';

describe('BuscadorClanes', () => {
  let component: BuscadorClanes;
  let fixture: ComponentFixture<BuscadorClanes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuscadorClanes],
    }).compileComponents();

    fixture = TestBed.createComponent(BuscadorClanes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
