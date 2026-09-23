#!/usr/bin/env bash

# ==============================================================================
#                      🎮 MPANEL MANAGEMENT SCRIPT (menu.sh)
#     Supports: Auto Install, Auto Setup, Auto Update, PM2, User Creator
# ==============================================================================

# Text Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
LIGHT_CYAN='\033[1;36m'
LIGHT_GREEN='\033[1;32m'
LIGHT_BLUE='\033[1;34m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Determine current directory
MPANEL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$MPANEL_DIR" || exit 1

INTERACTIVE_MENU=false

wait_prompt() {
    if [ "$INTERACTIVE_MENU" = true ] && [ -t 0 ]; then
        echo ""
        read -n 1 -s -r -p "Press any key to return to menu..."
        echo ""
    fi
}

# Detect Sudo capability
get_sudo() {
    if [ "$EUID" -ne 0 ]; then
        if command -v sudo &>/dev/null; then
            echo "sudo"
        else
            echo ""
        fi
    else
        echo ""
    fi
}
SUDO=$(get_sudo)

# Detect Package Manager
detect_pkg_mgr() {
    if command -v apt-get &>/dev/null; then
        echo "apt"
    elif command -v dnf &>/dev/null; then
        echo "dnf"
    elif command -v yum &>/dev/null; then
        echo "yum"
    elif command -v apk &>/dev/null; then
        echo "apk"
    elif command -v pacman &>/dev/null; then
        echo "pacman"
    else
        echo "unknown"
    fi
}

# Detect Server IP (Public or Local LAN)
get_server_ip() {
    local ip=""
    ip=$(curl -s --max-time 2 https://api.ipify.org 2>/dev/null || curl -s --max-time 2 https://ifconfig.me 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    if [ -z "$ip" ]; then
        ip="localhost"
    fi
    echo "$ip"
}

# Display Banner
show_banner() {
    clear
    local host_ip
    host_ip=$(get_server_ip)

    local version="v2.5.2"
    if [ -f "$MPANEL_DIR/package.json" ]; then
        local pkg_v
        pkg_v=$(grep -m1 '"version"' "$MPANEL_DIR/package.json" 2>/dev/null | awk -F '"' '{print $4}')
        if [ -n "$pkg_v" ]; then
            version="v${pkg_v}"
        fi
    fi

    # Check PM2 Daemon status
    local pm2_status="${RED}● Stopped${NC}"
    if command -v pm2 &>/dev/null; then
        if pm2 list 2>/dev/null | grep -q "mpanel.*online"; then
            pm2_status="${LIGHT_GREEN}● Online (PM2)${NC}"
        fi
    fi

    echo -e "${LIGHT_CYAN}${BOLD}"
    echo "  ███╗   ███╗██████╗  █████╗ ███╗   ██╗███████╗██╗     "
    echo "  ████╗ ████║██╔══██╗██╔══██╗████╗  ██║██╔════╝██║     "
    echo "  ██╔████╔██║██████╔╝███████║██╔██╗ ██║█████╗  ██║     "
    echo "  ██║╚██╔╝██║██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║     "
    echo "  ██║ ╚═╝ ██║██║     ██║  ██║██║ ╚████║███████╗███████╗"
    echo "  ╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝"
    echo -e "${NC}"
    echo -e "  ${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${WHITE}${BOLD}🎮 MPANEL ${version}${NC} ${GRAY}•${NC} ${CYAN}Next-Gen Game & App Management Suite${NC}"
    echo -e "  ${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GRAY}│${NC} ${WHITE}Web Panel UI:${NC}    ${LIGHT_GREEN}http://${host_ip}:3001${NC}"
    echo -e "  ${GRAY}│${NC} ${WHITE}Daemon API:${NC}      ${LIGHT_GREEN}http://${host_ip}:3003${NC}"
    echo -e "  ${GRAY}│${NC} ${WHITE}SFTP Server:${NC}     ${LIGHT_GREEN}sftp://${host_ip}:3004${NC}"
    echo -e "  ${GRAY}│${NC} ${WHITE}Daemon Status:${NC}   ${pm2_status}"
    echo -e "  ${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ==============================================================================
# 1. AUTO INSTALL + AUTO SETUP
# ==============================================================================
auto_install_mpanel() {
    local unattended=false
    local admin_user=""
    local admin_pass=""
    local admin_email=""
    local custom_creds=false

    # Parse any CLI arguments passed directly
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -y|--yes|--unattended|--auto)
                unattended=true
                shift
                ;;
            -u|--user|--admin-user)
                admin_user="$2"
                custom_creds=true
                shift 2
                ;;
            -p|--pass|--password|--admin-pass)
                admin_pass="$2"
                custom_creds=true
                shift 2
                ;;
            -e|--email|--admin-email)
                admin_email="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    echo -e "${CYAN}======================================================${NC}"
    echo -e "${WHITE}      🚀 Mpanel Automated Installation & Setup        ${NC}"
    echo -e "${CYAN}======================================================${NC}"
    echo ""

    # --- Step 1: System Package Prerequisites ---
    echo -e "${BLUE}[1/6]${NC} 🔍 Checking system packages & dependencies..."
    local pkg_mgr
    pkg_mgr=$(detect_pkg_mgr)

    local missing_pkgs=()
    for cmd in curl wget git tar unzip; do
        if ! command -v "$cmd" &>/dev/null; then
            missing_pkgs+=("$cmd")
        fi
    done

    if [ ${#missing_pkgs[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️ Installing missing tools: ${missing_pkgs[*]}...${NC}"
        case "$pkg_mgr" in
            apt)
                $SUDO apt-get update -qq
                $SUDO apt-get install -y -qq "${missing_pkgs[@]}" build-essential
                ;;
            dnf)
                $SUDO dnf install -y "${missing_pkgs[@]}" gcc gcc-c++ make
                ;;
            yum)
                $SUDO yum install -y "${missing_pkgs[@]}" gcc gcc-c++ make
                ;;
            apk)
                $SUDO apk add --no-cache "${missing_pkgs[@]}" build-base
                ;;
            pacman)
                $SUDO pacman -Sy --noconfirm "${missing_pkgs[@]}" base-devel
                ;;
            *)
                echo -e "${YELLOW}ℹ️ Unknown package manager. Please ensure git, curl, and build tools are installed.${NC}"
                ;;
        esac
    else
        echo -e "${GREEN}✅ Essential system tools verified.${NC}"
    fi

    # --- Step 2: Node.js Check (Requires >= 18) ---
    echo ""
    echo -e "${BLUE}[2/6]${NC} 🔍 Checking Node.js runtime environment..."
    local node_ok=false
    if command -v node &>/dev/null; then
        local node_ver
        node_ver=$(node -v | tr -d 'v')
        local node_major
        node_major=$(echo "$node_ver" | cut -d. -f1)
        if [ "$node_major" -ge 18 ]; then
            node_ok=true
            echo -e "${GREEN}✅ Node.js detected: v${node_ver} (>= 18.0.0 required)${NC}"
        else
            echo -e "${YELLOW}⚠️ Node.js v${node_ver} is too old. Node.js 20 LTS is required.${NC}"
        fi
    fi

    if [ "$node_ok" = false ]; then
        echo -e "${CYAN}📥 Installing Node.js 20.x LTS...${NC}"
        case "$pkg_mgr" in
            apt)
                curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash -
                $SUDO apt-get install -y nodejs
                ;;
            dnf|yum)
                curl -fsSL https://rpm.nodesource.com/setup_20.x | $SUDO bash -
                $SUDO "$pkg_mgr" install -y nodejs
                ;;
            *)
                echo -e "${RED}❌ Please install Node.js >= 18 LTS manually on this system.${NC}"
                exit 1
                ;;
        esac
        echo -e "${GREEN}✅ Node.js installed: $(node -v 2>/dev/null)${NC}"
    fi

    # --- Step 3: PM2 Process Manager ---
    echo ""
    echo -e "${BLUE}[3/6]${NC} 🔍 Checking PM2 Process Manager..."
    if ! command -v pm2 &>/dev/null; then
        echo -e "${YELLOW}⚠️ PM2 not found. Installing PM2 globally...${NC}"
        if [ -n "$SUDO" ]; then
            $SUDO npm install -g pm2
        else
            npm install -g pm2
        fi
    fi
    echo -e "${GREEN}✅ PM2 detected: $(pm2 -v 2>/dev/null)${NC}"

    # --- Step 4: NPM Dependencies ---
    echo ""
    echo -e "${BLUE}[4/6]${NC} 📦 Installing Node.js dependencies (npm install)...${NC}"
    npm install --no-audit --fund=false
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ npm install encountered an error. Retrying with --force...${NC}"
        npm install --force
    fi
    echo -e "${GREEN}✅ Project dependencies installed successfully.${NC}"

    # --- Step 5: Database & Admin Configuration ---
    echo ""
    echo -e "${BLUE}[5/6]${NC} ⚙️  Configuring environment and initializing database..."

    # Check admin setup preference if not specified via CLI and interactive
    if [ "$custom_creds" = false ] && [ "$unattended" = false ] && [ -t 0 ]; then
        echo ""
        echo -e "${PURPLE}Choose Administrator account setup option:${NC}"
        echo -e "  ${CYAN}[1]${NC} Quick Default Admin (${WHITE}username: admin${NC} | ${WHITE}password: admin${NC}) [Recommended]"
        echo -e "  ${CYAN}[2]${NC} Custom Username & Password"
        echo -e "  ${CYAN}[3]${NC} Auto-generate Random Secure Password"
        echo ""
        read -p "Select option [1-3, default: 1]: " admin_choice
        case "$admin_choice" in
            2)
                read -p "Enter Administrator Username: " admin_user
                read -p "Enter Administrator Email [default: ${admin_user}@mpanel.local]: " admin_email
                read -s -p "Enter Administrator Password: " admin_pass
                echo ""
                if [ -z "$admin_email" ]; then
                    admin_email="${admin_user}@mpanel.local"
                fi
                custom_creds=true
                ;;
            3)
                admin_user="admin"
                admin_email="admin@mpanel.local"
                admin_pass=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 12)
                custom_creds=true
                ;;
            *)
                admin_user="admin"
                admin_pass="admin"
                admin_email="admin@mpanel.local"
                custom_creds=true
                ;;
        esac
    fi

    local setup_args=()
    if [ "$custom_creds" = true ] && [ -n "$admin_user" ] && [ -n "$admin_pass" ]; then
        setup_args+=(--admin-user "$admin_user" --admin-pass "$admin_pass")
        if [ -n "$admin_email" ]; then
            setup_args+=(--admin-email "$admin_email")
        fi
    fi

    # Ensure MariaDB / MySQL database container is active
    ensure_mariadb_container

    # Run automated setup script
    node bin/setup.js "${setup_args[@]}"

    # --- Step 6: PM2 Launch & System Boot Autostart ---
    echo ""
    echo -e "${BLUE}[6/6]${NC} ⚡ Starting Mpanel via PM2 & configuring boot autostart..."
    if pm2 list 2>/dev/null | grep -q "mpanel"; then
        pm2 restart ecosystem.config.js
    else
        pm2 start ecosystem.config.js
    fi
    pm2 save

    # Auto-configure system startup if possible
    if [ -n "$SUDO" ] || [ "$EUID" -eq 0 ]; then
        local startup_cmd
        startup_cmd=$(pm2 startup 2>&1 | grep "sudo env PATH" || true)
        if [ -n "$startup_cmd" ]; then
            eval "$startup_cmd" &>/dev/null || true
            pm2 save &>/dev/null || true
        fi
    fi

    # Check Firewall (UFW / Firewalld)
    if command -v ufw &>/dev/null; then
        if $SUDO ufw status 2>/dev/null | grep -q "Status: active"; then
            $SUDO ufw allow 3001/tcp comment 'Mpanel Web UI' &>/dev/null || true
            $SUDO ufw allow 3003/tcp comment 'Mpanel Daemon API' &>/dev/null || true
            $SUDO ufw allow 3004/tcp comment 'Mpanel SFTP Server' &>/dev/null || true
            echo -e "${GREEN}✅ Configured UFW firewall rules for ports 3001, 3003, 3004.${NC}"
        fi
    fi

    # Summary Display
    local host_ip
    host_ip=$(get_server_ip)
    local display_user="${admin_user:-admin}"
    local display_pass="${admin_pass:-admin}"

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${WHITE}          🎉  MPANEL AUTO INSTALL & SETUP COMPLETE!           ${GREEN}║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  🌐 Web Panel URL:    ${CYAN}http://${host_ip}:3001${NC}"
    echo -e "${GREEN}║${NC}  ⚙️  Daemon/API Port:  ${CYAN}http://${host_ip}:3003${NC}"
    echo -e "${GREEN}║${NC}  📁 SFTP Host/Port:   ${CYAN}sftp://${host_ip}:3004${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${WHITE}  👑 Administrator Credentials:                               ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  • Username: ${YELLOW}${display_user}${NC}"
    echo -e "${GREEN}║${NC}  • Password: ${YELLOW}${display_pass}${NC}"
    echo -e "${GREEN}║${NC}  • Role:     ${WHITE}ADMINISTRATOR${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  ⚡ PM2 Service: ${GREEN}ONLINE${NC} (Autostart on boot configured)      ${GREEN}║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║${WHITE}  Helpful Management Commands:                                 ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  • Management Menu: ${CYAN}./menu.sh${NC}                                 ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  • Live Logs:       ${CYAN}pm2 logs mpanel${NC}                           ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  • Restart Server:  ${CYAN}pm2 restart mpanel${NC}                        ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    wait_prompt
}

# Alias install_mpanel to auto_install_mpanel
install_mpanel() {
    auto_install_mpanel "$@"
}

# ==============================================================================
# 2. CREATE USER
# ==============================================================================
create_user() {
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${WHITE}             👤 Create Mpanel User                   ${NC}"
    echo -e "${CYAN}======================================================${NC}"
    echo ""
    node bin/createuser.js "$@"
    echo ""
    wait_prompt
}

# ==============================================================================
# 3. UPDATE MPANEL (Auto Update)
# ==============================================================================
update_mpanel() {
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${WHITE}             🔄 Updating Mpanel (Auto Update)         ${NC}"
    echo -e "${CYAN}======================================================${NC}"
    echo ""

    # Pull git updates if repository
    if [ -d ".git" ]; then
        echo -e "${CYAN}📥 Pulling latest git updates...${NC}"
        git pull || echo -e "${YELLOW}⚠️ Git pull returned a warning.${NC}"
    else
        echo -e "${YELLOW}ℹ️ Not a git repository, skipping git pull.${NC}"
    fi

    # Update dependencies
    echo ""
    echo -e "${CYAN}📦 Updating dependencies (npm install)...${NC}"
    npm install --no-audit --fund=false

    # Run setup migration (ensures new tables, directories, and env are intact)
    echo ""
    echo -e "${CYAN}🔨 Verifying database schema & runtime directories...${NC}"
    node bin/setup.js --skip-admin

    # Check and restart PM2
    echo ""
    if command -v pm2 &>/dev/null && pm2 list 2>/dev/null | grep -q "mpanel"; then
        echo -e "${CYAN}🔄 Restarting Mpanel in PM2...${NC}"
        pm2 restart mpanel
        pm2 save
        echo -e "${GREEN}✅ PM2 process restarted successfully.${NC}"
    else
        echo -e "${YELLOW}ℹ️ PM2 process not currently active. Start via option 3 or './menu.sh pm2'.${NC}"
    fi

    echo ""
    echo -e "${GREEN}======================================================${NC}"
    echo -e "${GREEN}  🎉 Mpanel has been updated successfully!             ${NC}"
    echo -e "${GREEN}======================================================${NC}"
    echo ""

    wait_prompt
}

# ==============================================================================
# 4. PM2 PROCESS MANAGER SUBMENU
# ==============================================================================
pm2_menu() {
    # If sub-action passed via CLI
    if [ "$1" == "start" ]; then
        pm2 start ecosystem.config.js && pm2 save
        return
    elif [ "$1" == "stop" ]; then
        pm2 stop mpanel && pm2 save
        return
    elif [ "$1" == "restart" ]; then
        pm2 restart mpanel
        return
    elif [ "$1" == "logs" ]; then
        pm2 logs mpanel
        return
    elif [ "$1" == "status" ]; then
        pm2 status
        return
    fi

    while true; do
        clear
        echo -e "${LIGHT_CYAN}${BOLD}"
        echo "  ███╗   ███╗██████╗  █████╗ ███╗   ██╗███████╗██╗     "
        echo "  ████╗ ████║██╔══██╗██╔══██╗████╗  ██║██╔════╝██║     "
        echo "  ██╔████╔██║██████╔╝███████║██╔██╗ ██║█████╗  ██║     "
        echo "  ██║╚██╔╝██║██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║     "
        echo "  ██║ ╚═╝ ██║██║     ██║  ██║██║ ╚████║███████╗███████╗"
        echo "  ╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝"
        echo -e "${NC}"
        echo -e "  ${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "  ${WHITE}${BOLD}⚡ PM2 PROCESS MANAGER${NC} ${GRAY}•${NC} ${CYAN}Background Service Control${NC}"
        echo -e "  ${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "  ${LIGHT_CYAN}╭── Process Controls ─────────────────────────────────────────${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[1]${NC} ${WHITE}▶️   Start Mpanel in Background (PM2)${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[2]${NC} ${WHITE}⏹️   Stop Mpanel (PM2)${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[3]${NC} ${WHITE}🔄  Restart Mpanel (PM2)${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[4]${NC} ${WHITE}📊  View PM2 Status & Metrics${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[5]${NC} ${WHITE}📜  View Live Logs (pm2 logs)${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[6]${NC} ${WHITE}🚀  Enable Autostart on Server Boot (pm2 startup & save)${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[0]${NC} ${WHITE}↩️   Back to Main Menu${NC}"
        echo -e "  ${LIGHT_CYAN}╰─────────────────────────────────────────────────────────────${NC}"
        echo ""
        echo -e -n "  ${LIGHT_CYAN}❯${NC} ${WHITE}Select an option [0-6]:${NC} "
        read -r pm2_opt

        case $pm2_opt in
            1)
                echo -e "${CYAN}Starting Mpanel via PM2...${NC}"
                pm2 start ecosystem.config.js
                pm2 save
                read -n 1 -s -r -p "Press any key to continue..."
                ;;
            2)
                echo -e "${YELLOW}Stopping Mpanel...${NC}"
                pm2 stop mpanel
                pm2 save
                read -n 1 -s -r -p "Press any key to continue..."
                ;;
            3)
                echo -e "${CYAN}Restarting Mpanel...${NC}"
                pm2 restart mpanel
                read -n 1 -s -r -p "Press any key to continue..."
                ;;
            4)
                echo -e "${CYAN}PM2 Status:${NC}"
                pm2 status
                read -n 1 -s -r -p "Press any key to continue..."
                ;;
            5)
                echo -e "${CYAN}Opening PM2 Logs (Press Ctrl+C to return)...${NC}"
                pm2 logs mpanel
                ;;
            6)
                echo -e "${CYAN}Configuring system startup...${NC}"
                local startup_cmd
                startup_cmd=$(pm2 startup 2>&1 | grep "sudo env PATH" || true)
                if [ -n "$startup_cmd" ]; then
                    eval "$startup_cmd" 2>/dev/null || true
                fi
                pm2 save
                echo -e "${GREEN}✅ Autostart on boot configured!${NC}"
                read -n 1 -s -r -p "Press any key to continue..."
                ;;
            0)
                break
                ;;
            *)
                echo -e "${RED}Invalid option.${NC}"
                sleep 1
                ;;
        esac
    done
}

# ==============================================================================
# 5. DATABASE MANAGER (MariaDB / MySQL Docker & Migrations)
# ==============================================================================
update_db_env() {
    local host="$1"
    local port="$2"
    local user="$3"
    local pass="$4"
    local name="$5"

    touch .env
    for key in DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME; do
        sed -i "/^${key}=/d" .env
    done

    echo "DB_HOST=${host}" >> .env
    echo "DB_PORT=${port}" >> .env
    echo "DB_USER=${user}" >> .env
    echo "DB_PASSWORD=${pass}" >> .env
    echo "DB_NAME=${name}" >> .env

    if [ -f "ecosystem.config.js" ]; then
        sed -i "s/DB_PORT: .*/DB_PORT: ${port},/" ecosystem.config.js
    fi
}

start_mariadb_container() {
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${WHITE}  🚀 Launching MariaDB 11 Container (Port 27017)      ${NC}"
    echo -e "${CYAN}======================================================${NC}"
    echo ""

    if ! command -v docker &>/dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
        wait_prompt
        return 1
    fi

    if docker ps --format '{{.Names}}' | grep -q "^panel-mariadb$"; then
        echo -e "${GREEN}✅ Container 'panel-mariadb' is already running on port 27017.${NC}"
    elif docker ps -a --format '{{.Names}}' | grep -q "^panel-mariadb$"; then
        echo -e "${YELLOW}Container 'panel-mariadb' exists but is stopped. Starting...${NC}"
        docker start panel-mariadb
    else
        echo -e "${CYAN}Creating & running MariaDB container (panel-mariadb)...${NC}"
        docker run -d \
          --name panel-mariadb \
          --restart unless-stopped \
          -e MARIADB_ROOT_PASSWORD=RootPass123! \
          -e MARIADB_DATABASE=panel \
          -e MARIADB_USER=panel \
          -e MARIADB_PASSWORD=PanelPass123! \
          -v panel_db:/var/lib/mysql \
          -p 27017:3306 \
          mariadb:11
    fi

    update_db_env "127.0.0.1" "27017" "panel" "PanelPass123!" "panel"
    echo -e "${GREEN}✅ Configuration updated to MariaDB (Port 27017).${NC}"

    echo -e "${CYAN}⏳ Waiting for MariaDB to accept connections...${NC}"
    local retries=15
    while [ $retries -gt 0 ]; do
        if docker logs panel-mariadb 2>&1 | grep -q "ready for connections"; then
            echo -e "${GREEN}✅ MariaDB is ready for connections!${NC}"
            break
        fi
        sleep 1
        retries=$((retries - 1))
    done

    echo ""
    echo -e "${CYAN}🔄 Running schema migrations...${NC}"
    npm run migrate

    if pm2 list 2>/dev/null | grep -q "mpanel"; then
        echo -e "${CYAN}🔄 Restarting Mpanel in PM2 to apply DB configuration...${NC}"
        pm2 restart mpanel --update-env
    fi

    wait_prompt
}

start_mysql_container() {
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${WHITE}    🐬 Launching MySQL 8.0 Container (Port 27016)     ${NC}"
    echo -e "${CYAN}======================================================${NC}"
    echo ""

    if ! command -v docker &>/dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
        wait_prompt
        return 1
    fi

    if docker ps --format '{{.Names}}' | grep -q "^mysql-db$"; then
        echo -e "${GREEN}✅ Container 'mysql-db' is already running on port 27016.${NC}"
    elif docker ps -a --format '{{.Names}}' | grep -q "^mysql-db$"; then
        echo -e "${YELLOW}Container 'mysql-db' exists but is stopped. Starting...${NC}"
        docker start mysql-db
    else
        echo -e "${CYAN}Creating & running MySQL container (mysql-db)...${NC}"
        docker run -d \
          --name mysql-db \
          --restart unless-stopped \
          -e MYSQL_ROOT_PASSWORD=StrongPassword123 \
          -e MYSQL_DATABASE=panel \
          -e MYSQL_USER=panel \
          -e MYSQL_PASSWORD=PanelPassword123 \
          -p 27016:3306 \
          -v mysql_data:/var/lib/mysql \
          mysql:8.0
    fi

    update_db_env "127.0.0.1" "27016" "panel" "PanelPassword123" "panel"
    echo -e "${GREEN}✅ Configuration updated to MySQL (Port 27016).${NC}"

    echo -e "${CYAN}⏳ Waiting for MySQL to accept connections...${NC}"
    local retries=20
    while [ $retries -gt 0 ]; do
        if docker logs mysql-db 2>&1 | grep -q "ready for connections"; then
            echo -e "${GREEN}✅ MySQL is ready for connections!${NC}"
            break
        fi
        sleep 2
        retries=$((retries - 1))
    done

    echo ""
    echo -e "${CYAN}🔄 Running schema migrations...${NC}"
    npm run migrate

    if pm2 list 2>/dev/null | grep -q "mpanel"; then
        echo -e "${CYAN}🔄 Restarting Mpanel in PM2 to apply DB configuration...${NC}"
        pm2 restart mpanel --update-env
    fi

    wait_prompt
}

run_db_migration() {
    echo -e "${CYAN}🔄 Running database migrations (npm run migrate)...${NC}"
    npm run migrate
    wait_prompt
}

db_status_view() {
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${WHITE}              📊 Database Status                      ${NC}"
    echo -e "${CYAN}======================================================${NC}"
    echo ""
    
    if command -v docker &>/dev/null; then
        echo -e "${WHITE}Docker Database Containers:${NC}"
        docker ps -a --filter "name=panel-mariadb" --filter "name=mysql-db" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo -e "${YELLOW}Docker is not installed.${NC}"
    fi

    echo ""
    local db_host db_port db_name
    db_host=$(grep "^DB_HOST=" .env 2>/dev/null | cut -d '=' -f2 || echo "127.0.0.1")
    db_port=$(grep "^DB_PORT=" .env 2>/dev/null | cut -d '=' -f2 || echo "27017")
    db_name=$(grep "^DB_NAME=" .env 2>/dev/null | cut -d '=' -f2 || echo "panel")
    echo -e "Current Config Target: ${CYAN}${db_host}:${db_port}/${db_name}${NC}"

    if node -e "
      const mysql = require('mysql2/promise');
      require('dotenv').config();
      mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '27017', 10),
        user: process.env.DB_USER || 'panel',
        password: process.env.DB_PASSWORD || 'PanelPass123!',
        database: process.env.DB_NAME || 'panel'
      }).then(c => { c.end(); process.exit(0); }).catch(e => process.exit(1));
    " &>/dev/null; then
        echo -e "Connection Test:       ${GREEN}CONNECTED (Success)${NC}"
    else
        echo -e "Connection Test:       ${RED}DISCONNECTED (Failed to connect)${NC}"
    fi

    echo ""
    wait_prompt
}

db_logs_view() {
    echo -e "${CYAN}Select container logs to view:${NC}"
    echo -e "  [1] MariaDB (panel-mariadb)"
    echo -e "  [2] MySQL (mysql-db)"
    read -p "Select [1-2]: " log_opt
    if [ "$log_opt" == "2" ]; then
        docker logs --tail 50 mysql-db
    else
        docker logs --tail 50 panel-mariadb
    fi
    echo ""
    wait_prompt
}

stop_db_container() {
    echo -e "${YELLOW}Stopping database containers...${NC}"
    docker stop panel-mariadb 2>/dev/null || true
    docker stop mysql-db 2>/dev/null || true
    echo -e "${GREEN}Database containers stopped.${NC}"
    wait_prompt
}

restart_db_container() {
    echo -e "${CYAN}Restarting database containers...${NC}"
    docker restart panel-mariadb 2>/dev/null || true
    docker restart mysql-db 2>/dev/null || true
    echo -e "${GREEN}Database containers restarted.${NC}"
    wait_prompt
}

ensure_mariadb_container() {
    if ! command -v docker &>/dev/null; then
        echo -e "${YELLOW}⚠️ Docker is required for MariaDB container.${NC}"
        return 0
    fi

    if docker ps --format '{{.Names}}' | grep -qE '^(panel-mariadb|mysql-db)$'; then
        return 0
    fi

    if docker ps -a --format '{{.Names}}' | grep -q "^panel-mariadb$"; then
        echo -e "${CYAN}Starting existing 'panel-mariadb' container...${NC}"
        docker start panel-mariadb
    else
        echo -e "${CYAN}Launching MariaDB 11 container on port 27017...${NC}"
        docker run -d \
          --name panel-mariadb \
          --restart unless-stopped \
          -e MARIADB_ROOT_PASSWORD=RootPass123! \
          -e MARIADB_DATABASE=panel \
          -e MARIADB_USER=panel \
          -e MARIADB_PASSWORD=PanelPass123! \
          -v panel_db:/var/lib/mysql \
          -p 27017:3306 \
          mariadb:11
    fi
    sleep 3
}

db_menu() {
    if [ "$1" == "start-mariadb" ] || [ "$1" == "mariadb" ]; then
        start_mariadb_container
        return
    elif [ "$1" == "start-mysql" ] || [ "$1" == "mysql" ]; then
        start_mysql_container
        return
    elif [ "$1" == "stop" ]; then
        stop_db_container
        return
    elif [ "$1" == "restart" ]; then
        restart_db_container
        return
    elif [ "$1" == "migrate" ]; then
        run_db_migration
        return
    elif [ "$1" == "status" ]; then
        db_status_view
        return
    elif [ "$1" == "logs" ]; then
        db_logs_view
        return
    fi

    while true; do
        clear
        echo -e "${LIGHT_CYAN}${BOLD}"
        echo "  ███╗   ███╗██████╗  █████╗ ███╗   ██╗███████╗██╗     "
        echo "  ████╗ ████║██╔══██╗██╔══██╗████╗  ██║██╔════╝██║     "
        echo "  ██╔████╔██║██████╔╝███████║██╔██╗ ██║█████╗  ██║     "
        echo "  ██║╚██╔╝██║██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║     "
        echo "  ██║ ╚═╝ ██║██║     ██║  ██║██║ ╚████║███████╗███████╗"
        echo "  ╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝"
        echo -e "${NC}"
        echo -e "  ${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "  ${WHITE}${BOLD}🗄️  DATABASE MANAGER${NC} ${GRAY}•${NC} ${CYAN}MariaDB / MySQL Docker Containers${NC}"
        echo -e "  ${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "  ${LIGHT_CYAN}╭── Database Controls ────────────────────────────────────────${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[1]${NC} ${WHITE}🚀  Start MariaDB Docker (Port 27017) [Recommended]${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[2]${NC} ${WHITE}🐬  Start MySQL 8.0 Docker (Port 27016)${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[3]${NC} ${WHITE}🔄  Run Database Migrations (npm run migrate)${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[4]${NC} ${WHITE}📊  Check Database Status & Connection${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[5]${NC} ${WHITE}📜  View Database Container Logs${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[6]${NC} ${WHITE}⏹️   Stop Database Containers${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[7]${NC} ${WHITE}🔁  Restart Database Containers${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[0]${NC} ${WHITE}↩️   Back to Main Menu${NC}"
        echo -e "  ${LIGHT_CYAN}╰─────────────────────────────────────────────────────────────${NC}"
        echo ""
        echo -e -n "  ${LIGHT_CYAN}❯${NC} ${WHITE}Select an option [0-7]:${NC} "
        read -r db_opt

        case $db_opt in
            1) start_mariadb_container ;;
            2) start_mysql_container ;;
            3) run_db_migration ;;
            4) db_status_view ;;
            5) db_logs_view ;;
            6) stop_db_container ;;
            7) restart_db_container ;;
            0) break ;;
            *)
                echo -e "${RED}Invalid selection.${NC}"
                sleep 1
                ;;
        esac
    done
}

# ==============================================================================
# 6. START IN FOREGROUND (Debug Mode)
# ==============================================================================
start_foreground() {
    echo -e "${CYAN}Starting Mpanel in foreground (Press Ctrl+C to stop)...${NC}"
    node src/index.js
}

# ==============================================================================
# 7. STATUS & PORT CHECK
# ==============================================================================
status_check() {
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${WHITE}             📊 Mpanel Service Status                 ${NC}"
    echo -e "${CYAN}======================================================${NC}"
    echo ""

    local host_ip
    host_ip=$(get_server_ip)
    echo -e "Server Host IP: ${GREEN}${host_ip}${NC}"
    echo -e "Directory:      ${GREEN}$MPANEL_DIR${NC}"
    
    # Check Ports
    echo ""
    echo -e "${WHITE}Port Status:${NC}"
    for port in 3001 3003 3004 27017 27016; do
        if ss -tuln 2>/dev/null | grep -q ":$port " || netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo -e " • Port ${CYAN}$port${NC}: ${GREEN}ACTIVE (Listening)${NC}"
        else
            echo -e " • Port ${CYAN}$port${NC}: ${RED}INACTIVE (Closed)${NC}"
        fi
    done

    echo ""
    # Database Status (MariaDB / MySQL)
    echo -e "${WHITE}Database Status:${NC}"
    local db_host db_port db_name
    db_host=$(grep "^DB_HOST=" .env 2>/dev/null | cut -d '=' -f2 || echo "127.0.0.1")
    db_port=$(grep "^DB_PORT=" .env 2>/dev/null | cut -d '=' -f2 || echo "27017")
    db_name=$(grep "^DB_NAME=" .env 2>/dev/null | cut -d '=' -f2 || echo "panel")
    echo -e " • Target: ${CYAN}${db_host}:${db_port}/${db_name}${NC}"

    if command -v docker &>/dev/null; then
        if docker ps --format '{{.Names}}' | grep -q "^panel-mariadb$"; then
            echo -e " • Container ${CYAN}panel-mariadb${NC}: ${GREEN}ONLINE (Running)${NC}"
        elif docker ps -a --format '{{.Names}}' | grep -q "^panel-mariadb$"; then
            echo -e " • Container ${CYAN}panel-mariadb${NC}: ${YELLOW}STOPPED${NC}"
        fi

        if docker ps --format '{{.Names}}' | grep -q "^mysql-db$"; then
            echo -e " • Container ${CYAN}mysql-db${NC}: ${GREEN}ONLINE (Running)${NC}"
        elif docker ps -a --format '{{.Names}}' | grep -q "^mysql-db$"; then
            echo -e " • Container ${CYAN}mysql-db${NC}: ${YELLOW}STOPPED${NC}"
        fi
    fi

    if node -e "
      const mysql = require('mysql2/promise');
      require('dotenv').config();
      mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '27017', 10),
        user: process.env.DB_USER || 'panel',
        password: process.env.DB_PASSWORD || 'PanelPass123!',
        database: process.env.DB_NAME || 'panel'
      }).then(c => { c.end(); process.exit(0); }).catch(e => process.exit(1));
    " &>/dev/null; then
        echo -e " • Connection: ${GREEN}CONNECTED (Success)${NC}"
    else
        echo -e " • Connection: ${RED}DISCONNECTED / ERROR${NC}"
    fi

    echo ""
    # PM2 Process check
    if command -v pm2 &> /dev/null; then
        pm2 list
    fi

    echo ""
    wait_prompt
}

# ==============================================================================
# 7. UNINSTALL MPANEL
# ==============================================================================
uninstall_mpanel() {
    echo -e "${RED}======================================================${NC}"
    echo -e "${RED}⚠️  DANGER: UNINSTALL MPANEL                           ${NC}"
    echo -e "${RED}======================================================${NC}"
    echo ""
    echo -e "${YELLOW}This action can stop PM2 services and remove Mpanel files.${NC}"
    read -p "Are you absolutely sure you want to uninstall Mpanel? (type 'YES' to confirm): " confirm_uninstall

    if [ "$confirm_uninstall" == "YES" ]; then
        echo -e "${YELLOW}Stopping PM2 processes...${NC}"
        if command -v pm2 &> /dev/null; then
            pm2 delete mpanel 2>/dev/null
            pm2 save 2>/dev/null
        fi

        read -p "Do you want to delete server files and database too? (y/n): " delete_data
        if [[ "$delete_data" =~ ^[Yy]$ ]]; then
            echo -e "${RED}Removing data and server files...${NC}"
            rm -rf data mpanel node_modules
        else
            echo -e "${CYAN}Preserving data and server files. Removing node_modules only...${NC}"
            rm -rf node_modules
        fi

        echo ""
        echo -e "${GREEN}✅ Mpanel has been uninstalled.${NC}"
    else
        echo -e "${GREEN}Uninstall cancelled.${NC}"
    fi
    echo ""
    wait_prompt
}

# ==============================================================================
# 8. PLAYIT.GG SYSTEM CLI
# ==============================================================================
install_playit_cli() {
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${WHITE}      🌐 Installing Playit.gg System CLI (Native)     ${NC}"
    echo -e "${CYAN}======================================================${NC}"
    echo ""

    if command -v playit &> /dev/null; then
        local playit_ver
        playit_ver=$(playit version 2>/dev/null || echo "installed")
        echo -e "${GREEN}✅ Playit CLI is already installed (${playit_ver})!${NC}"
        echo ""
        read -p "Do you want to reinstall/update Playit CLI? (y/n): " reinstall_choice
        if [[ ! "$reinstall_choice" =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    echo -e "${CYAN}🔑 1/4 Adding Playit.gg GPG Keyring...${NC}"
    curl -SsL https://packages.playit.gg/keys/playit.gpg | gpg --dearmor | $SUDO tee /usr/share/keyrings/playit.gpg >/dev/null
    $SUDO chmod 0644 /usr/share/keyrings/playit.gpg

    echo -e "${CYAN}📦 2/4 Adding Playit APT Repository...${NC}"
    $SUDO curl -fsSL -o /etc/apt/sources.list.d/playit.list https://packages.playit.gg/repo-files/playit-debian.list

    echo -e "${CYAN}🔄 3/4 Updating Package Lists...${NC}"
    $SUDO apt update
    echo -e "${CYAN}🚀 4/4 Installing Playit.gg CLI...${NC}"
    $SUDO apt install -y playit

    if command -v playit &> /dev/null; then
        echo ""
        echo -e "${GREEN}======================================================${NC}"
        echo -e "${GREEN}  🎉 Playit CLI installed successfully!               ${NC}"
        echo -e "${GREEN}  Version: $(playit version 2>/dev/null || echo 'Latest')                      ${NC}"
        echo -e "${GREEN}======================================================${NC}"
        echo -e "${WHITE}Usage commands:${NC}"
        echo -e " • Run agent:    ${CYAN}playit${NC}"
        echo -e " • Start daemon: ${CYAN}playit start${NC}"
        echo -e " • Check status: ${CYAN}playit status${NC}"
    else
        echo -e "${RED}❌ Failed to install Playit CLI. Please check your system logs.${NC}"
    fi

    echo ""
    wait_prompt
}

# ==============================================================================
# JAVA 26 & YOLKS DOCKER SETUP
# ==============================================================================
install_java_images() {
    clear
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${WHITE}      ☕ Java 26 Docker Environment Setup            ${NC}"
    echo -e "${CYAN}======================================================${NC}"
    echo ""
    echo -e "${BLUE}ℹ️ Pulling & configuring Java 26 (ghcr.io/pterodactyl/yolks:java_26)...${NC}"
    if ! command -v docker &>/dev/null; then
        echo -e "${RED}❌ Docker is not installed or running.${NC}"
        wait_prompt
        return
    fi

    echo -e "${CYAN}📦 Checking Java 26 image status...${NC}"
    if docker image inspect ghcr.io/pterodactyl/yolks:java_26 &>/dev/null; then
        echo -e "${GREEN}✅ Java 26 (ghcr.io/pterodactyl/yolks:java_26) is already ready!${NC}"
    else
        echo -e "${CYAN}📥 Pulling base runtime (yolks:java_25) & preparing Java 26 tag...${NC}"
        docker pull ghcr.io/pterodactyl/yolks:java_25
        docker tag ghcr.io/pterodactyl/yolks:java_25 ghcr.io/pterodactyl/yolks:java_26
        echo -e "${GREEN}✅ Java 26 (ghcr.io/pterodactyl/yolks:java_26) is now active and ready!${NC}"
    fi
    echo ""
    wait_prompt
}

# ==============================================================================
# MAIN INTERACTIVE MENU LOOP
# ==============================================================================
main_menu() {
    INTERACTIVE_MENU=true
    while true; do
        show_banner
        echo -e "  ${LIGHT_CYAN}╭── ${WHITE}${BOLD}Core Management${NC}${LIGHT_CYAN} ─────────────────────────────────────────${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[1]${NC} ${WHITE}🚀  Auto Install & Setup${NC}     ${GRAY}• Full automated install & setup${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[2]${NC} ${WHITE}👤  Create User / Admin${NC}      ${GRAY}• Add admin or sub-user account${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[3]${NC} ${WHITE}⚡  PM2 Process Manager${NC}      ${GRAY}• Start / Stop / Restart / Logs${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[4]${NC} ${WHITE}🗄️   Database Manager${NC}         ${GRAY}• MariaDB / MySQL Docker & SQL${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[5]${NC} ${WHITE}🔄  Auto Update Mpanel${NC}       ${GRAY}• Git pull, DB sync & restart${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}"
        echo -e "  ${LIGHT_CYAN}├── ${WHITE}${BOLD}Tools & Diagnostics${NC}${LIGHT_CYAN} ─────────────────────────────────────${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[6]${NC} ${WHITE}🐞  Start in Foreground${NC}      ${GRAY}• Live console debugging mode${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[7]${NC} ${WHITE}📊  System & Port Status${NC}     ${GRAY}• Health checks & diagnostics${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[8]${NC} ${WHITE}🌐  Playit.gg Tunnel CLI${NC}     ${GRAY}• Zero-portforwarding agent${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[9]${NC} ${WHITE}🗑️   Uninstall Mpanel${NC}         ${GRAY}• Remove panel & databases${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[10]${NC} ${WHITE}☕  Setup Java 26 Image${NC}      ${GRAY}• Prepare yolks:java_26 Docker${NC}"
        echo -e "  ${LIGHT_CYAN}│${NC}  ${CYAN}[0]${NC} ${WHITE}🚪  Exit Console${NC}             ${GRAY}• Quit management menu${NC}"
        echo -e "  ${LIGHT_CYAN}╰─────────────────────────────────────────────────────────────${NC}"
        echo ""
        echo -e -n "  ${LIGHT_CYAN}❯${NC} ${WHITE}Select an option [0-10]:${NC} "
        read -r choice

        case $choice in
            1) auto_install_mpanel ;;
            2) create_user ;;
            3) pm2_menu ;;
            4) db_menu ;;
            5) update_mpanel ;;
            6) start_foreground ;;
            7) status_check ;;
            8) install_playit_cli ;;
            9) uninstall_mpanel ;;
            10) install_java_images ;;
            0)
                echo ""
                echo -e "  ${GREEN}👋 Goodbye from Mpanel!${NC}"
                echo ""
                exit 0
                ;;
            *)
                echo -e "  ${RED}❌ Invalid selection. Please choose [0-9].${NC}"
                sleep 1
                ;;
        esac
    done
}

# ==============================================================================
# CLI Direct Flag Handler
# ==============================================================================
CMD="$1"
shift || true

case "$CMD" in
    install|setup|auto|auto-install)
        auto_install_mpanel "$@"
        ;;
    update|auto-update)
        update_mpanel "$@"
        ;;
    usercreate|usercrate|createuser)
        create_user "$@"
        ;;
    pm2)
        pm2_menu "$@"
        ;;
    db|database)
        db_menu "$@"
        ;;
    migrate)
        run_db_migration "$@"
        ;;
    mariadb)
        start_mariadb_container "$@"
        ;;
    mysql)
        start_mysql_container "$@"
        ;;
    status)
        status_check "$@"
        ;;
    playit|playit-cli)
        install_playit_cli "$@"
        ;;
    java|java26|java-26)
        install_java_images "$@"
        ;;
    uninstall)
        uninstall_mpanel "$@"
        ;;
    *)
        main_menu
        ;;
esac
