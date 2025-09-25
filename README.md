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

### **Step 1: Get the Project Code (For Everyone)**

First, everyone needs to copy the project from GitHub to their own computer.

1.  **Clone the Repository:** Open a terminal or command prompt and run this command. Make sure to replace `<YOUR_GIT_URL>` with the actual Git URL of your project.

    ```bash
    git clone <YOUR_GIT_URL>
    ```

2.  **Navigate into the Project Folder:**

    ```bash
    cd flowwave-ai
    ```

3.  **Install All Necessary Tools:** This command reads the `package.json` file and automatically downloads everything the project needs to run.

    ```bash
    npm install --legacy-peer-deps
    npm run dev

    ```

---

### **Step 2: Choose Your Task and Switch to Your Branch**

Now, each person should follow the instructions for the dashboard they are working on.

#### **For the friend working on the Authority Dashboard:**

1.  **Switch to your branch:** This command creates and switches to your personal workspace for the Authority Dashboard.

    ```bash
    git checkout feature/authority-dashboard
    ```

2.  **Start coding!** Make all your UI changes to the `AuthorityDashboard.tsx` component and any related files.

#### **For the friend working on the Normal User (Citizen) Dashboard:**

1.  **Switch to your branch:** This command creates and switches to your personal workspace for the Citizen Dashboard.

    ```bash
    git checkout feature/citizen-dashboard
    ```

2.  **Start coding!** Make all your UI changes to the `CitizenDashboard.tsx` component and any related files.

#### **For the friend working on the Emergency Dashboard:**

1.  **Switch to your branch:** This command creates and switches to your personal workspace for the Emergency Dashboard.

    ```bash
    git checkout feature/emergency-dashboard
    ```

2.  **Start coding!** Make all your UI changes to the `EmergencyDashboard.tsx` and the `MapView.tsx` components.

---

### **Step 3: Save and Push Your Changes to GitHub (For Everyone)**

After you've made some progress and want to save your work, follow these three commands. **Make sure you are in your own branch before running them!**

1.  **Add all your changed files:** This prepares all your updated files to be saved.

    ```bash
    git add .
    ```

2.  **Commit your changes with a message:** This saves a snapshot of your work. Write a clear message describing what you did.

    ```bash
    git commit -m "Example: Added a new map view to the emergency dashboard"
    ```

3.  **Push your work to GitHub:** This uploads your saved changes from your computer to your specific branch on GitHub, so everyone else can see them.

    *   For the **Authority Dashboard** developer:
        ```bash
        git push origin feature/authority-dashboard
        ```
    *   For the **Citizen Dashboard** developer:
        ```bash
        git push origin feature/citizen-dashboard
        ```
    *   For the **Emergency Dashboard** developer:
        ```bash
        git push origin feature/emergency-dashboard
        ```

---

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/125d1b55-f381-4b5e-a27f-b8e001304610) and click on Share -> Publish.
