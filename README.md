# 📊 Project Monthly Report Dashboard (with Supabase)

A premium, modern SaaS-style dashboard built for Content Writers to generate, manage, and export their monthly performance reports.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Production_Ready-success.svg)

## Features

- **Supabase Authentication:** Secure email/password login and registration.
- **Database online:** Reports are safely stored in a Postgres Database powered by Supabase.
- **Role-Based Access Control (RBAC):** Distinct permissions for `writer` and `admin` roles, secured by Row Level Security (RLS).
- **Admin Dashboard:** Admins can view all reports globally and change user roles dynamically.
- **Premium UI/UX:** Clean, modern 2026 SaaS design with glassmorphism effects and smooth animations.
- **Export to DOC:** Generate perfectly formatted MS Word `.doc` documents with one click.
- **Print Mode:** Optimized CSS for printing directly to PDF or paper.
- **Dark Mode:** Elegant dark theme with user preference memory.

## Setup & Installation (Supabase)

To run this application, you must connect it to your own Supabase project.

1. **Create a Supabase Project:**
   - Go to [Supabase](https://supabase.com) and create a new project.

2. **Run Database Migration:**
   - Go to the **SQL Editor** in your Supabase dashboard.
   - Copy the entire contents of the `supabase_schema.sql` file provided in this repository.
   - Paste it into the editor and click **Run**. This will automatically create all necessary tables, policies, and triggers.

3. **Connect the App:**
   - Go to **Project Settings -> API** in Supabase.
   - Copy your **Project URL** and **anon public API key**.
   - Open `app.js` in this repository and replace the placeholders at the top of the file:
     ```javascript
     const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
     const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
     ```

4. **Run the App:**
   - Open `index.html` in your modern web browser or use a local server like Live Server.

## How to become an Admin

By default, all new users who register are assigned the `writer` role.
To make yourself an admin so you can access the Admin Dashboard:
1. Register a new account on the app.
2. Go to your Supabase Dashboard -> Table Editor.
3. Open the `profiles` table.
4. Find your email/record, and double click the `role` cell.
5. Change it from `writer` to `admin` and save.
6. Refresh the web app. You will now see the Admin Panel.

## Deployment (Vercel)

This application is fully optimized for static deployment on Vercel.

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
3. Click **Add New** > **Project**.
4. Import your repository. Vercel will detect `vercel.json` and deploy it instantly.
