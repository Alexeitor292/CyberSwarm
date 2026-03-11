# CyberSwarm Production Deployment (Proxmox LXC + Docker + Nginx + Cloudflare Tunnel)

This runbook assumes:
- Proxmox VE host is available.
- You will run the app in a Debian 12 LXC container.
- You want Cloudflare Tunnel as the public entrypoint.

## 1. Create the LXC container in Proxmox

Use Proxmox UI (recommended) or CLI.

Minimum sizing:
- 2 vCPU
- 2 GB RAM
- 12 GB disk

Recommended LXC settings:
- Unprivileged: enabled
- Features: `nesting=1,keyctl=1`
- Start at boot: enabled

If created already, set features from Proxmox host:

```bash
pct set <CTID> -features nesting=1,keyctl=1
```

Reboot container:

```bash
pct reboot <CTID>
```

## 2. Install Docker inside the LXC

Enter container shell:

```bash
pct enter <CTID>
```

Install prerequisites:

```bash
apt update
apt install -y ca-certificates curl gnupg git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
```

## 3. Clone project and prepare production env

```bash
cd /opt
git clone <YOUR_REPO_URL> cyberswarm
cd /opt/cyberswarm
cp deploy/.env.production.example deploy/.env.production
```

Edit env file:

```bash
nano deploy/.env.production
```

Set:
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_ADMIN_EMAILS`
- `CLOUDFLARE_TUNNEL_TOKEN` (if using tunnel profile)
- `REVERSE_PROXY_BIND` (default `127.0.0.1:8081` is recommended with tunnel)

Important:
- `VITE_*` variables are build-time variables for Vite.
- If you change `VITE_*`, rebuild image (deploy script already does this).

## 4. First production deploy

Make scripts executable:

```bash
chmod +x deploy/scripts/deploy-prod.sh deploy/scripts/update-prod.sh
```

Deploy with Cloudflare tunnel enabled:

```bash
USE_TUNNEL=true ./deploy/scripts/deploy-prod.sh
```

Deploy without tunnel (local-only reverse proxy):

```bash
USE_TUNNEL=false ./deploy/scripts/deploy-prod.sh
```

Check status:

```bash
docker compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml ps
docker logs cyberswarm-proxy --tail 100
docker logs cyberswarm-app --tail 100
docker logs cyberswarm-api --tail 100
```

## 5. Configure Cloudflare Tunnel

In Cloudflare Zero Trust:

1. Create a Tunnel.
2. Select Docker connector and copy tunnel token.
3. Put token into `deploy/.env.production` as `CLOUDFLARE_TUNNEL_TOKEN=...`.
4. Add Public Hostname:
   - Hostname: `cyberswarmsac.com`
   - Service Type: `HTTP`
   - URL: `http://reverse-proxy:80`
5. Add second hostname for `www` if needed:
   - `www.cyberswarmsac.com` -> `http://reverse-proxy:80`

Then redeploy:

```bash
USE_TUNNEL=true ./deploy/scripts/deploy-prod.sh
```

Notes:
- With tunnel, you do not need inbound port-forwarding on your router/firewall.
- Keep `REVERSE_PROXY_BIND=127.0.0.1:8081` to avoid exposing service directly.

## 6. Reverse proxy behavior

`deploy/nginx/reverse-proxy.conf` handles:
- request forwarding to app container
- request forwarding to API container for `/api/*`
- forwarded headers

`deploy/nginx/app.conf` handles:
- static assets
- SPA fallback so routes like `/admin` work (`try_files ... /index.html`)

## 7. Updates

```bash
cd /opt/cyberswarm
USE_TUNNEL=true ./deploy/scripts/update-prod.sh
```

## 8. Rollback (quick)

If update fails and previous image exists:

```bash
docker image ls | head -n 20
docker tag <previous_image_id> cyberswarm-app:prod
USE_TUNNEL=true ./deploy/scripts/deploy-prod.sh
```

## 9. Operational caveat

Admin content is stored server-side by the `api` container in Docker volume `cyberswarm_data`.
This means edits are shared across devices/users once saved.
