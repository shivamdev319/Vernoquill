const express = require('express')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const app = express()
const port = 3000

// Set EJS as the view engine
app.set('view engine', 'ejs')

// Session configuration
app.use(session({
  secret: 'vernoquill-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}))

// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Serve static files from public directory
app.use(express.static('public'))

// Writer credentials (in real app, this would be in a database)
const writers = [
  {
    id: 1,
    username: 'writer',
    password: 'password123' // For testing - will hash this properly
  }
]

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next()
  } else {
    return res.redirect('/login?error=Please log in to access this page')
  }
}

// Make authentication status available to all templates
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session && req.session.isAuthenticated
  res.locals.currentUser = req.session && req.session.user
  next()
})

// Sample blog posts data (in real app, this would be a database)
let blogPosts = [
  {
    id: 1,
    title: "Welcome to Vernoquill",
    author: "Admin",
    date: "2025-09-29",
    excerpt: "Welcome to our new blog platform! This is your first post to get you started.",
    content: "Welcome to Vernoquill, your new favorite blogging platform. This is a sample post to demonstrate the blog functionality. You can write about anything you're passionate about - technology, lifestyle, travel, or any topic that interests you. The platform is built with Node.js, Express, and EJS templating for a smooth and responsive experience."
  },
  {
    id: 2,
    title: "The Power of Node.js",
    author: "Tech Writer",
    date: "2025-09-28",
    excerpt: "Exploring the versatility and performance benefits of Node.js in modern web development.",
    content: "Node.js has revolutionized server-side development by bringing JavaScript to the backend. Its event-driven, non-blocking I/O model makes it incredibly efficient for building scalable network applications. Whether you're building APIs, real-time applications, or full-stack web applications like this blog, Node.js provides the tools and performance you need."
  },
  {
    id: 3,
    title: "Getting Started with EJS Templating",
    author: "Developer",
    date: "2025-09-27",
    excerpt: "Learn how EJS makes it easy to create dynamic web pages with embedded JavaScript.",
    content: "EJS (Embedded JavaScript) is a simple templating language that lets you generate HTML markup with plain JavaScript. It's perfect for creating dynamic web pages where you need to inject data from your server. With features like includes for partials and support for JavaScript expressions, EJS makes building dynamic websites straightforward and maintainable."
  }
]

// Helper function to get next available ID
function getNextId() {
  return blogPosts.length > 0 ? Math.max(...blogPosts.map(post => post.id)) + 1 : 1;
}

// Helper function to generate excerpt from content
function generateExcerpt(content, length = 150) {
  return content.length > length ? content.substring(0, length) + '...' : content;
}

// Routes
app.get('/', (req, res) => {
  const { success, error } = req.query;
  res.render('index', { 
    posts: blogPosts, 
    title: 'Vernoquill Blog',
    success: success,
    error: error
  })
})

// Create new post
app.post('/posts', requireAuth, (req, res) => {
  const { title, author, content } = req.body
  
  if (!title || !author || !content) {
    return res.status(400).redirect('/?error=Please fill in all fields')
  }
  
  const newPost = {
    id: getNextId(),
    title: title.trim(),
    author: author.trim(),
    date: new Date().toISOString().split('T')[0],
    excerpt: generateExcerpt(content.trim()),
    content: content.trim()
  }
  
  blogPosts.unshift(newPost) // Add to beginning of array
  res.redirect('/?success=Post created successfully')
})

app.get('/post/:id', (req, res) => {
  const postId = parseInt(req.params.id)
  const post = blogPosts.find(p => p.id === postId)
  
  if (post) {
    res.render('post', { post: post, title: post.title })
  } else {
    res.status(404).render('404', { title: 'Post Not Found' })
  }
})

// Edit post page
app.get('/post/:id/edit', requireAuth, (req, res) => {
  const postId = parseInt(req.params.id)
  const post = blogPosts.find(p => p.id === postId)
  const { success, error } = req.query;
  
  if (post) {
    res.render('edit', { 
      post: post, 
      title: `Edit: ${post.title}`,
      success: success,
      error: error
    })
  } else {
    res.status(404).render('404', { title: 'Post Not Found' })
  }
})

// Update post
app.post('/post/:id/edit', requireAuth, (req, res) => {
  const postId = parseInt(req.params.id)
  const { title, author, content } = req.body
  const postIndex = blogPosts.findIndex(p => p.id === postId)
  
  if (postIndex === -1) {
    return res.status(404).render('404', { title: 'Post Not Found' })
  }
  
  if (!title || !author || !content) {
    return res.redirect(`/post/${postId}/edit?error=Please fill in all fields`)
  }
  
  // Update the post
  blogPosts[postIndex] = {
    ...blogPosts[postIndex],
    title: title.trim(),
    author: author.trim(),
    content: content.trim(),
    excerpt: generateExcerpt(content.trim())
  }
  
  res.redirect(`/post/${postId}?success=Post updated successfully`)
})

// Delete post
app.post('/post/:id/delete', requireAuth, (req, res) => {
  const postId = parseInt(req.params.id)
  const postIndex = blogPosts.findIndex(p => p.id === postId)
  
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' })
  }
  
  blogPosts.splice(postIndex, 1)
  res.redirect('/?success=Post deleted successfully')
})

// Login routes
app.get('/login', (req, res) => {
  console.log('GET /login');
  const error = req.query.error
  res.render('login', { 
    title: 'Writer Login',
    error: error
  })
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.redirect('/login?error=Please provide both username and password')
  }

  const writer = writers.find(w => w.username === username)
  if (!writer) {
    return res.redirect('/login?error=Invalid username or password')
  }

  // Support both hashed and plaintext (dev) passwords
  let passwordMatch = false
  try {
    const isHash = typeof writer.password === 'string' && /^\$2[aby]\$/.test(writer.password)
    if (isHash) {
      passwordMatch = await bcrypt.compare(password, writer.password)
    } else {
      passwordMatch = password === writer.password
    }
  } catch (e) {
    console.error('Password check error:', e)
    return res.redirect('/login?error=Authentication error, please try again')
  }

  if (!passwordMatch) {
    return res.redirect('/login?error=Invalid username or password')
  }

  req.session.isAuthenticated = true
  req.session.user = { id: writer.id, username: writer.username }
  return res.redirect('/dashboard?success=Successfully logged in as writer')
})

// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/?error=Error logging out')
    }
    res.redirect('/?success=Successfully logged out')
  })
})

// Writer dashboard (protected)
app.get('/dashboard', requireAuth, (req, res) => {
  const { success, error } = req.query
  res.render('dashboard', {
    title: 'Writer Dashboard',
    posts: blogPosts,
    success,
    error
  })
})

app.get('/about', (req, res) => {
  res.render('about', { title: 'About Vernoquill' })
})

// Health endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.listen(port, () => {
  console.log(`Vernoquill blog server listening on http://localhost:${port}`)
})

