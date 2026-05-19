import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AdminAuthStore } from './admin-auth.store';

export const adminGuard: CanActivateFn = () => {
  const store = inject(AdminAuthStore);
  const router = inject(Router);
  if (store.isAuthed()) return true;
  router.navigateByUrl('/login');
  return false;
};
