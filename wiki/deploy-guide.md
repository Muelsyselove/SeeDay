# SeeDay 部署指南

## 项目概述

SeeDay 是一个时间管理仪表盘项目，包含以下组件：

- **后端**：Node.js/Bun + Express，运行在 3000 端口
- **前端**：Next.js 静态导出
- **Windows Agent**：Python + tkinter + pystray + curl_cffi
- **反向代理**：Nginx
- **CDN/安全**：Cloudflare Tunnel

---

## 1. 环境要求

| 项目 | 要求 |
|------|------|
| 服务器 | Ubuntu 20.04+ |
| 域名 | 已注册的域名 |
| Cloudflare 账号 | 免费账号即可 |
| Windows 电脑 | 用于运行 Agent |

---

## 2. 快速部署（自动脚本）

项目提供了一键部署脚本，适用于全新的 Ubuntu 服务器：

```bash
bash deploy/ubuntu-deploy.sh
```

脚本会自动完成依赖安装、项目克隆、构建和服务配置。如果需要了解详细步骤或自定义配置，请参考下方手动部署章节。

---

## 3. 手动部署步骤

### 3.1 安装依赖

安装 Bun、Nginx、Node.js 等必要依赖：

```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 安装 Nginx
apt update && apt install -y nginx

# 安装 Node.js（如需）
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 3.2 克隆项目并构建

```bash
git clone https://github.com/Muelsyselove/SeeDay.git
cd SeeDay
```

**配置环境变量**，在项目根目录创建 `.env` 文件：

```bash
DEVICE_TOKEN=your_device_token
HASH_SECRET=your_hash_secret
```

**安装后端依赖：**

```bash
cd packages/backend && bun install
```

**安装前端依赖：**

```bash
cd packages/frontend && bun install
```

**构建前端：**

```bash
cd packages/frontend && bun run build
```

**复制前端产物到后端 public 目录：**

```bash
cp -r packages/frontend/out/* packages/backend/public/
```

### 3.3 配置 Systemd 服务

创建 `/etc/systemd/system/seeday.service`：

```ini
[Unit]
Description=SeeDay Backend Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/SeeDay/packages/backend
ExecStart=/usr/local/bin/bun run src/index.ts
EnvironmentFile=/root/SeeDay/.env
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
systemctl daemon-reload
systemctl enable seeday
systemctl start seeday
```

### 3.4 配置 Nginx 反向代理

创建或修改 `/etc/nginx/sites-available/seeday`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1024;
    gzip_comp_level 6;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# SSL 直连配置（备用方案，用于 8443 端口）
server {
    listen 8443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置并重启 Nginx：

```bash
ln -s /etc/nginx/sites-available/seeday /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

> 注意：国内云服务器（京东云、阿里云等）的 80/443 端口需要 ICP 备案才能使用。如果未备案，建议使用 Cloudflare Tunnel 方案。

### 3.5 配置 Cloudflare Tunnel（推荐方案）

**为什么需要 Tunnel：** 国内云服务器对 80/443 端口有 ICP 备案要求，海外 Cloudflare 节点无法通过 443 端口连接源站，导致 525 SSL 握手失败。Cloudflare Tunnel 通过出站连接解决这个问题，无需开放入站端口。

**步骤：**

1. **注册 Cloudflare 账号**，添加域名，将域名的 NS 记录修改为 Cloudflare 提供的 NS 服务器。

2. **安装 cloudflared：**

```bash
curl -fsSL -o /usr/local/bin/cloudflared https://ghfast.top/https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x /usr/local/bin/cloudflared
```

3. **登录 Cloudflare：**

```bash
cloudflared tunnel login
```

此命令会给出一个 URL，在浏览器中打开并授权。

4. **创建隧道：**

```bash
cloudflared tunnel create seeday
```

记下输出的 Tunnel ID。

5. **配置 config.yml**，创建 `/root/.cloudflared/config.yml`：

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: your-domain.com
    service: http://127.0.0.1:3000
  - hostname: "*.your-domain.com"
    service: http://127.0.0.1:3000
  - service: http_status:404
```

将 `<TUNNEL_ID>` 替换为实际的隧道 ID。

6. **添加 DNS 路由：**

```bash
cloudflared tunnel route dns seeday your-domain.com
cloudflared tunnel route dns seeday "*.your-domain.com"
```

7. **安装为系统服务并启动：**

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

### 3.6 Cloudflare SSL 设置

登录 Cloudflare 控制台，进入对应域名的 SSL/TLS 设置：

| 设置项 | 推荐值 |
|--------|--------|
| SSL/TLS 加密模式 | Full (Strict) |
| Always Use HTTPS | 开启 |
| Minimum TLS Version | TLS 1.2 |

### 3.7 生成 Cloudflare Origin Certificate（直连方案备用）

如果需要通过 8443 端口直连访问（不经过 Tunnel），需要配置 Origin Certificate：

1. 进入 Cloudflare 控制台，SSL/TLS -> Origin Server -> Create Certificate
2. 选择默认选项，生成证书
3. 将证书和私钥保存到服务器：

```bash
mkdir -p /etc/ssl/cloudflare
# 保存证书
nano /etc/ssl/cloudflare/cert.pem
# 保存私钥
nano /etc/ssl/cloudflare/key.pem
chmod 600 /etc/ssl/cloudflare/key.pem
```

4. 在 Nginx SSL 配置中引用这些证书（见 3.4 节的 8443 端口配置）

---

## 4. Windows Agent 配置

### 4.1 安装依赖

```bash
pip install -r agents/windows/requirements.txt
pip install curl_cffi
```

> 注意：`curl_cffi` 是必需的依赖，用于模拟浏览器 TLS 指纹以绕过 Cloudflare WAF。普通的 `requests` 库会被 WAF 拦截。

### 4.2 配置 config.json

编辑 `agents/windows/config.json`：

```json
{
  "server_url": "https://your-domain.com",
  "token": "your_token_here",
  "interval_seconds": 5,
  "heartbeat_seconds": 60
}
```

> 注意：`server_url` 必须使用 `https://domain.com` 格式，不要在末尾加 `/`，不要带路径后缀，否则会导致 URL 拼接错误。

### 4.3 打包为 exe

```bash
build.bat
```

打包完成后，生成的 exe 文件可以直接在 Windows 上运行，无需 Python 环境。

---

## 5. 常见问题排查

### 5.1 网页 ERR_CONNECTION_RESET

- **原因**：Nginx 配置错误或端口未开放
- **解决**：
  1. 检查 Nginx 配置：`nginx -t`
  2. 检查云服务器安全组是否放行对应端口
  3. 检查服务器防火墙：`ufw status`

### 5.2 Cloudflare 521/525 错误

- **521 错误**：Cloudflare 无法连接源站，通常是因为端口未开放或后端服务未运行
  - 检查后端服务是否运行：`systemctl status seeday`
  - 检查端口是否监听：`ss -tlnp | grep 3000`

- **525 错误**：SSL 握手失败，国内云服务器封锁 443 端口，海外 Cloudflare 节点无法通过 443 端口连接源站
  - **解决方案**：使用 Cloudflare Tunnel（见 3.5 节），Tunnel 通过出站连接绕过端口封锁

### 5.3 Agent 显示离线

- **原因 1**：`server_url` 配置错误，URL 拼接问题
  - 确保 `server_url` 使用 `https://domain.com` 格式，末尾无斜杠

- **原因 2**：SSL 证书验证失败（自签名证书）
  - 使用 Cloudflare 签发的证书，或配置 Agent 跳过证书验证（不推荐生产环境）

- **原因 3**：WAF 拦截 Python requests 的 TLS 指纹
  - **解决方案**：使用 `curl_cffi` 库模拟浏览器 TLS 指纹

### 5.4 Agent 状态波动

- **原因**：健康检查超时时间过短，一次请求失败即标记为离线
- **解决方案**：
  1. 增加超时时间至 10 秒
  2. 连续 3 次失败才标记为离线，避免偶发网络波动导致误判

### 5.5 网页卡在 Loading

- **原因**：JS 文件过大未压缩，传输缓慢
- **解决方案**：启用 Nginx gzip 压缩（见 3.4 节配置）

### 5.6 浏览器 ERR_QUIC_PROTOCOL_ERROR

- **原因**：HTTP/3 (QUIC) 协议在国内网络环境下不稳定
- **解决方案**：在 Chrome 地址栏输入 `chrome://flags/#enable-quic`，将 QUIC 协议设置为 Disabled，然后重启浏览器

### 5.7 DNS 缓存导致无法访问

- **原因**：切换 Cloudflare 后本地 DNS 缓存未更新
- **解决方案**：
  - Windows：`ipconfig /flushdns`
  - Chrome：地址栏输入 `chrome://net-internals/#dns`，点击 Clear host cache
  - Chrome：地址栏输入 `chrome://net-internals/#sockets`，点击 Flush socket pools

### 5.8 Windows Agent 设置界面无法交互

- **原因**：tkinter 主线程限制，从 pystray 回调线程直接调用 mainloop 导致死锁
- **解决方案**：使用事件信号（`_settings_pending`）在主线程中打开设置窗口，而非从 pystray 回调线程直接操作 UI

---

## 6. 架构图

```
用户浏览器  -->  Cloudflare CDN  -->  Cloudflare Tunnel  -->  服务器(127.0.0.1:3000)
Windows Agent -->  Cloudflare CDN  -->  Cloudflare Tunnel  -->  服务器(127.0.0.1:3000)
```

流量路径说明：

1. 用户浏览器或 Windows Agent 发起 HTTPS 请求到域名
2. 请求经过 Cloudflare CDN，获得 DDoS 防护和 SSL 终止
3. Cloudflare Tunnel 通过出站连接将流量转发到服务器本地 3000 端口
4. 后端服务处理请求并返回响应

---

## 7. 服务管理命令

```bash
# 查看服务状态
systemctl status seeday
systemctl status cloudflared
systemctl status nginx

# 重启服务
systemctl restart seeday
systemctl restart cloudflared
systemctl restart nginx

# 查看日志
journalctl -u seeday -f
journalctl -u cloudflared -f
tail -f /var/log/nginx/error.log
```
