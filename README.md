# 📊 Content Writer Monthly Report Dashboard

A premium, modern SaaS-style dashboard built for Content Writers to generate, manage, and export their monthly performance reports.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Production_Ready-success.svg)

## ✨ Features

- **Premium UI/UX:** Clean, modern 2026 SaaS design with glassmorphism effects and smooth animations.
- **No Build Required:** Built purely with HTML, CSS, and Vanilla JavaScript. Extremely lightweight.
- **Local Storage Architecture:** 100% client-side data persistence. No backend required.
- **Auto-Save Drafts:** Never lose your work while filling out the long report form.
- **Export to DOC:** Generate perfectly formatted MS Word `.doc` documents with one click.
- **Print Mode:** Optimized CSS for printing directly to PDF or paper.
- **Dark Mode:** Elegant dark theme with user preference memory.
- **Fully Responsive:** Works perfectly on desktop, tablet, and mobile devices.

## 🚀 Getting Started (Local Development)

Because this project relies entirely on client-side technologies without external framework dependencies, running it is incredibly simple.

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Open `index.html` in your modern web browser.
   *(Alternatively, use a local server like Live Server in VS Code for a better development experience).*

## ☁️ Deployment (Vercel)

This application is fully optimized for static deployment on Vercel.

### Method 1: Vercel CLI (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root directory.
3. Follow the prompts to deploy.

### Method 2: Git Integration
1. Push this repository to GitHub/GitLab/Bitbucket.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
3. Click **Add New** > **Project**.
4. Import your repository.
5. Vercel will automatically detect the settings from `vercel.json` and deploy your app instantly.

## 🛠 Architecture & Tech Stack

- **HTML5:** Semantic, accessible structure with ARIA labels.
- **CSS3:** Custom properties (variables), Flexbox/Grid, Glassmorphism, animations. No CSS frameworks used.
- **Vanilla JavaScript:** Modular architecture (`Storage`, `UI`, `Utils`, `app` instances) for high maintainability.
- **Phosphor Icons:** Beautiful, consistent iconography via CDN.
- **FileSaver.js:** Lightweight library for triggering file downloads (used for Word Export).

## 📁 File Structure

```text
/
├── index.html       # Semantic HTML layout and app skeleton
├── style.css        # Premium SaaS styling and responsive design
├── app.js           # Modular JS logic (State, UI, Utilities)
├── vercel.json      # Vercel deployment configuration & security headers
└── README.md        # Project documentation
```

## 🔒 Security & Performance

- Input fields are sanitized before rendering to prevent XSS.
- `vercel.json` includes strict security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`).
- Static assets are aggressively cached on deployment for maximum performance.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
