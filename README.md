# FitTrack — 8 Week Fitness Tracker

FitTrack is a static personal fitness tracker designed for an 8-week fat-loss and muscle-preservation phase.

## Cloud sync

This version uses Supabase Authentication + PostgreSQL through the Supabase JavaScript client. The browser uses the Supabase **publishable key**, which is intended for public client applications. Row Level Security (RLS) protects each user's data.

### Current Supabase project

- Project URL: `https://psnhmrlqjklkgoxbxfny.supabase.co`
- Tables: `profiles`, `daily_logs`, `food_logs`, `workout_logs`

### Important

Never put a Supabase secret/service-role key or database password in this website. The publishable key is the client-side key used here.

## Deploy to GitHub Pages

1. Replace the files in your local `fittrack` repository with this folder's files.
2. In Command Prompt, run:

```bash
git add .
git commit -m "Connect FitTrack to Supabase cloud sync"
git push
```

3. Open your GitHub Pages URL:

`https://sameer270422.github.io/fittrack/`

## Supabase Auth URL configuration

In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to:

`https://sameer270422.github.io/fittrack/`

If you use email confirmation, confirm the account email before signing in.

## Local cache

A browser cache is retained as a fallback. If the cloud account is empty but this browser has old FitTrack data, the app asks whether you want to upload that local data to Supabase.
