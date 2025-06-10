const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const sanitizeHtml = require('sanitize-html');

const multer = require('multer');
const uploadFolder = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database('temp.db', (err) => {
  if (err) console.error("Error opening database", err);
  else console.log("Database created.");
});

const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema, (err) => {
  if (err) {
    console.error("Error initializing schema", err);
  } else {
    console.log("Database initialized from schema.sql");
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use('/uploads', express.static(uploadFolder));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/general', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'general.html'));
});

app.get('/createthread', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'createthread.html'));
});

app.get('/thread', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'thread.html'));
});

app.get('/api/posts', (req, res) => {
  const postsQuery = `
    SELECT posts.*, COUNT(comments.id) AS comment_count
    FROM posts
    LEFT JOIN comments ON posts.id = comments.post_id
    GROUP BY posts.id
    ORDER BY posts.created_at DESC
  `;

  db.all(postsQuery, [], (err, posts) => {
    if (err) return res.status(500).json({ error: err.message });

    const postIds = posts.map(p => p.id);
    if (postIds.length === 0) return res.json(posts);

    const placeholders = postIds.map(() => '?').join(',');
    const commentsQuery = `
      SELECT * FROM comments
      WHERE post_id IN (${placeholders})
      ORDER BY created_at ASC
    `;

    db.all(commentsQuery, postIds, (err, comments) => {
      if (err) return res.status(500).json({ error: err.message });

      const commentsByPost = {};
      comments.forEach(c => {
        if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
        commentsByPost[c.post_id].push({
          content: c.content,
          created_at: c.created_at
        });
      });

      posts.forEach(post => {
        post.comments = commentsByPost[post.id] || [];
      });

      res.json(posts);
    });
  });
});

app.post('/post', (req, res) => {
  const rawTitle = req.body.title;
  const rawContent = req.body.content;

  if (!rawTitle || !rawContent) return res.redirect('/general');

  const title = sanitizeHtml(rawTitle, {
    allowedTags: [],
    allowedAttributes: {}
  });

  const content = sanitizeHtml(rawContent, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'img', 'iframe'],
    allowedAttributes: {
      a: ['href', 'target'],
      img: ['src', 'alt', 'style'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen']
    },
    allowedSchemes: ['http', 'https', 'data'],
  });

  db.run(
    'INSERT INTO posts (title, content) VALUES (?, ?)',
    [title, content],
    err => {
      if (err) return res.status(500).send("DB insert failed");
      res.redirect('/general');
    }
  );
});

app.post('/comment/:postId', (req, res) => {
  const postId = req.params.postId;
  const rawContent = req.body.content?.trim();
  let rawQuote = req.body.quote?.trim();

  if (!rawContent) return res.redirect(`/thread?${postId}`);

  if (rawQuote) {
    const match = rawQuote.match(/^"(.*?)"\s*\n\n([\s\S]*)$/s);
    if (match) {
      rawQuote = match[2].trim();
    }
  }

  const finalContent = rawQuote ? `" ${rawQuote} "\n\n${rawContent}` : rawContent;

  const stmt = db.prepare('INSERT INTO comments (post_id, content, created_at) VALUES (?, ?, datetime("now"))');
  stmt.run(postId, finalContent, () => {
    res.redirect(`/thread?${postId}`);
  });
});

app.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});