import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfigProvider
          theme={{
            cssVar: true,
            hashed: false,
            token: {
              colorPrimary: '#0f766e',
              colorInfo: '#0f766e',
              colorSuccess: '#15803d',
              colorWarning: '#d97706',
              colorError: '#dc2626',
              colorTextBase: '#dce7f3',
              colorBgBase: '#06131f',
              fontFamily: '"IBM Plex Sans", "Aptos", "Segoe UI", sans-serif',
              fontSize: 14,
              borderRadius: 14,
              borderRadiusLG: 18,
              boxShadow: '0 20px 60px rgba(3, 12, 23, 0.28)',
              boxShadowSecondary: '0 14px 40px rgba(15, 23, 42, 0.18)',
            },
            components: {
              Layout: {
                bodyBg: '#081521',
                headerBg: 'rgba(7, 20, 34, 0.7)',
                siderBg: 'linear-gradient(180deg, #071a2b 0%, #06131f 100%)',
                triggerBg: '#0d2236',
              },
              Menu: {
                darkItemBg: 'transparent',
                darkSubMenuItemBg: 'rgba(9, 24, 39, 0.45)',
                darkItemSelectedBg: 'linear-gradient(90deg, rgba(15, 118, 110, 0.26) 0%, rgba(34, 211, 238, 0.12) 100%)',
                darkItemSelectedColor: '#f8fbff',
                darkItemHoverBg: 'rgba(20, 50, 78, 0.64)',
                darkItemColor: '#9ab1c8',
                darkGroupTitleColor: '#5f7388',
                itemBorderRadius: 12,
                itemMarginInline: 10,
                itemMarginBlock: 6,
              },
              Card: {
                colorBgContainer: 'rgba(8, 25, 40, 0.76)',
                colorBorderSecondary: 'rgba(134, 166, 197, 0.12)',
                boxShadowTertiary: '0 18px 44px rgba(3, 12, 23, 0.22)',
                headerBg: 'transparent',
              },
              Table: {
                colorBgContainer: 'rgba(7, 20, 34, 0.72)',
                headerBg: 'rgba(16, 37, 57, 0.86)',
                headerColor: '#dbe7f5',
                colorText: '#c8d7e8',
                colorTextHeading: '#eff6ff',
                colorBorderSecondary: 'rgba(126, 156, 186, 0.12)',
                rowHoverBg: 'rgba(15, 118, 110, 0.08)',
                headerSplitColor: 'rgba(148, 163, 184, 0.12)',
              },
              Button: {
                borderRadius: 12,
                controlHeight: 38,
                defaultBg: 'rgba(9, 24, 39, 0.9)',
                defaultBorderColor: 'rgba(120, 153, 185, 0.18)',
                defaultColor: '#dce7f3',
                primaryShadow: '0 12px 24px rgba(15, 118, 110, 0.24)',
              },
              Input: {
                borderRadius: 12,
                colorBgContainer: 'rgba(6, 19, 31, 0.82)',
                activeBorderColor: '#14b8a6',
                hoverBorderColor: '#14b8a6',
              },
              Select: {
                borderRadius: 12,
                colorBgContainer: 'rgba(6, 19, 31, 0.82)',
                optionSelectedBg: 'rgba(15, 118, 110, 0.18)',
              },
              Modal: {
                contentBg: '#0a1b2c',
                headerBg: '#0a1b2c',
                titleColor: '#eff6ff',
              },
              Tabs: {
                itemColor: '#88a0b9',
                itemSelectedColor: '#f8fbff',
                itemHoverColor: '#dbeafe',
                inkBarColor: '#22d3ee',
              },
            },
          }}
        >
          <App />
        </ConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
