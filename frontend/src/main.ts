import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// PWA Registration
import { registerServiceWorker } from './plugins/pwa'

const app = createApp(App)

app.use(router)

// Register PWA service worker
registerServiceWorker()

// Add offline detection
window.addEventListener('online', () => {
  console.log('Online')
})

window.addEventListener('offline', () => {
  console.log('Offline')
  // Show offline indicator
  const offlineIndicator = document.createElement('div')
  offlineIndicator.id = 'offline-indicator'
  offlineIndicator.textContent = 'You are currently offline'
  offlineIndicator.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: #ff4757;
    color: white;
    text-align: center;
    padding: 10px;
    z-index: 1000;
  `
  document.body.appendChild(offlineIndicator)
  
  // Remove after 5 seconds
  setTimeout(() => {
    if (offlineIndicator.parentNode) {
      offlineIndicator.parentNode.removeChild(offlineIndicator)
    }
  }, 5000)
})  

app.mount('#app')
