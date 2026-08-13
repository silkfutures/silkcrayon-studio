export default function manifest() {
  return {
    name: 'Silkcrayon Studio OS',
    short_name: 'Silkcrayon OS',
    description: 'Silkcrayon studio bookings, artists, payments and session reports.',
    start_url: '/admin/engineer',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  };
}
