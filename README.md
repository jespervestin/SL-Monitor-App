# SL Monitor App

A real-time Stockholm public transport monitoring application built with React and Vite.

## Features

- Real-time departure boards for Stockholm public transport
- Journey planner
- Service deviations and alerts
- Station search
- Dark/light theme support

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to GitHub Pages

This project is configured to deploy automatically to GitHub Pages using GitHub Actions.

### Initial Setup

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Repository name: `SL-Monitor-App` (or your preferred name)
   - Make it public (required for free GitHub Pages)
   - Don't initialize with README, .gitignore, or license

2. **Initialize git and push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/jespervestin/SL-Monitor-App.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repository Settings → Pages
   - Under "Source", select "GitHub Actions"
   - The workflow will automatically deploy on every push to `main`

4. **Configure Custom Domain:**
   - In repository Settings → Pages, add your custom domain: `sl-monitor.vestin.dev`
   - GitHub will create a CNAME file automatically (or use the one in `public/CNAME`)
   - Add a DNS CNAME record pointing `sl-monitor.vestin.dev` to `jespervestin.github.io`
   - Wait for DNS propagation (can take a few minutes to 48 hours)

### DNS Configuration

Add this CNAME record to your DNS provider (for vestin.dev):

```
Type: CNAME
Name: sl-monitor
Value: jespervestin.github.io
TTL: 3600 (or default)
```

### Automatic Deployment

Once set up, every push to the `main` branch will:
1. Build the project
2. Deploy to GitHub Pages
3. Make it available at `https://sl-monitor.vestin.dev`

## Technologies

- React 19
- Vite
- Tailwind CSS
- Lucide React Icons
- SL (Stockholm Public Transport) APIs
