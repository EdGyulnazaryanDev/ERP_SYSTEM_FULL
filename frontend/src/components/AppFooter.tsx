import { useAppSettings } from '@/hooks/useAppSettings';

export default function AppFooter() {
  const { footerText, footerLinks, showPoweredBy, platformName } = useAppSettings();

  if (!footerText && footerLinks.length === 0 && !showPoweredBy) return null;

  return (
    <div style={{
      padding: '10px 24px',
      borderTop: '1px solid rgba(134,166,197,0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      fontSize: 12,
      color: '#5f7388',
    }}>
      <span>{footerText || (showPoweredBy ? `© ${new Date().getFullYear()} ${platformName}` : '')}</span>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {footerLinks.map((link) => (
          <a
            key={link.url}
            href={link.url}
            style={{ color: '#5f7388', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#c8dff0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#5f7388')}
          >
            {link.label}
          </a>
        ))}
        {showPoweredBy && (
          <span style={{ opacity: 0.5 }}>Powered by {platformName}</span>
        )}
      </div>
    </div>
  );
}
