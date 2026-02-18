# 🚀 Deployment Guide: Gourmet QR App

This guide will help you take your project from your local computer to the live internet using **GitHub** and **Render** (or Railway).

## 1. Prepare Your GitHub Repository
1.  Go to [GitHub](https://github.com) and create a new public repository named `qr-food-app`.
2.  Open your terminal in the project root and run:
    ```bash
    git init
    git add .
    git commit -m "Initial deployment-ready commit"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/qr-food-app.git
    git push -u origin main
    ```

## 2. Set Up an Online Database (MySQL)
Your local MySQL won't work in the cloud. We recommend **Railway** or **Aiven**:
1.  Create a MySQL database on your chosen platform.
2.  Grab the `Host`, `User`, `Password`, and `Database Name`.
3.  Run the `init_db.js` logic or import your SQL schema to create the tables.

## 3. Deploy to Render (Backend + Frontend)
Render is great for hosting Node.js apps for free:
1.  Connect your GitHub repository to Render.
2.  Select **Web Service**.
3.  **Build Command**: `cd frontend && npm install && npm run build && cd .. && npm install`
4.  **Start Command**: `node server.js`
5.  **Environment Variables**: Add the following in the Render "Env" tab:
    - `DB_HOST`: (Your online DB host)
    - `DB_USER`: (Your online DB user)
    - `DB_PASSWORD`: (Your online DB password)
    - `DB_NAME`: (Your online DB name)
    - `SESSION_SECRET`: (Any long random string)
    - `NODE_ENV`: `production`

## 4. Final Verification
Once the build is finished, Render will provide a URL (e.g., `https://qr-food-app.onrender.com`). Visit it to see your live Gourmet QR experience!

---
> [!TIP]
> Always test your `.env` values locally with a dummy database before pushing if you want to be 100% sure!
