<p align="center">
  <img src="public/assets/banner.png" width="100%" alt="Mpanel Banner" style="border-radius: 12px;" />
</p>

<p align="center">
  <img src="public/assets/logo.png" width="140px" alt="Mpanel Logo" style="border-radius: 18px;" />
</p>

<h1 align="center">🎮 Mpanel (v2.5.4)</h1>

<p align="center">
  <b>High-Performance Game &amp; Application Server Web Management Panel</b>
</p>

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://github.com/nobita329/Mpanel/releases/tag/v2.5.4"><img src="https://img.shields.io/badge/Release-v2.5.4-8A2BE2?style=flat-square&logo=github&logoColor=white" alt="Version" /></a>
  <a href="https://nobitahost.in"><img src="https://img.shields.io/badge/Website-nobitahost.in-007ACC?style=flat-square" alt="Website" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-F7DF1E?style=flat-square" alt="License" /></a>
</p>

---

## 🚀 Quick Start

### 1-Click Install
```bash
git clone https://github.com/nobita329/Mpanel.git
cd Mpanel
bash menu.sh
```

### Management Menu
```bash
./menu.sh
```

---

## 🔒 Port Architecture

| Service | Port | Description |
| :--- | :---: | :--- |
| **Panel Web UI** | `3001` | Web Dashboard & Live Console |
| **Panel DB (MariaDB)** | `3002` | Panel Internal Database |
| **Daemon API** | `3003` | REST & WebSocket API |
| **SFTP Server** | `3004` | Built-in SFTP (`sftp://host:3004`) |
| **Server DB (MySQL 8.4)** | `3005` | Game Servers Database |

---

## 🔑 Default Login Credentials

- **URL**: `http://localhost:3001`
- **Username**: `admin`
- **Password**: `admin`

---

## 📁 SFTP Access

- **Host**: `localhost` (or your Server IP)
- **Port**: `3004`
- **Username**: `admin.<server_id>` (e.g. `admin.1`)
- **Password**: Your Mpanel user password

---

## 👨‍💻 Developer & Credits

- **Developer**: **Nobita** ([nobita.dev](https://discord.com/users/924366651443527710))
- **Website**: [nobitahost.in](https://nobitahost.in)
- **License**: MIT
