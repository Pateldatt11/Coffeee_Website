# ☕ Brew & Bliss - Premium Coffee Experience

Welcome to **Brew & Bliss**, a modern, fully-functional coffee shop web application. Designed for coffee lovers who appreciate both quality brews and a seamless digital experience.

![Brew & Bliss Banner](https://images.unsplash.com/photo-1509042239263-51a5ad9d2f68?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)

## ✨ Features

- **🔐 Secure Authentication**: Full Signup/Login system powered by Firebase.
- **🛡️ Protected Routes**: User-only access to premium features like ordering and personalized menus.
- **📜 Dynamic Menu**: Browse our curated selection of coffee, pastries, and more.
- **🛒 Order Online**: A smooth, interactive ordering flow.
- **🎭 Fluid Animations**: High-quality micro-interactions and transitions using Framer Motion.
- **📱 Fully Responsive**: Optimized for seamless viewing on mobile, tablet, and desktop.
- **🗺️ Intuitive Navigation**: Easy-to-use navigation bar and footer.
- **🚀 Performance-Driven**: Built with Vite for lightning-fast development and optimized production builds.

## 🛠️ Tech Stack

- **Frontend**: [React.js](https://reactjs.org/) (Hooks, Context UI)
- **Styling**: Vanilla CSS (Modern CSS variables and flexbox/grid)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Backend/Auth**: [Firebase](https://firebase.google.com/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Build Tool**: [Vite](https://vitejs.dev/)

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Pateldatt11/React_Coffee_Website.git
   cd Cw
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   To get your API keys from the [Firebase Console](https://console.firebase.google.com/), follow these exact steps:

   #### Step 1: Create/Select Project
   - Click **"Add project"** (or select an existing one).
   - Follow the setup wizard and click **"Create project"**.

   #### Step 2: Register your Web App
   - On the Project Overview page, look for the **"Get started by adding Firebase to your app"** section.
   - Click the **Web icon (`</>`)**.
   - Enter an app nickname (e.g., `Coffee-Web-App`) and click **"Register app"**.
   - Firebase will now show you a code block containing your `firebaseConfig`. **Copy the values** from this object.

   #### Step 3: Enable Authentication (Required)
   - In the left-hand sidebar, click on **"Build"** and then **"Authentication"**.
   - Click the **"Get Started"** button.
   - Go to the **"Sign-in method"** tab.
   - Click on **"Email/Password"**, toggle the **"Enabled"** switch, and click **"Save"**.

   #### Step 4: Add Keys to Project
   - Create a `.env` file in the root of your project directory.
   - Paste your keys using the following format:
     ```env
     VITE_FIREBASE_API_KEY=your_copied_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```
   - *Note: If you already registered an app, you can find these keys anytime by clicking the **Gear Icon (⚙️)** next to "Project Overview" -> **Project settings** -> Scroll down to **"Your apps"**.*

4. **Launch Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📦 Production Build

To create an optimized production build, run:
```bash
npm run build
```
The files will be generated in the `dist/` directory.

## 📁 Project Structure

```text
src/
├── assets/          # Images and static files
├── Components/      # Reusable UI components (Nav, Footer, etc.)
├── Context/         # State management context
├── Pages/           # Main page views (Home, About, Menu, Login, etc.)
├── data/            # Local data and constants
├── firebase.jsx     # Firebase configuration and initialization
├── App.jsx          # Main application component & routes
└── main.jsx         # Application entry point
```

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the coffee experience:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git checkout origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Designed with ❤️ for coffee enthusiasts everywhere.
