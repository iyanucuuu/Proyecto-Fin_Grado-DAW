import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearEscuderia } from './crear-escuderia';

describe('CrearEscuderia', () => {
  let component: CrearEscuderia;
  let fixture: ComponentFixture<CrearEscuderia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearEscuderia],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearEscuderia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
