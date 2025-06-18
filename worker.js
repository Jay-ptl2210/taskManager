const mongoose = require('mongoose');
const cron = require('node-cron');
const sendReminder = require('./utils/mailer');
const User = require('./models/User');
require('dotenv').config();

const APP_URL = 'https://taskmanagerbyjayptl.onrender.com';

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Worker connected to MongoDB');
    startScheduler();
  })
  .catch(err => console.error('Worker DB error:', err));

function startScheduler() {
  // Morning
  cron.schedule('0 8 * * *', async () => {
    console.log("Running morning reminder...");
    const users = await User.find({ isVerified: true });
    users.forEach(user => {
      sendReminder(
        user.email,
        '📝 Morning Task Reminder',
        `<p>🌞 Good morning ${user.username},</p>
         <p>Time to add today's tasks ➕ <a href="${APP_URL}/tasks/new">Add Now</a> 🗒️</p>
         <p>– 🚀 Task Manager by Jay Patel</p>`
      );
    });
  }, { timezone: "Asia/Kolkata" });

  // Evening
  cron.schedule('0 19 * * *', async () => {
    console.log("Running evening reminder...");
    const users = await User.find({ isVerified: true });
    users.forEach(user => {
      sendReminder(
        user.email,
        '🌙 Update Your Task Status',
        `<p>🌆 Good evening ${user.username},</p>
         <p>Don’t forget to update your progress ✅ <a href="${APP_URL}/tasks">Update Now</a> 📌</p>
         <p>– ✨ Task Manager by Jay Patel</p>`
      );
    });
  }, { timezone: "Asia/Kolkata" });
}
