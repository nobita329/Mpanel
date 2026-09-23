// Mpanel Supported Docker Images & Templates
module.exports = {
  minecraft: [
    { label: "Java 26", value: "ghcr.io/pterodactyl/yolks:java_26", defaultCmd: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui", jarFile: "server.jar" },
    { label: "Java 25", value: "ghcr.io/pterodactyl/yolks:java_25", defaultCmd: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui", jarFile: "server.jar" },
    { label: "Java 21", value: "ghcr.io/pterodactyl/yolks:java_21", defaultCmd: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui", jarFile: "server.jar" },
    { label: "Java 17", value: "ghcr.io/pterodactyl/yolks:java_17", defaultCmd: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui", jarFile: "server.jar" },
    { label: "Java 16", value: "ghcr.io/pterodactyl/yolks:java_16", defaultCmd: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui", jarFile: "server.jar" },
    { label: "Java 11", value: "ghcr.io/pterodactyl/yolks:java_11", defaultCmd: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui", jarFile: "server.jar" },
    { label: "Java 8",  value: "ghcr.io/pterodactyl/yolks:java_8",  defaultCmd: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui", jarFile: "server.jar" }
  ],
  nodejs: [
    { label: "Nodejs 25", value: "ghcr.io/ptero-eggs/yolks:nodejs_25", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 24", value: "ghcr.io/ptero-eggs/yolks:nodejs_24", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 23", value: "ghcr.io/ptero-eggs/yolks:nodejs_23", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 22", value: "ghcr.io/ptero-eggs/yolks:nodejs_22", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 21", value: "ghcr.io/ptero-eggs/yolks:nodejs_21", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 20", value: "ghcr.io/ptero-eggs/yolks:nodejs_20", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 19", value: "ghcr.io/ptero-eggs/yolks:nodejs_19", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 18", value: "ghcr.io/ptero-eggs/yolks:nodejs_18", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 17", value: "ghcr.io/ptero-eggs/yolks:nodejs_17", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 16", value: "ghcr.io/ptero-eggs/yolks:nodejs_16", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 14", value: "ghcr.io/ptero-eggs/yolks:nodejs_14", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" },
    { label: "Nodejs 12", value: "ghcr.io/ptero-eggs/yolks:nodejs_12", defaultCmd: "if [ -f package.json ]; then npm install; fi; npm start", mainFile: "index.js" }
  ],
  python: [
    { label: "Python 3.13", value: "ghcr.io/ptero-eggs/yolks:python_3.13", defaultCmd: "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi; python3 app.py", mainFile: "app.py" },
    { label: "Python 3.12", value: "ghcr.io/ptero-eggs/yolks:python_3.12", defaultCmd: "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi; python3 app.py", mainFile: "app.py" },
    { label: "Python 3.11", value: "ghcr.io/ptero-eggs/yolks:python_3.11", defaultCmd: "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi; python3 app.py", mainFile: "app.py" },
    { label: "Python 3.10", value: "ghcr.io/ptero-eggs/yolks:python_3.10", defaultCmd: "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi; python3 app.py", mainFile: "app.py" },
    { label: "Python 3.9",  value: "ghcr.io/ptero-eggs/yolks:python_3.9",  defaultCmd: "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi; python3 app.py", mainFile: "app.py" },
    { label: "Python 3.8",  value: "ghcr.io/ptero-eggs/yolks:python_3.8",  defaultCmd: "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi; python3 app.py", mainFile: "app.py" },
    { label: "Python 3.7",  value: "ghcr.io/ptero-eggs/yolks:python_3.7",  defaultCmd: "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi; python3 app.py", mainFile: "app.py" },
    { label: "Python 2.7",  value: "ghcr.io/ptero-eggs/yolks:python_2.7",  defaultCmd: "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi; python2 app.py", mainFile: "app.py" }
  ],
  lumenvm: [
    { label: "Debian 12 (Ready to use, Recommended)", value: "ghcr.io/sosuku325/aerovm:guest-debian-12", defaultCmd: "/start.sh" },
    { label: "Ubuntu 24.04 LTS (Ready to use)", value: "ghcr.io/sosuku325/aerovm:guest-ubuntu-24.04", defaultCmd: "/start.sh" },
    { label: "Ubuntu 22.04 LTS (Ready to use)", value: "ghcr.io/sosuku325/aerovm:guest-ubuntu-22.04", defaultCmd: "/start.sh" },
    { label: "Ubuntu 20.04 LTS (Ready to use)", value: "ghcr.io/sosuku325/aerovm:guest-ubuntu-20.04", defaultCmd: "/start.sh" },
    { label: "Debian 13 (Ready to use)", value: "ghcr.io/sosuku325/aerovm:guest-debian-13", defaultCmd: "/start.sh" },
    { label: "Debian 11 (Ready to use)", value: "ghcr.io/sosuku325/aerovm:guest-debian-11", defaultCmd: "/start.sh" },
    { label: "Kali Linux (Ready to use)", value: "ghcr.io/sosuku325/aerovm:guest-kali", defaultCmd: "/start.sh" },
    { label: "Fedora 40 (Ready to use)", value: "ghcr.io/sosuku325/aerovm:guest-fedora", defaultCmd: "/start.sh" },
    { label: "Arch Linux (Ready to use)", value: "ghcr.io/sosuku325/aerovm:guest-arch", defaultCmd: "/start.sh" },
    { label: "Rocky Linux (Ready to use)", value: "ghcr.io/sosuku325/aerovm:guest-rockylinux", defaultCmd: "/start.sh" },
    { label: "Alma Linux (Ready to use)", value: "ghcr.io/sosuku325/aerovm:guest-almalinux", defaultCmd: "/start.sh" },
    { label: "Debian 12 Desktop (GUI Preinstalled)", value: "ghcr.io/sosuku325/aerovm:guest-debian-12-desktop", defaultCmd: "/start.sh" },
    { label: "Ubuntu 24.04 Desktop (GUI Preinstalled)", value: "ghcr.io/sosuku325/aerovm:guest-ubuntu-24.04-desktop", defaultCmd: "/start.sh" },
    { label: "Alpine (Blank Disk / Custom ISO / Windows)", value: "ghcr.io/sosuku325/aerovm:alpine", defaultCmd: "/start.sh" },
    { label: "Shell (Debug / Rescue Mode)", value: "ghcr.io/sosuku325/aerovm:shell", defaultCmd: "/start.sh" }
  ],
  nokvm: [
    { label: "Debian 12 (No-KVM Software Emulation)", value: "ghcr.io/sosuku325/aerovm:guest-debian-12", defaultCmd: "/start.sh" },
    { label: "Ubuntu 24.04 LTS (No-KVM Software Emulation)", value: "ghcr.io/sosuku325/aerovm:guest-ubuntu-24.04", defaultCmd: "/start.sh" },
    { label: "Ubuntu 22.04 LTS (No-KVM Software Emulation)", value: "ghcr.io/sosuku325/aerovm:guest-ubuntu-22.04", defaultCmd: "/start.sh" },
    { label: "Debian 13 (No-KVM Software Emulation)", value: "ghcr.io/sosuku325/aerovm:guest-debian-13", defaultCmd: "/start.sh" },
    { label: "Debian 11 (No-KVM Software Emulation)", value: "ghcr.io/sosuku325/aerovm:guest-debian-11", defaultCmd: "/start.sh" },
    { label: "Kali Linux (No-KVM Software Emulation)", value: "ghcr.io/sosuku325/aerovm:guest-kali", defaultCmd: "/start.sh" },
    { label: "Fedora 40 (No-KVM Software Emulation)", value: "ghcr.io/sosuku325/aerovm:guest-fedora", defaultCmd: "/start.sh" },
    { label: "Arch Linux (No-KVM Software Emulation)", value: "ghcr.io/sosuku325/aerovm:guest-arch", defaultCmd: "/start.sh" },
    { label: "Alpine (No-KVM Blank / Custom ISO)", value: "ghcr.io/sosuku325/aerovm:alpine", defaultCmd: "/start.sh" },
    { label: "Shell (Rescue Mode)", value: "ghcr.io/sosuku325/aerovm:shell", defaultCmd: "/start.sh" }
  ],
  categoriesWallpapers: [
    { id: "black-dark", name: "Black & Dark Aesthetic", preview: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80" },
    { id: "space", name: "Deep Space & Nebula", preview: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80" },
    { id: "ultrawide-monitor-hd-wallpapers", name: "Ultrawide HD Cyber", preview: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=80" },
    { id: "cool-wallpapers", name: "Cool Neon Vector", preview: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=80" },
    { id: "aesthetic-wallpapers", name: "Aesthetic Vaporwave", preview: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80" },
    { id: "cute-kawaii-wallpapers", name: "Cute & Kawaii Pastel", preview: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80" },
    { id: "cr7-wallpapers", name: "CR7 Sports Energy", preview: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1920&q=80" },
    { id: "cyberpunk", name: "Cyberpunk City Nights", preview: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1920&q=80" },
    { id: "gaming", name: "Gaming Grid", preview: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80" }
  ]
};

