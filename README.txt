DateMate v2 - Web app with swipe UI and preferences

How to run:
1. Open this folder in VS Code.
2. In terminal:
   cd server
   npm install
   npm start
3. Serve the frontend (root folder) with Live Server extension and open index.html
4. Register two users, login, set preferences, go to Swipe to like/pass, matches appear when mutual.

Notes:
- Passwords stored plaintext in demo DB. Use hashing for production.
- SQLite DB at server/dbfile/dating.db
