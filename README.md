
<div align="center">

# 🌱 Senuk's Boilerplates
### The Ultimate Digital Garden for Homelabbers & Developers

[![npm version](https://img.shields.io/npm/v/senuks-boilerplate?style=flat-square)](https://www.npmjs.com/package/senuks-boilerplate)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg?style=flat-square)](https://opensource.org/licenses/ISC)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

[**Explore the Garden**](#-quick-start) • [**Features**](#-features) • [**Installation**](#-installation) • [**Contributing**](#-contributing)

</div>

---

**Senuk's Boilerplates** is a premium, cinematic CLI tool designed to simplify the deployment of self-hosted applications. Forget manually copying `docker-compose.yml` files. With a beautiful interactive dashboard, you can browse, configure, and plant (deploy) your favorite tools in seconds.

## ✨ Features

### 🎬 Cinematic Experience
Start your journey with a "wow" factor. The CLI features a polished intro animation and a rich, interactive TUI (Terminal User Interface).

### 🌿 The Garden Patch (Categories)
Navigate through curated categories of tools:
-   **Featured**: ★ Popular essentials like Portainer, Pi-hole.
-   **Vulnerable Labs**: 🔓 Test your security skills with DVWA, Juice Shop.
-   **Monitoring**: 📈 Grafana, Prometheus stacks.
-   **Security**: 🛡️ Vaultwarden, Identity managers.
-   **And more**: Networking, Automation, Media, Cloud...

### 🚀 Active Apps Dashboard
Stop guessing what's running. The **Active Apps** dashboard sits at the top of your screen:
-   **Live Status**: See real-time Green/Red indicators for your containers.
-   **Interactive Cards**: Select an app to manage it.
-   **Management**: View logs, stop containers, or **Reconfigure** on the fly.

### ✨ Magical Configuration
No more editing files in `nano`.
-   **Interactive Form**: A modern form to fill in environment variables.
-   **Magic Values**: We auto-detect and suggest defaults for critical secrets and ports.
-   **Pre-filled**: Reconfiguring an app loads your existing settings automatically.

## 📦 Installation

To use the tool, you can run it directly via `npx` or install it globally.

### Quick Start (Recommended)
Run the garden without installing anything:
```bash
npx senuks-boilerplate
```

### Global Installation
Plant it in your system for easier access:
```bash
npm install -g senuks-boilerplate
```
Then run it anywhere:
```bash
boilerplates
```

## 🎮 Usage

1.  **Launch**: Run `boilerplates`.
2.  **Navigate**: Use `Arrow Keys` to move between the **Active Apps** and the **Garden Patches**.
3.  **Explore**: Press `Enter` on a category (e.g., "Monitoring") to see available tools.
4.  **Plant**: Select a tool and press `Enter` to configure and deploy it.
5.  **Manage**: Select an active app at the top to view its status, logs, or change its config.

## 🛠️ Tech Stack

Built with ❤️ using modern web technologies for the terminal:
-   **React & Ink**: Component-based UI for the command line.
-   **Docker**: Seamless container management.
-   **TypeScript**: Type-safe and robust code.

## 🤝 Contributing

We welcome contributions! Whether you want to add a new "seed" (boilerplate) or improve the garden logic.

1.  Fork the repository.
2.  Clone it: `git clone https://github.com/SenukDias/Boilerplate.git`
3.  Install dependencies: `npm install`
4.  Run dev mode: `npm run dev`
5.  Submit a Pull Request!

---

<div align="center">
Made with 💻 by Senuk Dias
</div>