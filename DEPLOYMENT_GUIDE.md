# 🚀 **DEPLOYMENT GUIDE - Railway & Vercel**

## **📋 Pre-Deployment Checklist**

```
✅ GitHub Repository Ready: https://github.com/rohit98k/ai-job-automation-system
✅ Code Pushed: ✓
✅ MongoDB Atlas Ready: ✓ (Connection string configured)
✅ Email Setup Ready: ✓ (Gmail SMTP configured)
```

---

## **STEP 1: Backend Deployment (Railway.app)**

### **1.1 Railway Account बनाओ**
```
1. https://railway.app पर जाओ
2. GitHub से sign up करो
3. Dashboard खोलो
```

### **1.2 New Project बनाओ**
```
1. "New Project" दबाओ
2. "Deploy from GitHub repo" select करो
3. अपना repo select करो: ai-job-automation-system
4. Configure करो
```

### **1.3 Environment Variables Add करो**
Railway dashboard में यह variables add करो:

```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://rks099871_db_user:rohitgupa@cluster0.ztk3lyc.mongodb.net/ai-job-automation?retryWrites=true&w=majority
GEMINI_API_KEY=<YOUR_GEMINI_KEY> (बाद में update करना)
GEMINI_MODEL=gemini-2.5-flash
JWT_SECRET=your-super-secret-production-key-12345
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=rkg98521@gmail.com
SMTP_PASS=zxggganzhjssoeut
SMTP_SECURE=false
SMTP_FROM=rkg98521@gmail.com
```

### **1.4 Railway Deploy करो**
```
1. "Deploy" बटन दबाओ
2. Railway automatically build करेगा
3. कुछ मिनट में live हो जाएगा
4. URL मिलेगा: https://ai-job-automation-prod.up.railway.app
```

---

## **STEP 2: Frontend Deployment (Vercel.com)**

### **2.1 Vercel Account बनाओ**
```
1. https://vercel.com पर जाओ
2. GitHub से sign up करो
```

### **2.2 Frontend Project Import करो**
```
1. "Add New" → "Project"
2. GitHub repo select करो: ai-job-automation-system
3. Root Directory: ./frontend
4. Deploy करो
```

### **2.3 Environment Variables Add करो**
Vercel Project Settings में:

```
VITE_API_URL=https://ai-job-automation-prod.up.railway.app
```

### **2.4 Vercel Deploy करो**
```
1. Automatic deploy हो जाएगा
2. कुछ मिनट में live होगा
3. URL मिलेगा: https://ai-job-automation-system.vercel.app
```

---

## **STEP 3: Database Configuration (MongoDB Atlas)**

### **IP Whitelist करो**
```
1. MongoDB Atlas Dashboard पर जाओ
2. Network Access → IP Whitelist
3. "0.0.0.0/0" add करो (Testing के लिए)
4. Production में specific IP add करो
```

---

## **🔗 Live Links (Deploy करने के बाद)**

```
Frontend URL: https://ai-job-automation-system.vercel.app
Backend URL: https://ai-job-automation-prod.up.railway.app
GitHub Repo: https://github.com/rohit98k/ai-job-automation-system
```

---

## **🧪 Test करने के लिए**

```bash
# API Health Check
curl https://ai-job-automation-prod.up.railway.app/

# Frontend
https://ai-job-automation-system.vercel.app
```

---

## **⚠️ Important Notes**

```
1. GEMINI_API_KEY को update करना है (dummy key है अभी)
2. JWT_SECRET को production के लिए change करो
3. Database credentials secure रखो
4. Email verification test करो
```

---

## **📞 Troubleshooting**

| Issue | Solution |
|-------|----------|
| Build Failed | Logs check करो Railway/Vercel में |
| Database Connection Error | MongoDB IP whitelist add करो |
| API Not Responding | Environment variables verify करो |
| Email Not Sending | SMTP credentials check करो |

---

**अब यह guide follow करके deploy करो!** 🚀
