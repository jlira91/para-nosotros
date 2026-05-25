import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Para Nosotros',
    short_name: 'Para Nosotros',
    description: 'Tu espacio compartido en pareja',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FDFAF7',
    theme_color: '#C4737A',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
