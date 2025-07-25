const express = require('express');
const session = require('express-session');
const fs = require('fs');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(session({ secret: 'segredo', resave: false, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Carregar usuários
let users = [];
if (fs.existsSync('./users.json')) {
  users = JSON.parse(fs.readFileSync('./users.json'));
}

// Página principal
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.send(renderLoginPage());
  }
  res.send(renderMainPage(req.session.user));
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const found = users.find(u => u.username === username && u.password === password);
  if (found) {
    req.session.user = username;
    return res.redirect('/');
  }
  res.send('<script>alert("Login inválido"); location.href="/";</script>');
});

// Cadastro
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.send('<script>alert("Usuário já existe"); location.href="/";</script>');
  }
  users.push({ username, password });
  fs.writeFileSync('./users.json', JSON.stringify(users, null, 2));
  req.session.user = username;
  res.redirect('/');
});

// Download
app.post('/download', (req, res) => {
  const url = req.body.url;
  if (!url) return res.send('URL inválida');

  const fileName = `music_${Date.now()}.mp3`;
  const command = `yt-dlp -f bestaudio --extract-audio --audio-format mp3 --cookies cookies.txt -o "${fileName}" "${url}"`;

  exec(command, (err) => {
    if (err) return res.send('Erro ao baixar: ' + err.message);
    res.download(fileName, () => {
      fs.unlinkSync(fileName); // Remove após download
    });
  });
});

// Função: Renderiza Login
function renderLoginPage() {
  return `
  <html><head><title>PlayerImp - Login</title></head>
  <body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;margin-top:50px;">
    <h1>🎵 PlayerImp 🎧</h1>
    <form method="POST" action="/login">
      <input name="username" placeholder="Usuário"><br>
      <input name="password" type="password" placeholder="Senha"><br>
      <button type="submit">Entrar</button>
    </form>
    <form method="POST" action="/register">
      <input name="username" placeholder="Novo usuário"><br>
      <input name="password" type="password" placeholder="Nova senha"><br>
      <button type="submit">Registrar</button>
    </form>
  </body></html>`;
}

// Função: Renderiza Player
function renderMainPage(user) {
  return `
  <html>
  <head>
    <title>PlayerImp</title>
    <style>
      body {
        background: linear-gradient(135deg, #111, #222);
        color: #0f0;
        font-family: 'Segoe UI', sans-serif;
        text-align: center;
        padding-top: 50px;
      }
      input, button {
        padding: 10px;
        margin: 10px;
        background: #222;
        border: none;
        color: #0f0;
        border-radius: 5px;
      }
      audio {
        width: 300px;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <h1>🎶 Bem-vindo, ${user} 🎶</h1>
    <form method="POST" action="/download">
      <input name="url" placeholder="Cole o link do YouTube">
      <button type="submit">⬇️ Baixar Música</button>
    </form>

    <h3>📡 Player Ao Vivo</h3>
    <input id="yturl" placeholder="Link do YouTube direto (https://youtube.com/watch?v=...)">
    <button onclick="play()">▶️ Play</button>
    <br>
    <audio id="player" controls></audio>

    <script>
      function play() {
        const url = document.getElementById('yturl').value;
        const videoId = new URL(url).searchParams.get('v');
        if (!videoId) return alert("URL inválida");

        const audio = document.getElementById('player');
        audio.src = "https://www.youtube.com/embed/" + videoId + "?autoplay=1";
        alert("A reprodução será feita direto do YouTube");
      }
    </script>
  </body></html>`;
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log("Servidor rodando em http://localhost:" + PORT);
});