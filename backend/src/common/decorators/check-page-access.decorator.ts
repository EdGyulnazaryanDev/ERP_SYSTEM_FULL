import { SetMetadata } from '@nestjs/common';

export const PAGE_ACCESS_KEY = 'page_access';

export type PageAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export interface PageAccessRequirement {
  pageKey: string;
  action: PageAction;
}

export const CheckPageAccess = (pageKey: string, action: PageAction) =>
  SetMetadata(PAGE_ACCESS_KEY, { pageKey, action });
