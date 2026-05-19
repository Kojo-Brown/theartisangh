import { Component } from '@angular/core';
import { AdminShellComponent } from './layout/admin-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AdminShellComponent],
  template: '<admin-shell />',
})
export class App {}
