# Welcome to your Lovable project

**URL**: https://lovable.dev/projects/125d1b55-f381-4b5e-a27f-b8e001304610

---

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

---

## Project Collaboration Guide

Here is a simple guide for team members to collaborate on this project using GitHub.

### **Step 1: Initial Setup (Do this once)**

First, everyone needs to get the project code onto their own computer.

1.  **Clone the Repository:** Get a copy of the project using the project's HTTPS URL.
    ```bash
    git clone https://github.com/DevBolt07/flowwave-ai.git
    ```

2.  **Go into the Project Folder:**
    ```bash
    cd flowwave-ai
    ```

3.  **Install Dependencies:** This installs all the tools the project needs. The `--legacy-peer-deps` flag helps avoid issues with dependency versions.
    ```bash
    npm install --legacy-peer-deps
    ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    You should now have the project running locally!

---

### **Step 2: Daily Workflow**

Follow these steps each time you start working on a task.

1.  **Switch to Your Branch:** Go to your dedicated branch for the feature you're working on. If you don't have the branch locally yet, this command will create it and track the remote branch.

    *   For the **Authority Dashboard**:
        ```bash
        git checkout feature/authority-dashboard
        ```
    *   For the **Citizen Dashboard**:
        ```bash
        git checkout feature/citizen-dashboard
        ```
    *   For the **Emergency Dashboard**:
        ```bash
        git checkout feature/emergency-dashboard
        ```

2.  **Pull Latest Changes:** Before you start coding, make sure you have the latest version of the branch from GitHub. This prevents conflicts later.

    *   On `feature/authority-dashboard`:
        ```bash
        git pull origin feature/authority-dashboard
        ```
    *   On `feature/citizen-dashboard`:
        ```bash
        git pull origin feature/citizen-dashboard
        ```
    *   On `feature/emergency-dashboard`:
        ```bash
        git pull origin feature/emergency-dashboard
        ```

3.  **Start Coding!** Now you can work on your files.
    *   **Authority Dashboard**: `AuthorityDashboard.tsx`
    *   **Citizen Dashboard**: `CitizenDashboard.tsx`
    *   **Emergency Dashboard**: `EmergencyDashboard.tsx` and `MapView.tsx`

---

### **Step 3: Pushing Your Code**

When you've made some progress and want to save it to GitHub, follow these steps.

1.  **Add Your Changes:** Prepare all your changed files to be saved.
    ```bash
    git add .
    ```

2.  **Commit Your Changes:** Save a snapshot of your work with a clear message describing what you did.
    ```bash
    git commit -m "Your descriptive message here"
    # Example: git commit -m "feat: Add new map view to emergency dashboard"
    ```

3.  **Push Your Work to GitHub:** This uploads your saved changes from your computer to your specific branch on GitHub.

    *   On `feature/authority-dashboard`:
        ```bash
        git push origin feature/authority-dashboard
        ```
    *   On `feature/citizen-dashboard`:
        ```bash
        git push origin feature/citizen-dashboard
        ```
    *   On `feature/emergency-dashboard`:
        ```bash
        git push origin feature/emergency-dashboard
        ```

---

### **Step 4: Creating a Pull Request (PR)**

When your feature is complete and you want to merge it into the main project, you need to create a Pull Request. This allows other team members to review your code before it gets added to the `main` branch.

1.  **Go to GitHub:** Open the repository in your web browser: [https://github.com/DevBolt07/flowwave-ai](https://github.com/DevBolt07/flowwave-ai)

2.  **Open a Pull Request:** After you've pushed your branch, you will see a yellow banner with your branch name and a "Compare & pull request" button. Click it.
    *   If you don't see the banner, go to the "Pull requests" tab and click "New pull request".

3.  **Review Your PR:**
    *   Make sure the `base` branch is `main` and the `compare` branch is your feature branch (e.g., `feature/authority-dashboard`).
    *   Give your pull request a clear title and a description of the changes you made.
    *   Click "Create pull request".

4.  **Review and Merge:** Your team will now be able to review your code, suggest changes, and approve the pull request. Once approved, it can be merged into the `main` branch.

---

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/125d1b55-f381-4b5e-a27f-b8e001304610) and click on Share -> Publish.
