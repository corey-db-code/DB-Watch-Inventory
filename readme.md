# Telegram Watch Mini App

A Telegram Mini App for displaying and selling watch inventory, powered by Google Sheets.

## Setup Instructions

### 1. Configure Google Sheets
1. Create a Google Sheet with your watch inventory
2. Use columns A, B, C for Description, Price, and Notes respectively
3. Make the sheet public (Share → Anyone with link → Viewer)
4. Copy the Sheet ID from the URL

### 2. Update Configuration
1. Open `config.js`
2. Replace `YOUR_SHEET_ID_HERE` with your actual Sheet ID
3. Update `SHEET_NAME` if different from 'Sheet1'

### 3. Host the Files
Upload all files to a web hosting service:
- GitHub Pages
- Netlify
- Vercel
- Your own web server

### 4. Create Telegram Bot & Mini App
1. Message @BotFather on Telegram
2. Use `/newbot` to create a bot
3. Use `/newapp` to create a mini app
4. Provide your hosted website URL

## File Structure
- `index.html` - Main HTML file
- `config.js` - Configuration for Google Sheets
- `assets/style.css` - Stylesheet
- `assets/app.js` - JavaScript functionality

## Features
- Real-time Google Sheets integration
- Purchase and offer functionality
- Mobile-responsive design
- Telegram Web App integration
- Automatic price parsing and status detection

## Google Sheets Format