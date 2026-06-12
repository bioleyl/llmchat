// Register the service worker for PWA functionality
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(registration => {
          console.log('SW registered: ', registration);
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('New content is available; please refresh.');
                  } else {
                    console.log('Content is cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch(error => {
          console.log('SW registration failed: ', error);
        });
    });
  } else if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
    console.log('Service workers require HTTPS in production');
  }
}