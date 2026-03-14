# Phase 0 Testing Guide for Complete Beginners

**Welcome!** This guide will help you test the DocuRoute Phase 0 setup, even if you've never programmed before. We'll explain everything step-by-step in plain English.

---

## 📚 What is Phase 0?

Phase 0 is the foundation of the DocuRoute application. Think of it like building the foundation of a house before you build the walls and roof. In Phase 0, we've created:

- **The building blocks** (types and structures for data)
- **The database design** (where information will be stored)
- **Security systems** (who can access what)
- **Background workers** (programs that run tasks automatically)
- **Offline capabilities** (the app works without internet)

---

## 🎯 What You'll Learn

By following this guide, you'll:
1. Install the necessary software tools
2. Download and set up the DocuRoute code
3. Run tests to make sure everything works
4. Understand what each test result means

**Time needed:** About 30-45 minutes

---

## 📋 Part 1: Getting Your Computer Ready

### Step 1: Install Node.js (The JavaScript Engine)

**What is Node.js?** It's a program that runs JavaScript code on your computer (not just in a web browser).

**How to install:**

**For Windows:**
1. Go to https://nodejs.org/
2. Click the big green button that says "Download Node.js (LTS)"
3. Run the downloaded file
4. Click "Next" through all the steps (keep default settings)
5. Click "Finish"

**For Mac:**
1. Go to https://nodejs.org/
2. Click the big green button that says "Download Node.js (LTS)"
3. Open the downloaded .pkg file
4. Follow the installation wizard

**For Linux (Ubuntu/Debian):**
1. Open Terminal (press Ctrl+Alt+T)
2. Type these commands one at a time:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

**To verify it worked:**
1. Open your Terminal (Mac/Linux) or Command Prompt (Windows)
   - **Windows:** Press Windows key + R, type `cmd`, press Enter
   - **Mac:** Press Command + Space, type "Terminal", press Enter
   - **Linux:** Press Ctrl + Alt + T

2. Type this command and press Enter:
   ```bash
   node --version
   ```

3. You should see something like `v18.19.0` or similar
4. Also check npm (Node Package Manager) by typing:
   ```bash
   npm --version
   ```

5. You should see a version number like `10.2.3`

✅ **Success!** If you see version numbers, Node.js is installed.

---

### Step 2: Install pnpm (Package Manager)

**What is pnpm?** It's a tool that helps download and manage code libraries (packages) that DocuRoute needs.

**How to install:**

1. In your Terminal/Command Prompt, type:
   ```bash
   npm install -g pnpm
   ```

2. Wait for it to finish (you'll see some download progress)

3. Verify it worked by typing:
   ```bash
   pnpm --version
   ```

4. You should see something like `10.32.1`

✅ **Success!** pnpm is ready to use.

---

### Step 3: Install Git (Version Control)

**What is Git?** It's a tool that tracks changes in code and lets you download code from the internet.

**How to install:**

**For Windows:**
1. Go to https://git-scm.com/download/win
2. Download and run the installer
3. Use default settings (just click "Next" through everything)

**For Mac:**
1. Open Terminal
2. Type: `git --version`
3. If Git isn't installed, it will prompt you to install it
4. Follow the prompts

**For Linux:**
```bash
sudo apt-get install git
```

**To verify:**
```bash
git --version
```

You should see something like `git version 2.43.0`

✅ **Success!** Git is installed.

---

## 📥 Part 2: Getting the DocuRoute Code

### Step 1: Download the Code

1. **Choose where to put the code:**
   - Create a folder on your computer called "Projects"
   - **Windows:** `C:\Users\YourName\Projects`
   - **Mac/Linux:** `/home/yourname/Projects`

2. **Open Terminal/Command Prompt in that folder:**
   - **Windows:** Open the folder, then type `cmd` in the address bar and press Enter
   - **Mac:** Right-click the folder, choose "New Terminal at Folder"
   - **Linux:** Right-click in the folder, choose "Open in Terminal"

3. **Download the code:**
   ```bash
   git clone https://github.com/Fujiorange/DocuRoute.git
   ```

4. **Go into the DocuRoute folder:**
   ```bash
   cd DocuRoute
   ```

✅ **Success!** You now have the DocuRoute code on your computer.

---

### Step 2: Install All Dependencies

**What are dependencies?** These are other code libraries that DocuRoute needs to work (like building blocks from other programmers).

1. **Make sure you're in the DocuRoute folder** (you should see the folder name in your terminal)

2. **Install everything:**
   ```bash
   pnpm install
   ```

3. **Wait...** This might take 2-5 minutes. You'll see lots of text scrolling by - that's normal!

4. **What you might see:**
   - Progress bars showing downloads
   - Numbers showing packages being installed
   - Possibly some warnings (that's okay!)

5. **Success looks like:**
   - The last line says something like "Done in 24.4s"
   - No red "ERROR" messages

⚠️ **If you see errors:**
- Try running `pnpm install --no-frozen-lockfile`
- If that doesn't work, ask for help and share the error message

✅ **Success!** All dependencies are installed.

---

## 🧪 Part 3: Running the Tests

Now we'll check if everything is working correctly. Think of these tests like a quality inspection checklist.

### Test 1: Validate the Database Schema

**What this tests:** The design of where data will be stored.

**Run this command:**
```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm --filter @docuroute/db exec prisma validate
```

**Note for Windows users:** If the above doesn't work, try:
```bash
set DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
set DIRECT_URL=postgresql://dummy:dummy@localhost:5432/dummy
pnpm --filter @docuroute/db exec prisma validate
```

**What success looks like:**
```
The schema at prisma/schema.prisma is valid 🚀
```

**What it means:** The database structure is designed correctly.

✅ **If you see the rocket emoji, it passed!**

---

### Test 2: Generate the Database Client

**What this tests:** Creates code that talks to the database.

**Run this command:**
```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm --filter @docuroute/db exec prisma generate
```

**What success looks like:**
```
✔ Generated Prisma Client (v5.22.0) to ./../../node_modules...
```

**What it means:** The database tools are ready to use.

✅ **If you see the checkmark, it passed!**

---

### Test 3: Build the Type Packages

**What this tests:** Compiles the basic building blocks of the application.

**Run these commands one at a time:**

```bash
pnpm --filter @docuroute/types build
```

Wait for it to finish (should be quick, under 10 seconds), then:

```bash
pnpm --filter @docuroute/db build
```

Wait again, then:

```bash
pnpm --filter @docuroute/core build
```

**What success looks like:**
- Each command completes with no red ERROR messages
- You see something like `> @docuroute/types@0.1.0 build`

**What it means:** The core code compiles without mistakes.

✅ **If all three complete without errors, they passed!**

---

### Test 4: Check Web Application TypeScript

**What this tests:** Checks for programming errors in the web application code.

**Run this command:**
```bash
pnpm --filter web exec tsc --noEmit
```

**This might take 10-20 seconds.**

**What success looks like:**
- The command finishes with NO output (silence is good!)
- You just see your command prompt again

**What failure looks like:**
- Red error messages
- Lines saying "error TS" followed by numbers

✅ **If it finishes silently, it passed!**

---

### Test 5: Check Worker TypeScript

**What this tests:** Checks for programming errors in the background worker code.

**Run this command:**
```bash
pnpm --filter worker exec tsc --noEmit
```

**What success looks like:**
- The command finishes with NO output
- No error messages

✅ **If it finishes silently, it passed!**

---

## 📊 Part 4: Understanding the Results

### What Does "Passing" Mean?

When a test **passes** (✅), it means:
- The code is written correctly
- There are no syntax errors
- The components work together properly
- The structure follows best practices

### What Does "Failing" Mean?

When a test **fails** (❌), it means:
- There might be a typo in the code
- A required piece might be missing
- Two parts aren't connected properly
- Something needs to be fixed

---

## 🎉 Part 5: Your Test Results Checklist

Mark each test as you complete it:

- [ ] Node.js installed (version 18 or higher)
- [ ] pnpm installed (version 10 or higher)
- [ ] Git installed
- [ ] DocuRoute code downloaded
- [ ] Dependencies installed (`pnpm install`)
- [ ] Database schema validated ✔️
- [ ] Database client generated ✔️
- [ ] Types package built ✔️
- [ ] DB package built ✔️
- [ ] Core package built ✔️
- [ ] Web TypeScript checked (no errors) ✔️
- [ ] Worker TypeScript checked (no errors) ✔️

### If All Tests Pass:

🎊 **Congratulations!** Phase 0 is working perfectly! This means:

1. **The foundation is solid** - All the basic building blocks are in place
2. **No coding errors** - The code is syntactically correct
3. **Components connect properly** - Different parts work together
4. **Ready for Phase 1** - Development can continue with API routes

### If Some Tests Fail:

Don't worry! Here's what to do:

1. **Read the error message carefully** - It often tells you what's wrong
2. **Check which test failed** - Look at the section above where the error occurred
3. **Common fixes:**
   - Run `pnpm install` again
   - Make sure you're in the DocuRoute folder
   - Try closing and reopening your terminal
   - Restart your computer (sometimes helps!)

4. **Still stuck?** Take a screenshot of the error and ask for help

---

## 🔍 Part 6: Understanding What Was Tested

### The Type System (47 Permissions)
- **What it is:** Rules about who can do what in the application
- **Example:** Some users can upload documents, others can only view them
- **Why it matters:** Keeps the application secure

### The Database Schema (9 Models)
- **What it is:** The blueprint for how data is organized
- **Example:** Like deciding how to organize files in filing cabinets
- **Why it matters:** Data needs structure to be useful

### Core Business Logic
- **What it is:** The main rules and calculations the app performs
- **Example:** How to calculate file sizes, check permissions, create audit logs
- **Why it matters:** This is the "brain" of the application

### Worker Infrastructure
- **What it is:** Programs that run tasks in the background
- **Example:** Adding watermarks to PDF files automatically
- **Why it matters:** Keeps the main app fast and responsive

### Authentication & Authorization
- **What it is:** Login system and permission checking
- **Example:** Making sure users are who they say they are
- **Why it matters:** Security and privacy

### PWA Offline Support
- **What it is:** The app can work without internet
- **Example:** Like having downloaded documents you can read on an airplane
- **Why it matters:** Users can work anywhere

---

## 📚 Glossary (Explaining Terms)

**API** - Application Programming Interface - How different programs talk to each other

**Build** - Converting human-readable code into computer-runnable code

**Compile** - Another word for "build"

**Database** - A structured place to store information (like a digital filing system)

**Dependencies** - Code libraries that the project needs

**Git** - A tool for tracking code changes and collaboration

**Node.js** - A program that runs JavaScript on computers (not just browsers)

**npm** - Node Package Manager - Downloads and manages code packages

**Package** - A collection of code that does something specific

**pnpm** - A faster version of npm

**Prisma** - A tool for working with databases

**Repository (Repo)** - A folder containing all the project code

**Terminal/Command Prompt** - A text-based way to control your computer

**TypeScript** - A programming language (like JavaScript but with type-checking)

**Validate** - Check if something is correct

---

## 🆘 Getting Help

If you're stuck:

1. **Read the error message** - Often it tells you exactly what's wrong
2. **Check your spelling** - Commands must be typed exactly right
3. **Check your location** - Make sure you're in the DocuRoute folder
4. **Try again** - Sometimes it just needs a second attempt
5. **Google the error** - Others have probably had the same issue
6. **Ask for help** - Share the error message and what you were trying to do

---

## 🎓 What You've Learned

By completing this guide, you now understand:

✨ How to install programming tools (Node.js, pnpm, Git)
✨ How to download code from the internet
✨ How to install project dependencies
✨ How to run tests on code
✨ How to interpret test results
✨ Basic programming concepts and terminology

**This is a great foundation for learning more about software development!**

---

## 📝 Summary

**Phase 0 Status:** If all tests passed, the foundation is complete! ✅

**What's Next:** Phase 1 will add the actual web pages and API endpoints (the routes users interact with)

**Your Achievement:** You've successfully validated a professional software project's foundation - that's impressive for a beginner!

---

**Document Version:** 1.0
**Last Updated:** March 14, 2026
**Difficulty Level:** Complete Beginner
**Estimated Time:** 30-45 minutes
