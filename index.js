const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const methodOverride = require('method-override');
const jwt = require('jsonwebtoken');
const classifyTask = require('./utils/aiClassifier');
require('dotenv').config();
const sendReminder = require('./utils/mailer');


const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set `true` in production with HTTPS
}));



// Import models
const User = require('./models/User');
const Task = require('./models/Task');

// Import middleware
const auth = require('./middleware/auth');

// MongoDB Connection URI with fallback
const mongoURI = process.env.MONGODB_URI ;
console.log('Attempting to connect to MongoDB at:', mongoURI);

// Connect to MongoDB
mongoose.connect(mongoURI)
    .then(() => {
        console.log('Connected to MongoDB successfully');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    });

app.get('/trigger-reminder', async (req, res) => {
  const token = req.query.token;

  if (token !== process.env.REMINDER_TRIGGER_TOKEN) {
    return res.status(403).send('Unauthorized');
  }

  const users = await User.find({ isVerified: true });

  // Morning
  const hour = new Date().getHours();
  const isMorning = hour < 12;

  users.forEach(user => {
    const subject = isMorning ? '📝 Morning Task Reminder' : '🌙 Evening Task Reminder';
    const message = isMorning
      ? `<p>🌞 Good morning ${user.username},</p>
         <p>Time to add today's tasks ➕ <a href="https://taskmanagerbyjayptl.onrender.com/tasks/new">Add Now</a> 🗒️</p>
         <p>– 🚀 Task Manager by Jay Patel</p>`
      : `<p>🌆 Good evening ${user.username},</p>
         <p>Don’t forget to update your progress ✅ <a href="https://taskmanagerbyjayptl.onrender.com/tasks">Update Now</a> 📌</p>
         <p>– ✨ Task Manager by Jay Patel</p>`;

    sendReminder(user.email, subject, message);
  });

  res.send('Reminders sent!');
});


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user data available to all templates
app.use(async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;
        if (accessToken) {
            const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET || 'your-jwt-access-secret');
            const user = await User.findById(decoded._id);
            res.locals.user = user;
        } else {
            res.locals.user = null;
        }
    } catch (error) {
        res.locals.user = null;
    }
    next();
});

app.post('/verify-email', async (req, res) => {
  const { email, otp } = req.body;
  const sessionUser = req.session.tempUser;

  if (!sessionUser || sessionUser.email !== email) {
    return res.render('auth/verify-email', {
      email,
      error: 'Session expired or invalid access.'
    });
  }

  if (parseInt(otp) !== sessionUser.otp || Date.now() > req.session.otpExpires) {
    return res.render('auth/verify-email', {
      email,
      error: 'Invalid or expired OTP.'
    });
  }

  // Save the user now
  const user = new User({
    username: sessionUser.username,
    email: sessionUser.email,
    password: sessionUser.password,
    isVerified: true
  });

  await user.save();

  // Generate JWTs
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Clear session
  req.session.tempUser = null;
  req.session.otpExpires = null;

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.redirect('/tasks');
});

// Routes
app.get('/', (req, res) => {
    res.render('landing');
});

// About page route
app.get('/about', (req, res) => {
    res.render('about');
});

// Auth routes
app.get('/register', (req, res) => {
    res.render('auth/register');
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      const errorMessage = existingUser.username === username
        ? 'Username is already taken.'
        : 'Email is already registered.';
      return res.render('auth/register', {
        error: errorMessage,
        data: req.body
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Save to session, not database
    req.session.tempUser = { username, email, password, otp };
    req.session.otpExpires = Date.now() + 5 * 60 * 1000;

    // Send OTP via email
    const sendOTP = require('./utils/sendOTP');
    await sendOTP(email, otp);

    // Redirect to OTP verification
    res.redirect(`/verify-email?email=${email}`);
  } catch (error) {
    console.error('Registration error:', error);
    res.render('auth/register', {
      error: 'An error occurred during registration',
      data: req.body
    });
  }
});
app.get('/verify-email', (req, res) => {
  res.render('auth/verify-email', { email: req.query.email, error: null });
});

app.get('/login', (req, res) => {
    res.render('auth/login', { 
        error: null,
        data: {}
    });
});

app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user || !(await user.comparePassword(req.body.password))) {
            return res.render('auth/login', { 
                error: 'Invalid credentials',
                data: { email: req.body.email }
            });
        }

        // 🔒 CHECK EMAIL VERIFICATION
        if (!user.isVerified) {
            return res.render('auth/login', {
                error: 'Email not verified. please veryfied your email using register',
                data: { email: req.body.email }
            });
        }

        // ✅ Generate tokens
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        await user.save();

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.redirect('/tasks');

    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', { 
            error: 'An error occurred during login',
            data: { email: req.body.email }
        });
    }
});


app.post('/logout', auth, async (req, res) => {
    try {
        // Clear refresh token in database
        req.user.refreshToken = null;
        await req.user.save();
        
        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.redirect('/');
    } catch (error) {
        console.error('Logout error:', error);
        res.redirect('/');
    }
});

// Task routes - All protected with auth middleware
const taskRouter = express.Router();
app.use('/tasks', auth, taskRouter);

// List all tasks
taskRouter.get('/', async (req, res) => {
    try {
        const tasks = await Task.find({ owner: req.user._id }).sort({ createdAt: -1 });
        res.render('tasks/index', { 
            tasks,
            title: `${req.user.username}'s Tasks`,
            filter: 'all'
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.redirect('/');
    }
});

// List pending tasks
taskRouter.get('/pending', async (req, res) => {
    try {
        const tasks = await Task.find({ 
            owner: req.user._id,
            status: { $ne: 'completed' }
        }).sort({ createdAt: -1 });
        
        res.render('tasks/index', { 
            tasks,
            title: `${req.user.username}'s Pending Tasks`,
            filter: 'pending'
        });
    } catch (error) {
        console.error('Error fetching pending tasks:', error);
        res.redirect('/tasks');
    }
});

// List completed tasks
taskRouter.get('/completed', async (req, res) => {
    try {
        const tasks = await Task.find({ 
            owner: req.user._id,
            status: 'completed'
        }).sort({ createdAt: -1 });
        
        res.render('tasks/index', { 
            tasks,
            title: `${req.user.username}'s Completed Tasks`,
            filter: 'completed'
        });
    } catch (error) {
        console.error('Error fetching completed tasks:', error);
        res.redirect('/tasks');
    }
});
// Filter tasks by category (AI)
taskRouter.get('/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const tasks = await Task.find({
            owner: req.user._id,
            category: category
        }).sort({ createdAt: -1 });

        res.render('tasks/index', {
            tasks,
            title: `${req.user.username}'s ${category} Tasks`,
            filter: 'category',
            selectedCategory: category
        });
    } catch (error) {
        console.error('Error filtering tasks by category:', error);
        res.redirect('/tasks');
    }
});


// Create new task form
taskRouter.get('/new', (req, res) => {
    res.render('tasks/new');
});

// Create task
taskRouter.post('/', async (req, res) => {
    try {
        // Call the AI to classify task content
        const category = await classifyTask(req.body.content);

        // Create task with predicted category
        const task = new Task({
            ...req.body,
            owner: req.user._id,
            tdate: new Date(req.body.tdate),
            ddate: new Date(req.body.ddate),
            category: category
        });

        await task.save();
        res.redirect('/tasks');
    } catch (error) {
        console.error('Error creating task:', error);
        res.render('tasks/new', { 
            error: 'Error creating task',
            data: req.body
        });
    }
});
// View task
taskRouter.get('/:id', async (req, res) => {
    try {
        const task = await Task.findOne({ 
            _id: req.params.id, 
            owner: req.user._id 
        });
        if (!task) {
            return res.status(404).render('error', { error: 'Task not found' });
        }
        res.render('tasks/show', { task });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.redirect('/tasks');
    }
});

// Edit task form
taskRouter.get('/:id/edit', async (req, res) => {
    try {
        const task = await Task.findOne({ 
            _id: req.params.id, 
            owner: req.user._id 
        });
        if (!task) {
            return res.status(404).render('error', { error: 'Task not found' });
        }
        res.render('tasks/edit', { task });
    } catch (error) {
        console.error('Error fetching task for edit:', error);
        res.redirect('/tasks');
    }
});

// Update task
taskRouter.patch('/:id', async (req, res) => {
    try {
        const task = await Task.findOneAndUpdate(
            { 
                _id: req.params.id, 
                owner: req.user._id 
            },
            req.body,
            { new: true, runValidators: true }
        );
        if (!task) {
            return res.status(404).render('error', { error: 'Task not found' });
        }
        res.redirect('/tasks');
    } catch (error) {
        console.error('Error updating task:', error);
        res.redirect(`/tasks/${req.params.id}/edit`);
    }
});

// Delete task
taskRouter.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ 
            _id: req.params.id, 
            owner: req.user._id 
        });
        if (!task) {
            return res.status(404).render('error', { error: 'Task not found' });
        }
        res.redirect('/tasks');
    } catch (error) {
        console.error('Error deleting task:', error);
        res.redirect('/tasks');
    }
});

// Error handling middleware
app.use((req, res, next) => {
    res.status(404).render('error', { error: 'Page not found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: 'Something went wrong!' });
});


const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
