### 🚀 Task Manager Web Application

---
### Live Demo:

https://taskmanagerbyjayptl.onrender.com/

## 📸 Screenshots

### Landing Page:

![image](https://github.com/user-attachments/assets/ad0619c2-588a-4947-9cd6-8cbe14b9de6e)

### Login Page:

![image](https://github.com/user-attachments/assets/4485fb4a-6e41-4750-bfa1-21654dbd2b05)

###  Dashboard Page:

![image](https://github.com/user-attachments/assets/b89b65da-7232-4dda-9b7e-1bf1a8dfd3e2)

### Pending Task Page:

![image](https://github.com/user-attachments/assets/8df03d63-9a96-4a0b-83a0-dbe9c2784f5b)

### Add Task:

![image](https://github.com/user-attachments/assets/6fe8d93f-e4fc-4d5f-ba32-2cb7658a1145)

---

## 🔍 **Overview**

The **Task Manager Web Application** is a simple, efficient tool designed to help users organize and track their daily tasks.

Built during my first week of internship, this project taught me key backend skills like:

- Secure user authentication (JWT + bcrypt)  
- CRUD operations for tasks  
- Server-side rendering with EJS
- AI-powered task categorization
- Email OTP-based verification during signup
- Session management and flash messaging  
- Deployment on Render cloud platform

---

## 🏗️ **Project Structure**

- **Backend:** Node.js + Express.js  
- **Database:** MongoDB with Mongoose  
- **Templating:** EJS for server-side rendering  
- **Authentication:** JWT + bcrypt  
- **Deployment:** Render

---

## ✨ **Features**

✔️ User registration & login with secure authentication  
✔️ Add, view, update, and delete tasks  
✔️ Mark tasks as completed or pending  
✔️ Filter tasks by status or category   
✔️ AI-based task categorization using Hugging Face zero-shot classification (e.g., Bug, Urgent, Low Priority)   
✔️ Email verification using OTP before login access   
✔️ Flash messages for user feedback  
✔️ RESTful routes & middleware  
✔️ Live deployment with persistent data  

---

## 🛠️ **Technology Stack**

**Backend:**  
- Node.js  
- Express.js  
- MongoDB & Mongoose  
- EJS  
- JWT & bcrypt  
- Express-session & connect-flash
- Hugging Face Transformers (for AI task classification)
- Nodemailer (for email OTP verification) 

**Deployment:**  
- Render

---

## 🚀 **Getting Started**

### Prerequisites

- Node.js (v14+)  
- MongoDB instance (local or cloud)

### Installation & Running Locally
```bash
git clone https://github.com/Jay-ptl2210/taskManager.git
cd taskManager
npm install
```
### Create .env file:
 ```
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
MONGODB_URI=write your mongodb URL

JWT_ACCESS_SECRET= write your access secrate
JWT_REFRESH_SECRET=write your refresh secrate

COOKIE_SECRET= write your cookie secrate
```
### Start the server:
```
npm start
```
Open http://localhost:3000 in your browser.

### 🔌 API Endpoints

- POST	/register	 Register a new user
- POST	/login	 Login user
- GET	/logout	  Logout user
- GET	/tasks	 Get all tasks
- POST	/tasks	 Create a new task
- GET	/tasks/:id	Get task by ID
- PATCH	/tasks/:id	Update a task
- DELETE	/tasks/:id	Delete a task

### 🤝 Contributing
Contributions are welcome!

- Fork the repo
- Create a branch (git checkout -b feature/your-feature)
- Commit your changes (git commit -m 'Add feature')
- Push (git push origin feature/your-feature)
- Open a pull request

### 📄 License

This project is licensed under the MIT License. See LICENSE for details.

✨ Thank you for checking out my project! 🙌
