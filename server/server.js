const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null, uploadsDir),
  filename: (req,file,cb)=> { const ext = path.extname(file.originalname); const name = path.basename(file.originalname, ext).replace(/\s+/g,'_'); cb(null, `${name}_${Date.now()}${ext}`); }
});
const upload = multer({ storage });

const DB_DIR = path.join(__dirname, 'dbfile');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'dating.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(()=>{
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    display_name TEXT,
    age INTEGER,
    gender TEXT,
    city TEXT,
    bio TEXT,
    photo TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS preferences (
    username TEXT PRIMARY KEY,
    pref_gender TEXT DEFAULT 'Any',
    pref_min_age INTEGER DEFAULT 18,
    pref_max_age INTEGER DEFAULT 99,
    pref_city TEXT DEFAULT 'Any'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT,
    to_user TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS passes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT,
    to_user TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a TEXT,
    user_b TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT,
    receiver TEXT,
    content TEXT,
    ts INTEGER DEFAULT (strftime('%s','now'))
  )`);
});

app.use('/uploads', express.static(path.join(__dirname,'uploads')));

// register
app.post('/api/register',(req,res)=>{
  const { username, password, gender, age, city, display_name } = req.body;
  if (!username || !password) return res.status(400).send('username & password required');
  const stmt = db.prepare('INSERT INTO users (username,password,display_name,age,gender,city,bio,photo) VALUES (?,?,?,?,?,?,?,?)');
  stmt.run(username,password,display_name||username,age||18,gender||'Other',city||'Any','', '', function(err){
    if (err) return res.status(400).send(err.message);
    db.run('INSERT OR REPLACE INTO preferences (username) VALUES (?)', [username]);
    res.json({ id: this.lastID, username });
  });
});

// login
app.post('/api/login',(req,res)=>{
  const { username, password } = req.body;
  db.get('SELECT id, username, display_name, age, gender, city, bio, photo FROM users WHERE username=? AND password=?', [username,password], (err,row)=>{
    if (err) return res.status(500).send(err.message);
    if (!row) return res.status(401).send('Invalid credentials');
    db.get('SELECT pref_gender,pref_min_age,pref_max_age,pref_city FROM preferences WHERE username=?', [username], (err2,pref)=>{
      if (pref) row.preferences = pref;
      res.json(row);
    });
  });
});

// upload photo
app.post('/upload-photo', upload.single('photo'), (req,res)=>{
  if (!req.file) return res.status(400).send('No file uploaded');
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// update profile
app.post('/api/profile/update', (req,res)=>{
  const { username, display_name, age, gender, city, bio, photo } = req.body;
  db.run('UPDATE users SET display_name=?, age=?, gender=?, city=?, bio=?, photo=? WHERE username=?', [display_name,age,gender,city,bio,photo,username], function(err){
    if (err) return res.status(500).send(err.message);
    res.send('updated');
  });
});

// set preferences
app.post('/api/preferences', (req,res)=>{
  const { username, pref_gender, pref_min_age, pref_max_age, pref_city } = req.body;
  db.run('INSERT OR REPLACE INTO preferences (username, pref_gender, pref_min_age, pref_max_age, pref_city) VALUES (?,?,?,?,?)',
    [username, pref_gender||'Any', pref_min_age||18, pref_max_age||99, pref_city||'Any'], function(err){
      if (err) return res.status(500).send(err.message);
      res.send('preferences saved');
    });
});

// swipe candidate
app.get('/api/swipe_candidate', (req,res)=>{
  const { me } = req.query;
  if (!me) return res.status(400).send('me required');
  db.get('SELECT pref_gender,pref_min_age,pref_max_age,pref_city FROM preferences WHERE username=?', [me], (err,pref)=>{
    if (err) return res.status(500).send(err.message);
    const pg = pref?.pref_gender || 'Any';
    const minA = pref?.pref_min_age || 18;
    const maxA = pref?.pref_max_age || 99;
    const pcity = pref?.pref_city || 'Any';
    let sql = `SELECT u.username,u.display_name,u.age,u.gender,u.city,u.bio,u.photo FROM users u
               WHERE u.username != ?`;
    const params = [me];
    if (pg !== 'Any') { sql += ' AND u.gender = ?'; params.push(pg); }
    sql += ' AND u.age >= ? AND u.age <= ?'; params.push(minA, maxA);
    if (pcity !== 'Any') { sql += ' AND u.city = ?'; params.push(pcity); }
    sql += ` AND u.username NOT IN (SELECT to_user FROM likes WHERE from_user=?)
             AND u.username NOT IN (SELECT to_user FROM passes WHERE from_user=?)
             AND u.username NOT IN (
               SELECT CASE WHEN user_a=? THEN user_b WHEN user_b=? THEN user_a END FROM matches WHERE user_a=? OR user_b=?
             ) LIMIT 1`;
    params.push(me, me, me, me, me, me);
    db.get(sql, params, (err2,row)=>{
      if (err2) return res.status(500).send(err2.message);
      if (!row) return res.json({ candidate: null });
      res.json({ candidate: row });
    });
  });
});

// like
app.post('/api/like', (req,res)=>{
  const { from, to } = req.body; if (!from||!to) return res.status(400).send('from/to required');
  db.run('INSERT INTO likes (from_user,to_user) VALUES (?,?)', [from,to], function(err){
    if (err) return res.status(500).send(err.message);
    db.get('SELECT * FROM likes WHERE from_user=? AND to_user=?', [to,from], (err2,row)=>{
      if (err2) return res.status(500).send(err2.message);
      if (row) {
        db.get('SELECT * FROM matches WHERE (user_a=? AND user_b=?) OR (user_a=? AND user_b=?)', [from,to,to,from], (err3,m)=>{
          if (err3) return res.status(500).send(err3.message);
          if (!m) {
            db.run('INSERT INTO matches (user_a,user_b) VALUES (?,?)', [from,to], (err4)=>{
              if (err4) return res.status(500).send(err4.message);
              io.to(from).emit('match',{with:to}); io.to(to).emit('match',{with:from});
              return res.json({ match:true, message: "It's a match!" });
            });
          } else return res.json({ match:true, message: 'Already matched.' });
        });
      } else return res.json({ match:false, message: 'Liked' });
    });
  });
});

// pass
app.post('/api/pass', (req,res)=>{
  const { from, to } = req.body; if (!from||!to) return res.status(400).send('from/to required');
  db.run('INSERT INTO passes (from_user,to_user) VALUES (?,?)', [from,to], function(err){
    if (err) return res.status(500).send(err.message);
    res.json({ ok:true });
  });
});

// matches
app.get('/api/matches', (req,res)=>{
  const { username } = req.query; if (!username) return res.status(400).send('username required');
  db.all('SELECT user_a,user_b FROM matches WHERE user_a=? OR user_b=?', [username,username], (err,rows)=>{
    if (err) return res.status(500).send(err.message);
    const out = rows.map(r => (r.user_a === username ? r.user_b : r.user_a));
    res.json(out);
  });
});

// messages
app.post('/api/message',(req,res)=>{
  const { sender, receiver, content } = req.body;
  db.run('INSERT INTO messages (sender, receiver, content) VALUES (?,?,?)', [sender,receiver,content], function(err){
    if (err) return res.status(500).send(err.message);
    io.to(receiver).emit('message',{ sender, receiver, content, ts: Date.now() });
    res.json({ ok:true });
  });
});

app.get('/api/messages',(req,res)=>{
  const { a,b } = req.query;
  db.all('SELECT sender,receiver,content,ts FROM messages WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?) ORDER BY ts ASC', [a,b,b,a], (err,rows)=>{ if (err) return res.status(500).send(err.message); res.json(rows); });
});

// profile
app.get('/api/profile',(req,res)=>{ const { username } = req.query; db.get('SELECT username,display_name,age,gender,city,bio,photo FROM users WHERE username=?', [username], (err,row)=>{ if (err) return res.status(500).send(err.message); res.json(row); }); });

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Server running on http://localhost:'+PORT));

io.on('connection',(socket)=>{ socket.on('join', (username)=>{ if(username) socket.join(username); }); socket.on('send_message', (payload)=>{ const { sender, receiver, content } = payload; db.run('INSERT INTO messages (sender, receiver, content) VALUES (?,?,?)', [sender,receiver,content], function(err){ if (err) return; io.to(receiver).emit('message',{ sender, receiver, content, ts: Date.now() }); io.to(sender).emit('message_sent',{ sender, receiver, content, ts: Date.now() }); }); }); socket.on('disconnect', ()=>{}); });
