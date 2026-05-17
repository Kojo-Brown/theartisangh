import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Client-render everything for now — most routes need auth/runtime data.
  { path: '**', renderMode: RenderMode.Client },
];
