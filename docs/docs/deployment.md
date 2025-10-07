---
sidebar_position: 8
---

# Deployment

Deploy your Peaque application to production with these guides.

## Building for Production

Build your application for production:

```bash
npm run build
```

This will:
- Compile TypeScript to JavaScript
- Bundle and optimize your frontend code
- Process and minify CSS
- Generate optimized production assets in `.peaque/dist/`

## Starting Production Server

After building, start the production server:

```bash
npm start
```

The server will run on `PORT` from your environment variables (default: 3000).

## Environment Variables

Set production environment variables:

```bash title=".env.production"
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://prod-db.example.com:5432/mydb
API_SECRET=your-production-secret
```

## Deployment Platforms

### Node.js Hosting (DigitalOcean, AWS, etc.)

1. **Build your application:**
   ```bash
   npm run build
   ```

2. **Upload files to server:**
   ```bash
   # Upload these files/folders:
   - dist/
   - .peaque/
   - package.json
   - package-lock.json
   - .env.production
   ```

3. **Install dependencies on server:**
   ```bash
   npm install --production
   ```

4. **Start the server:**
   ```bash
   NODE_ENV=production npm start
   ```

### Docker

Create a `Dockerfile`:

```dockerfile title="Dockerfile"
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t my-peaque-app .
docker run -p 3000:3000 my-peaque-app
```

### Docker Compose

```yaml title="docker-compose.yml"
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_PASSWORD=secret
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

Run with:

```bash
docker-compose up -d
```

### Process Managers (PM2)

Use PM2 for process management:

```bash
npm install -g pm2
```

Create an ecosystem file:

```javascript title="ecosystem.config.js"
module.exports = {
  apps: [{
    name: 'peaque-app',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster'
  }]
};
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Reverse Proxy (Nginx)

Configure Nginx as a reverse proxy:

```nginx title="/etc/nginx/sites-available/myapp"
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL/HTTPS

### Using Let's Encrypt with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

Certbot will automatically configure SSL and set up auto-renewal.

## Performance Tips

1. **Enable Compression**
   - Most platforms enable gzip/brotli automatically
   - For custom servers, add compression middleware

2. **Use CDN**
   - Serve static assets from a CDN
   - Configure `PEAQUE_PUBLIC_CDN_URL` for asset URLs

3. **Database Connection Pooling**
   - Use connection pooling for databases
   - Configure appropriate pool sizes

4. **Caching**
   - Implement Redis or similar for session storage
   - Cache API responses where appropriate

5. **Health Checks**
   - Add a health check endpoint for monitoring

```typescript title="src/api/health/route.ts"
import type { PeaqueRequest } from 'peaque-framework';

export async function GET(req: PeaqueRequest) {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
}
```

## Monitoring

Consider adding monitoring tools:

- **Application Performance**: New Relic, DataDog, AppDynamics
- **Error Tracking**: Sentry, Rollbar, Bugsnag
- **Logging**: Winston, Pino, LogRocket
- **Uptime Monitoring**: UptimeRobot, Pingdom, StatusCake

## Scaling

### Horizontal Scaling

Run multiple instances behind a load balancer:

```bash
# Using PM2 cluster mode
pm2 start ecosystem.config.js --instances max

# Or manually with multiple processes
PORT=3001 npm start &
PORT=3002 npm start &
PORT=3003 npm start &
```

### Load Balancer

Configure a load balancer (e.g., HAProxy, AWS ELB) to distribute traffic across instances.

## Future CLI Features

We're expanding the Peaque CLI tool beyond project creation to include deployment capabilities. Future versions will provide streamlined commands for building, deploying, and managing your applications across different platforms. This will simplify the deployment process and reduce manual configuration.

## Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure all required environment variables
- [ ] Run `npm run build` successfully
- [ ] Test the production build locally
- [ ] Set up SSL/HTTPS
- [ ] Configure database connections
- [ ] Set up monitoring and error tracking
- [ ] Configure backups
- [ ] Test all critical user flows
- [ ] Set up health checks
- [ ] Configure logging
- [ ] Review security settings
