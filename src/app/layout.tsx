import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { ToastProvider } from '@/components/toast';
import { I18nProvider } from '@/i18n/client';
import { getLocale, getT } from '@/i18n/server';
import './globals.css';

const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t('meta.appTitle'), template: '%s · PromoGest' },
    description: t('meta.appDesc'),
    icons: { icon: '/logo.webp' },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1c1813',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();
  return (
    <html lang={locale === 'pt' ? 'pt-PT' : 'en'} className={manrope.variable}>
      <body>
        <I18nProvider locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
