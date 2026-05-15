#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

info() {
    echo -e "${BLUE}${BOLD}[INFO]${RESET} $1"
}

success() {
    echo -e "${GREEN}${BOLD}[OK]${RESET} $1"
}

warn() {
    echo -e "${YELLOW}${BOLD}[WARN]${RESET} $1"
}

die() {
    echo -e "${RED}${BOLD}[ERROR]${RESET} $1" >&2
    exit 1
}

step() {
    echo ""
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${BOLD}${BLUE}  步骤 $1: $2${RESET}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

if [[ $EUID -ne 0 ]]; then
    die "此脚本需要 root 权限运行"
fi

success "root 权限检查通过"

step "1/10" "检查系统环境"

if [[ ! -f /etc/os-release ]]; then
    die "无法检测操作系统版本"
fi

source /etc/os-release

if [[ "$ID" != "ubuntu" ]]; then
    warn "此脚本专为 Ubuntu 设计，当前系统为 $ID，继续执行可能存在问题"
fi

info "当前系统: $PRETTY_NAME"

step "2/10" "安装系统依赖"

apt-get update && apt-get install -y nginx curl unzip git || die "系统依赖安装失败"

success "系统依赖安装完成"

step "3/10" "安装 Bun"

if command -v bun &>/dev/null; then
    success "Bun 已安装: $(bun --version)"
else
    curl -fsSL https://bun.sh/install | bash || die "Bun 安装失败"
    source /root/.bashrc
    success "Bun 安装完成: $(bun --version)"
fi

step "4/10" "克隆项目"

read -p "请输入 GitHub 仓库地址 (默认: https://github.com/Muelsyselove/SeeDay.git): " REPO_URL
REPO_URL=${REPO_URL:-https://github.com/Muelsyselove/SeeDay.git}

if [[ -d /root/SeeDay/.git ]]; then
    warn "项目目录已存在，跳过克隆"
else
    git clone "$REPO_URL" /root/SeeDay || die "项目克隆失败"
    success "项目克隆完成"
fi

step "5/10" "配置环境变量"

read -p "请输入设备名称 (默认: MyDevice): " DEVICE_NAME
DEVICE_NAME=${DEVICE_NAME:-MyDevice}

read -p "请输入你的域名 (例如: seeday.example.com): " DOMAIN
DOMAIN=${DOMAIN:-}

if [[ -z "$DOMAIN" ]]; then
    die "域名不能为空"
fi

TOKEN=$(openssl rand -hex 32)
HASH_SECRET=$(openssl rand -hex 32)

ENV_FILE="/root/SeeDay/packages/backend/.env"

cat > "$ENV_FILE" <<EOF
TOKEN=$TOKEN
HASH_SECRET=$HASH_SECRET
DEVICE_NAME=$DEVICE_NAME
PORT=3000
EOF

success "环境变量已写入 $ENV_FILE"

step "6/10" "安装依赖并构建"

info "安装后端依赖..."
cd /root/SeeDay/packages/backend && bun install || die "后端依赖安装失败"

info "安装前端依赖..."
cd /root/SeeDay/packages/frontend && bun install || die "前端依赖安装失败"

info "构建前端..."
cd /root/SeeDay/packages/frontend && bun run build || die "前端构建失败"

mkdir -p /root/SeeDay/packages/backend/public
cp -r /root/SeeDay/packages/frontend/out/. /root/SeeDay/packages/backend/public/

success "依赖安装和构建完成"

step "7/10" "配置 Systemd 服务"

cat > /etc/systemd/system/seeday.service <<EOF
[Unit]
Description=SeeDay Live Dashboard Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/SeeDay/packages/backend
EnvironmentFile=/root/SeeDay/packages/backend/.env
ExecStart=/usr/local/bin/bun run src/index.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload || die "systemctl daemon-reload 失败"
systemctl enable seeday || die "启用 seeday 服务失败"
systemctl start seeday || die "启动 seeday 服务失败"

success "SeeDay 服务已启动并设置为开机自启"

step "8/10" "配置 Nginx"

cat > /etc/nginx/sites-available/seeday <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /_next/static/ {
        alias /root/SeeDay/packages/backend/public/_next/static/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/seeday /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

NGINX_CONF="/etc/nginx/nginx.conf"
if ! grep -q "gzip_min_length" "$NGINX_CONF"; then
    sed -i '/http {/a\\tgzip on;\n\tgzip_vary on;\n\tgzip_proxied any;\n\tgzip_comp_level 6;\n\tgzip_buffers 16 8k;\n\tgzip_http_version 1.1;\n\tgzip_min_length 256;\n\tgzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;' "$NGINX_CONF"
fi

nginx -t || die "Nginx 配置测试失败"
systemctl restart nginx || die "Nginx 重启失败"

success "Nginx 配置完成"

step "9/10" "配置 Cloudflare Tunnel"

read -p "是否配置 Cloudflare Tunnel? (推荐，可绕过国内云服务器80/443端口ICP备案限制) [Y/n]: " SETUP_TUNNEL
SETUP_TUNNEL=${SETUP_TUNNEL:-Y}

if [[ "$SETUP_TUNNEL" =~ ^[Yy] ]]; then
    if command -v cloudflared &>/dev/null; then
        success "cloudflared 已安装"
    else
        info "下载 cloudflared..."
        if curl -fsSL -o /usr/local/bin/cloudflared https://ghfast.top/https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 2>/dev/null; then
            chmod +x /usr/local/bin/cloudflared
            success "cloudflared 安装完成"
        else
            warn "ghfast.top 镜像下载失败，尝试直接下载..."
            if curl -fsSL -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64; then
                chmod +x /usr/local/bin/cloudflared
                success "cloudflared 安装完成"
            else
                die "cloudflared 下载失败，请手动下载: https://github.com/cloudflare/cloudflared/releases/latest"
            fi
        fi
    fi

    info "登录 Cloudflare，请在浏览器中打开以下链接并授权:"
    cloudflared tunnel login || die "Cloudflare 登录失败"

    read -p "请输入隧道名称 (默认: seeday): " TUNNEL_NAME
    TUNNEL_NAME=${TUNNEL_NAME:-seeday}

    cloudflared tunnel create "$TUNNEL_NAME" || die "隧道创建失败"

    TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

    if [[ -z "$TUNNEL_ID" ]]; then
        die "无法获取隧道 ID"
    fi

    success "隧道创建成功，ID: $TUNNEL_ID"

    mkdir -p /root/.cloudflared

    cat > /root/.cloudflared/config.yml <<EOF
tunnel: $TUNNEL_ID
credentials-file: /root/.cloudflared/$TUNNEL_ID.json
ingress:
  - hostname: $DOMAIN
    service: http://127.0.0.1:3000
  - hostname: "*.$DOMAIN"
    service: http://127.0.0.1:3000
  - service: http_status:404
EOF

    success "cloudflared 配置文件已生成"

    info "添加 DNS 路由，如果已有 A 记录请先在 Cloudflare DNS 面板中删除..."
    cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN" || warn "DNS 路由添加失败，请手动在 Cloudflare 面板中添加 CNAME 记录"

    cloudflared service install || die "cloudflared 服务安装失败"
    systemctl enable cloudflared || die "cloudflared 服务启用失败"
    systemctl start cloudflared || die "cloudflared 服务启动失败"

    success "Cloudflare Tunnel 配置完成"
else
    info "跳过 Cloudflare Tunnel 配置"
fi

step "10/10" "部署信息"

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║              SeeDay 部署完成！                              ║${RESET}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${BOLD}网站访问地址:${RESET}  http://$DOMAIN"
if [[ "$SETUP_TUNNEL" =~ ^[Yy] ]]; then
    echo -e "${BOLD}HTTPS 地址:${RESET}    https://$DOMAIN (通过 Cloudflare Tunnel)"
fi
echo ""
echo -e "${BOLD}Agent 配置信息:${RESET}"
echo -e "  server_url: http://$DOMAIN (或 https://$DOMAIN)"
echo -e "  token:      $TOKEN"
echo ""
echo -e "${BOLD}服务管理命令:${RESET}"
echo -e "  查看 SeeDay 状态:  systemctl status seeday"
echo -e "  重启 SeeDay:       systemctl restart seeday"
echo -e "  查看 SeeDay 日志:  journalctl -u seeday -f"
echo -e "  重启 Nginx:        systemctl restart nginx"
if [[ "$SETUP_TUNNEL" =~ ^[Yy] ]]; then
    echo -e "  查看 Tunnel 状态:  systemctl status cloudflared"
    echo -e "  重启 Tunnel:       systemctl restart cloudflared"
fi
echo ""
if [[ "$SETUP_TUNNEL" =~ ^[Yy] ]]; then
    echo -e "${YELLOW}${BOLD}Cloudflare 面板设置提醒:${RESET}"
    echo -e "  1. SSL/TLS 模式设为 ${BOLD}Full (Strict)${RESET}"
    echo -e "  2. 开启 ${BOLD}Always Use HTTPS${RESET}"
    echo ""
fi
