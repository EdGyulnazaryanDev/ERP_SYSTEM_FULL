import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export interface AppSettings {
  platform_name?: string;
  theme_primary_color?: string;
  theme_logo_url?: string;
  theme_dark_mode?: string;
  footer_text?: string;
  footer_links?: string;
  footer_show_powered_by?: string;
}

export function useAppSettings() {
  const { data: settings = {} } = useQuery<AppSettings>({
    queryKey: ['app-public-settings'],
    queryFn: async () => (await apiClient.get('/admin/settings/public')).data,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  // Apply dark/light mode
  useEffect(() => {
    const isDark = settings.theme_dark_mode !== 'false'; // default dark
    document.documentElement.classList.toggle('light-mode', !isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [settings.theme_dark_mode]);

  // Apply platform name to document title
  useEffect(() => {
    if (settings.platform_name) {
      document.title = settings.platform_name;
    }
  }, [settings.platform_name]);

  // Apply primary color as CSS variable for non-Ant components
  useEffect(() => {
    if (settings.theme_primary_color) {
      document.documentElement.style.setProperty('--color-primary', settings.theme_primary_color);
    }
  }, [settings.theme_primary_color]);

  const footerLinks: { label: string; url: string }[] = (() => {
    try {
      return settings.footer_links ? JSON.parse(settings.footer_links) : [];
    } catch {
      return [];
    }
  })();

  return {
    settings,
    primaryColor: settings.theme_primary_color || '#0f766e',
    isDarkMode: settings.theme_dark_mode !== 'false',
    platformName: settings.platform_name || 'ERP System',
    footerText: settings.footer_text || '',
    footerLinks,
    showPoweredBy: settings.footer_show_powered_by !== 'false',
    logoUrl: settings.theme_logo_url || '',
  };
}
