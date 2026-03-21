import type { ReactNode } from 'react';
import { Result, Spin } from 'antd';
import { useAccessControl } from '@/hooks/useAccessControl';

interface PageAccessGuardProps {
  pageKey: string;
  children: ReactNode;
}

export default function PageAccessGuard({
  pageKey,
  children,
}: PageAccessGuardProps) {
  const { canAccessPage, isLoading } = useAccessControl();

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!canAccessPage(pageKey)) {
    return (
      <Result
        status="403"
        title="Access blocked"
        subTitle="Your role or current subscription does not allow access to this page."
      />
    );
  }

  return <>{children}</>;
}
