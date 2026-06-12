import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config.js';
import { logger } from './middleware/logger.js';
import chatRoutes from './routes/chatRoutes.js';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';
import forge from 'node-forge';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app: Express = express();

// Generate self-signed certificate
async function generateCertificate(): Promise<{ key: string; cert: string }> {
  try {
    // Check if certificate files already exist
    const keyPath = path.resolve(__dirname, '../ssl/key.pem');
    const certPath = path.resolve(__dirname, '../ssl/cert.pem');
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      console.log('Using existing SSL certificate');
      const key = fs.readFileSync(keyPath, 'utf8');
      const cert = fs.readFileSync(certPath, 'utf8');
      return { key, cert };
    }
    
    console.log('Generating new SSL certificate...');
    
    // Create a private key
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const privateKey = keys.privateKey;
    const publicKey = keys.publicKey;
    
    // Create a certificate
    const cert = forge.pki.createCertificate();
    cert.publicKey = publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setDate(cert.validity.notAfter.getDate() + config.certValidityDays);
    
    const attrs = [
      { name: 'commonName', value: config.domain },
      { name: 'organizationName', value: 'LLM Chat Application' },
      { name: 'emailAddress', value: config.email }
    ];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true
      },
      {
        name: 'keyUsage',
        digitalSignature: true,
        keyEncipherment: true,
        keyCertSign: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true
      }
    ]);
    
    // Sign the certificate with the private key
    cert.sign(privateKey);
    
    // Convert to PEM format
    const certPem = forge.pki.certificateToPem(cert);
    const keyPem = forge.pki.privateKeyToPem(privateKey);
    
    // Ensure ssl directory exists
    const sslDir = path.resolve(__dirname, '../ssl');
    if (!fs.existsSync(sslDir)) {
      fs.mkdirSync(sslDir, { recursive: true });
    }
    
    // Save certificate files
    fs.writeFileSync(keyPath, keyPem);
    fs.writeFileSync(certPath, certPem);
    
    console.log('SSL certificate generated successfully');
    
    return { key: keyPem, cert: certPem };
  } catch (error) {
    console.error('Failed to generate certificate:', error);
    throw error;
  }
}

// Middleware
app.use(express.json());
app.use(cors());
app.use(logger);

// Routes
app.use('/', chatRoutes);

// Serve frontend build in production
if (config.nodeEnv === 'production') {
  app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));
}

// Start server
async function startServer() {
  try {
    if (config.nodeEnv === 'production') {
      // Generate certificate for production
      const { key, cert } = await generateCertificate();
      
      // Create HTTPS server
      const httpsServer = https.createServer({ key, cert }, app);
      
      httpsServer.listen(443, () => {
        console.log(`HTTPS Server running on https://${config.domain}`);
      });
    } else {
      // Use HTTP for development
      app.listen(config.port, () => {
        console.log(`Server running on http://localhost:${config.port}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();