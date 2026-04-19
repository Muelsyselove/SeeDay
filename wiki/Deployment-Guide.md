# 部署指南

本文档提供 SeeDay 的详细部署步骤，包括 Docker 部署和手动部署两种方式。

## 前置准备

在开始部署前，请确保：

- 满足 [部署要求](Requirements) 中的硬件和软件条件
- 拥有服务器的 SSH 访问权限
- 已配置域名（可选，但推荐）

## 方式一：Docker 部署（推荐）

Docker 部署是最简单快捷的方式，推荐生产环境使用。

### 1. 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | bash

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo apt-get install -y docker-compose-plugin
```

### 2. 生成密钥

```bash
# 生成设备 Token（Agent 认证用）
TOKEN=$(openssl rand -hex 16)
echo "Device Token: $TOKEN"

# 生成哈希密钥
SECRET=$(openssl rand -hex 32)
echo "Hash Secret: $SECRET"
```

### 3. 创建配置文件

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  see-day:
    image: ghcr.io/muelsyselove/seeday:latest
    container_name: seeday
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - seeday_data:/data
    environment:
      - HASH_SECRET=${HASH_SECRET}
      - DEVICE_TOKEN_1=${TOKEN}:my-pc:MyPC:windows
      - PORT=3000
      # AI 总结配置（可选）
      - AI_API_URL=https://api.openai.com/v1/chat/completions
      - AI_API_KEY=${AI_API_KEY}
      - AI_MODEL=gpt-4o-mini

volumes:
  seeday_data:
    driver: local
```

创建 `.env` 文件：

```env
HASH_SECRET=你的哈希密钥
AI_API_KEY=你的AI密钥（可选）
```

### 4. 启动服务

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 5. 验证部署

访问 `http://服务器IP:3000`，如果看到 SeeDay 仪表盘页面，说明部署成功。

## 方式二：手动部署

### 后端部署

#### 1. 安装 Bun

```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 验证安装
bun --version
```

#### 2. 获取源码

```bash
git clone https://github.com/Muelsyselove/SeeDay.git
cd SeeDay/packages/backend
```

#### 3. 安装依赖

```bash
bun install
```

#### 4. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
PORT=3000
HASH_SECRET=你的哈希密钥
DEVICE_TOKEN_1=你的Token:设备ID:设备名称:windows
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=你的AI密钥
AI_MODEL=gpt-4o-mini
```

#### 5. 启动后端

```bash
# 开发模式
bun run dev

# 生产模式
bun run start
```

### 前端部署

#### 1. 安装 Node.js

```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### 2. 安装依赖

```bash
cd SeeDay/packages/frontend
npm install
```

#### 3. 构建前端

```bash
# 构建静态文件
npm run build
```

#### 4. 启动前端

```bash
# 开发模式
npm run dev

# 生产模式（静态导出后使用任何静态服务器）
npx serve out
```

## Nginx 反向代理配置

### 1. 安装 Nginx

```bash
sudo apt-get install -y nginx
```

### 2. 创建配置文件

创建 `/etc/nginx/sites-available/seeday`：

```nginx
server {
    listen 80;
    server_name see.yourdomain.com;

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 前端静态文件
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/seeday /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

## HTTPS 配置（使用 Let's Encrypt）

### 1. 安装 Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### 2. 获取证书

```bash
sudo certbot --nginx -d see.yourdomain.com
```

### 3. 自动续期

```bash
# 测试续期
sudo certbot renew --dry-run

# Certbot 会自动添加 cron 任务进行续期
```

## 环境变量配置

### 必需变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `HASH_SECRET` | 哈希密钥，用于设备认证 | 32位随机十六进制字符串 |
| `DEVICE_TOKEN_N` | 设备 Token，格式：`token:id:name:platform` | `abc123:dev1:MyPC:windows` |

### 可选变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 后端服务端口 |
| `AI_API_URL` | - | AI API 端点 |
| `AI_API_KEY` | - | AI API 密钥 |
| `AI_MODEL` | gpt-4o-mini | AI 模型名称 |
| `LOG_LEVEL` | info | 日志级别 |
| `DATA_DIR` | ./data | 数据存储目录 |

## 常见问题排查

### 服务无法启动

```bash
# 检查端口占用
sudo lsof -i :3000

# 查看 Docker 日志
docker-compose logs seeday

# 查看系统日志
journalctl -u nginx -f
```

### Agent 无法连接

1. 检查防火墙是否开放端口
2. 验证 Token 是否正确
3. 检查服务器网络连通性
4. 查看后端日志确认请求是否到达

### 数据库问题

```bash
# 检查数据库文件权限
ls -la /data/

# 备份数据库
cp /data/dashboard.db /data/dashboard.db.bak

# 修复数据库（如损坏）
sqlite3 /data/dashboard.db "PRAGMA integrity_check;"
```

### 内存不足

```bash
# 查看内存使用
free -h

# 查看进程内存
docker stats

# 清理 Docker 资源
docker system prune -af
```
