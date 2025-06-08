const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const methodOverride = require('method-override');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Task = require('./models/Task');

// Import middleware
const auth = require('./middleware/auth');

// MongoDB Connection URI with fallback
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/task-manager';
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
        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { username: req.body.username },
                { email: req.body.email }
            ]
        });

        if (existingUser) {
            let errorMessage = '';
            if (existingUser.username === req.body.username) {
                errorMessage = 'Username is already taken. Please choose a different username.';
            } else {
                errorMessage = 'Email is already registered. Please use a different email.';
            }
            return res.render('auth/register', { 
                error: errorMessage,
                data: req.body
            });
        }

        const user = new User(req.body);
        await user.save();
        
        // Generate tokens
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        // Save refresh token to database
        await user.save();
        
        // Set cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });
        
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        res.redirect('/tasks');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('auth/register', { 
            error: 'An error occurred during registration',
            data: req.body
        });
    }
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
        
        // Generate tokens
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        // Save refresh token to database
        await user.save();
        
        // Set cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });
        
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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

// Create new task form
taskRouter.get('/new', (req, res) => {
    res.render('tasks/new');
});

// Create task
taskRouter.post('/', async (req, res) => {
    try {
        const task = new Task({
            ...req.body,
            owner: req.user._id,
            tdate: new Date(req.body.tdate),
            ddate: new Date(req.body.ddate)
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
