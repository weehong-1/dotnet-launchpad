import React, {type ReactNode} from 'react';
import CodeBlock from '@theme/CodeBlock';
import Admonition from '@theme/Admonition';
import {useProjects} from '@site/src/lib/project';
import {useLocale, useStrings} from '@site/src/lib/i18n';

type Env = 'SIT' | 'Production';
/** `auditing: true` marks a block that exists only with Auditing; other blocks select their lines with @@ markers. */
type Block = {title: string; language: string; code: string; note?: string; auditing?: boolean};

const zh = (locale: string) => locale === 'zh-Hans';

function vmSetup(env: Env, locale: string): Block[] {
  const z = zh(locale);
  const host = env === 'SIT' ? 'sit' : 'prod';
  return [
    {
      title: z ? '1. 把部署范本复制到 VM（在你的电脑上执行）' : '1. Copy the deployment templates to the VM (on your machine)',
      language: 'bash',
      code: `# ${z ? '在 repo 根目录执行' : 'From the repository root'}\nscp -r deploy <user>@<${host}-vm>:/tmp/productname-deploy`,
    },
    {
      title: z ? '2. 连线到 VM（之后的代码块都在 VM 上执行）' : '2. Connect to the VM (the following blocks run on the VM)',
      language: 'bash',
      code: `ssh <user>@<${host}-vm>`,
    },
    {
      title: z ? '3. .NET 原生依赖与 PostgreSQL 客户端（Ubuntu 24.04 LTS）' : '3. .NET native dependencies and the PostgreSQL client (Ubuntu 24.04 LTS)',
      language: 'bash',
      code: [
        `# ${z ? 'self-contained 发布已含 .NET runtime，但仍需要这些系统函式库（ICU、OpenSSL 等）' : 'Self-contained publishing includes the .NET runtime but still needs these system libraries (ICU, OpenSSL and others)'}`,
        `[ "$(uname -m)" = x86_64 ] && echo "x86_64 OK" || echo "STOP: ${z ? 'CI 只发布 linux-x64 产物，这台 VM 不是 x86-64' : 'CI publishes linux-x64 artifacts only; this VM is not x86-64'}"`,
        'sudo apt update',
        'sudo apt install -y ca-certificates libc6 libgcc-s1 libicu74 liblttng-ust1t64 libssl3t64 libstdc++6 libunwind8 zlib1g',
        `# ${z ? '部署时用来连线数据库' : 'Used during deployment to reach the database'}`,
        'sudo apt install -y postgresql-client',
      ].join('\n'),
    },
    {
      title: z ? '4. 时区、服务帐号与目录' : '4. Time zone, service account and directories',
      language: 'bash',
      code: [
        'sudo timedatectl set-timezone UTC',
        `# ${z ? '帐号必须由这一步新建：已存在的帐号（即使不能登入）可能属于其他服务。显示 STOP 时不要继续' : 'The account must be created here: an existing account, even one that cannot log in, may belong to another service. Do not continue on STOP'}`,
        'CREATED=""; sudo useradd --system --no-create-home --shell /usr/sbin/nologin productname && CREATED=yes',
        `[ "$CREATED" = yes ] && [ "$(id -u productname)" != 0 ] && echo "${z ? '服务帐号已建立' : 'Service account created'}" || echo "STOP: ${z ? '无法新建 productname 帐号（已存在？）。若它是本步骤先前执行时建立的，确认 /opt/productname 属于它后再继续；否则换一个简短名称' : 'could not create the productname account (does it exist?). Continue only if an earlier run of this step created it and /opt/productname belongs to it; otherwise choose another Short Name'}"`,
        'sudo install -d -o productname -g productname /opt/productname /opt/productname/releases',
        'sudo install -d -o productname -g productname /var/log/productname /var/log/productname/api',
        'sudo install -d -o productname -g productname /var/log/productname/worker  # @@worker',
        'sudo install -d -m 755 /etc/productname',
      ].join('\n'),
    },
    {
      title: z ? '5. 环境变量文件（拥有者 root，权限 600）' : '5. Environment files (owner root, mode 600)',
      language: 'bash',
      code: [
        'sudo install -m 600 -o root -g root /tmp/productname-deploy/env/api.env.example /etc/productname/api.env',
        'sudo install -m 600 -o root -g root /tmp/productname-deploy/env/worker.env.example /etc/productname/worker.env  # @@worker',
        ...(env === 'SIT'
          ? [
              `# ${z ? '环境名称必须正好是 SIT（区分大小写，见 8.8）' : 'The environment name must be exactly SIT (case sensitive, see 8.8)'}`,
              "sudo sed -i 's/^ASPNETCORE_ENVIRONMENT=.*/ASPNETCORE_ENVIRONMENT=SIT/' /etc/productname/api.env",
              "sudo sed -i 's/^DOTNET_ENVIRONMENT=.*/DOTNET_ENVIRONMENT=SIT/' /etc/productname/worker.env  # @@worker",
            ]
          : []),
        `# ${z ? '填入此环境的连接字串（应用程序帐号）、license key、Authority、Audience、CORS 与 Seq 设定' : "Fill in this environment's connection strings (application account), license keys, Authority, Audience, CORS and Seq settings"}`,
        'sudoedit /etc/productname/api.env',
        'sudoedit /etc/productname/worker.env  # @@worker',
      ].join('\n'),
    },
    {
      title: z ? '6. systemd 服务' : '6. systemd services',
      language: 'bash',
      code: [
        'sudo cp /tmp/productname-deploy/systemd/productname-api.service /etc/systemd/system/',
        'sudo cp /tmp/productname-deploy/systemd/productname-worker.service /etc/systemd/system/  # @@worker',
        'sudo systemctl daemon-reload',
        'sudo systemctl enable productname-api',
        'sudo systemctl enable productname-worker  # @@worker',
      ].join('\n'),
      note: z ? '服务在首次部署建立符号链接之后才会启动（步骤 4.4 / 4.7）。' : 'The services start only after the first deployment creates the symbolic links (step 4.4 / 4.7).',
    },
    {
      title: z ? '7. Nginx 与 HTTPS 证书' : '7. Nginx and the HTTPS certificate',
      language: 'bash',
      code: [
        `API_DOMAIN=api.example.com   # ${z ? `改成 ${env} 的 Api 域名` : `change to the ${env} Api domain`}`,
        'sudo apt install -y nginx certbot python3-certbot-nginx',
        `# ${z ? '续期后重新载入 Nginx，才会使用新证书' : 'Reload Nginx after each renewal so it serves the new certificate'}`,
        'sudo certbot certonly --nginx --deploy-hook "systemctl reload nginx" -d "$API_DOMAIN"',
        'sudo cp /tmp/productname-deploy/nginx/productname-api.conf /etc/nginx/sites-available/',
        'sudo sed -i "s/api\\.example\\.com/$API_DOMAIN/g" /etc/nginx/sites-available/productname-api.conf',
        'sudo ln -s /etc/nginx/sites-available/productname-api.conf /etc/nginx/sites-enabled/',
        'sudo rm -f /etc/nginx/sites-enabled/default',
        'sudo nginx -t && sudo systemctl reload nginx',
      ].join('\n'),
    },
    {
      title: z ? '8. journald 上限与防火墙' : '8. journald cap and firewall',
      language: 'bash',
      code: [
        'sudo mkdir -p /etc/systemd/journald.conf.d',
        "printf '[Journal]\\nSystemMaxUse=1G\\n' | sudo tee /etc/systemd/journald.conf.d/size.conf >/dev/null",
        'sudo systemctl restart systemd-journald',
        'sudo ufw allow OpenSSH',
        "sudo ufw allow 'Nginx Full'",
        'sudo ufw --force enable',
      ].join('\n'),
    },
    {
      title: z ? `9. 从 VM 检查 ${env} 的后端服务` : `9. Check the ${env} backing services from the VM`,
      language: 'bash',
      code: [
        `# ${z ? '数据库：会提示输入管理员密码，应印出 PostgreSQL 版本' : 'Database: prompts for the admin password and should print the PostgreSQL version'}`,
        'psql "host=<db-host> port=5432 dbname=postgres user=<admin user> sslmode=require" -Atc "select version()"',
        `# ${z ? 'Broker：AMQPS 端口必须能以 TLS 连上' : 'Broker: the AMQPS port must accept a TLS connection'}`,
        'timeout 10 openssl s_client -connect <broker-host>:5671 -brief </dev/null 2>&1 | head -3',
        `# ${z ? 'Seq：应返回 healthy' : 'Seq: should answer healthy'}`,
        'curl -fsS "https://<seq-domain>/health"',
      ].join('\n'),
      note: z ? '任何一项失败，先回到上一个步骤修正（防火墙、允许的来源 IP、DNS）再继续。' : 'If any check fails, fix it in the previous step (firewall, allowed source IPs, DNS) before continuing.',
    },
    {
      title: z ? '10. 数据库帐号（以管理员帐号执行 psql）' : '10. Database accounts (psql as the admin user)',
      language: 'sql',
      code: [
        `-- ${z ? `从 VM 连线：psql "host=<db-host> port=5432 dbname=postgres user=<管理员> sslmode=require"` : `From the VM: psql "host=<db-host> port=5432 dbname=postgres user=<admin user> sslmode=require"`}`,
        `-- ${z ? `${env} 数据库；密码以 \\password 输入，不会留在历史纪录中` : `${env} database; \\password prompts, so passwords stay out of history`}`,
        'CREATE ROLE "productname_owner" LOGIN;',
        'CREATE ROLE "productname_app" LOGIN;',
        '\\password "productname_owner"',
        '\\password "productname_app"',
        `-- ${z ? 'PostgreSQL 16 起，非超级用户的管理员必须是 owner 角色的成员，才能把数据库交给它' : 'Since PostgreSQL 16 a non-superuser admin must be a member of the owner role to give it a database'}`,
        'GRANT "productname_owner" TO CURRENT_USER;',
        'CREATE DATABASE "productname" OWNER "productname_owner";',
        `-- ${z ? '以 owner 身分连线执行授权（会提示输入 owner 密码）；托管数据库的管理员通常不是超级用户' : 'Grant as the owner (psql prompts for the owner password); a managed database\'s admin is usually not a superuser'}`,
        '\\connect "dbname=productname user=productname_owner"',
        'GRANT USAGE ON SCHEMA public TO "productname_app";',
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "productname_app";',
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "productname_app";',
      ].join('\n'),
      note: z
        ? 'migration 以 owner 帐号执行；应用程序以 app 帐号连线，只能读写数据、不能改结构（8.11）。使用云端托管数据库时，在其控制台建立相同的两个帐号。'
        : 'Migrations run as the owner; the application connects as the app account, which can read and write data but not change the schema (8.11). With a managed cloud database, create the same two accounts in its console.',
    },
  ];
}

function deploy(env: Env, locale: string, delivery: string | null): Block[] {
  const z = zh(locale);
  const host = env === 'SIT' ? 'sit' : 'prod';
  const blocks: Block[] = [
    {
      title: z ? '1. 取得 CI 产物并复制到 VM（在你的电脑上执行）' : '1. Get the CI artifact and copy it to the VM (on your machine)',
      language: 'bash',
      code: [
        'gh run list --workflow ci --branch main --limit 5',
        `RUN=<run-id>   # ${z ? '上面列表中要部署的那次成功运行' : 'the successful run to deploy, from the list above'}`,
        'VERSION=$(gh run view "$RUN" --json headSha -q .headSha)',
        `# ${z ? '每次都下载到全新的暂存目录，并先清掉 VM 上同名的暂存目录，重试时不会读到旧文件' : 'Download into a fresh directory and clear the VM staging directory first, so a retry never reads older files'}`,
        'DL=$(mktemp -d)',
        `gh run download "$RUN" --name "productname-$VERSION" --dir "$DL"   # ${z ? '产物解压后是 api/、worker/、migrations/' : 'extracts api/, worker/, migrations/'}`,
        `ssh "<user>@<${host}-vm>" "rm -rf /tmp/productname-$VERSION"`,
        `scp -r "$DL" "<user>@<${host}-vm>:/tmp/productname-$VERSION"`,
        'rm -rf "$DL"',
        'echo "$VERSION"   # ' + (z ? '第 2 步要用这个值' : 'block 2 needs this value'),
      ].join('\n'),
      note:
        delivery === 'tailscale' || delivery === 'other'
          ? z
            ? '你在步骤 0.2 选择了其他交付方式：以你的实现取代这一段，其余步骤不变。'
            : 'You chose another delivery method in step 0.2: your own mechanism replaces this block; the remaining steps stay the same.'
          : undefined,
    },
    {
      title: z ? '2. 连线到 VM（之后的代码块都在 VM 上执行）' : '2. Connect to the VM (the following blocks run on the VM)',
      language: 'bash',
      code: `ssh <user>@<${host}-vm>`,
    },
    {
      title: z ? '3. 放入新的版本目录' : '3. Put the release in a new version directory',
      language: 'bash',
      code: [
        `VERSION=<sha>   # ${z ? '第 1 步最后印出的值' : 'the value block 1 printed'}`,
        'STAGE=/tmp/productname-$VERSION',
        'R=/opt/productname/releases/$VERSION',
        `# ${z ? '版本目录建立后就不再修改；中断后重试会从头重建（正在运行的版本除外）。任何一步失败，后面的步骤都不会执行，也不会切换' : 'A release directory is never changed once live; a retry after an interruption rebuilds it. If any step fails, the rest is skipped and nothing is switched'}`,
        'PREPARED=""; OK=1',
        'if [ "$(readlink /opt/productname/api)" = "$R/api" ]; then',
        `  echo "$VERSION ${z ? '已经在运行，略过复制' : 'is already live; not copying'}"; PREPARED="$VERSION"`,
        'else',
        '  test -f "$STAGE/api/ProductName.Api" || OK=0',
        '  test -f "$STAGE/worker/ProductName.Worker" || OK=0  # @@worker',
        '  test -f "$STAGE/migrations/efbundle" || OK=0',
        '  [ "$OK" = 1 ] && { sudo rm -rf "$R" && sudo install -d -o productname -g productname "$R"; } || OK=0',
        '  [ "$OK" = 1 ] && sudo cp -a "$STAGE/api" "$R/api" || OK=0',
        '  [ "$OK" = 1 ] && sudo cp -a "$STAGE/worker" "$R/worker" || OK=0  # @@worker',
        `  # ${z ? 'GitHub Actions 产物不保留执行权限' : 'GitHub Actions artifacts drop the executable bit'}`,
        '  [ "$OK" = 1 ] && sudo chmod +x "$R/api/ProductName.Api" || OK=0',
        '  [ "$OK" = 1 ] && sudo chmod +x "$R/worker/ProductName.Worker" || OK=0  # @@worker',
        '  [ "$OK" = 1 ] && sudo chown -R productname:productname "$R" || OK=0',
        '  [ "$OK" = 1 ] && PREPARED="$VERSION"',
        'fi',
        `[ "$PREPARED" = "$VERSION" ] && echo "${z ? '版本目录已就绪' : 'Release prepared'}" || echo "${z ? '准备失败：停在这里，现行版本不受影响' : 'Preparation FAILED: stop here; the live release is untouched'}"`,
      ].join('\n'),
    },
    {
      title: z ? '4. 以 owner 帐号执行 migration bundle' : '4. Run the migration bundle with the owner account',
      language: 'bash',
      code: [
        `# ${z ? '连接字串以不回显的方式读入，并经由环境变量传给 bundle：不会出现在 shell 历史或其他帐号可见的程序参数中' : 'The connection string is read without echo and passed through the environment: it never appears in shell history or in process arguments other accounts can see'}`,
        'chmod +x "$STAGE/migrations/efbundle"',
        'read -rs OWNER_CONNECTION   # Host=...;Port=5432;Database=productname;Username=productname_owner;Password=...',
        'MIGRATED=""',
        '[ "${PREPARED:-}" = "$VERSION" ] && ConnectionStrings__Database="$OWNER_CONNECTION" "$STAGE/migrations/efbundle" && MIGRATED="$VERSION"; unset OWNER_CONNECTION',
        `[ "$MIGRATED" = "$VERSION" ] && echo "${z ? 'migration 成功' : 'Migration succeeded'}" || echo "${z ? 'migration 失败：停在这里，不要执行第 6 步' : 'Migration FAILED: stop here and do not run block 6'}"`,
      ].join('\n'),
      note: z
        ? '每个 migration 都必须向后兼容：删除或改名栏位要分三次部署（8.21）。'
        : 'Every migration must be backward compatible: dropping or renaming a column takes three deployments (8.21).',
    },
    {
      title: z ? '5. 锁定审计表（每次部署都执行，可重复执行）' : '5. Lock the audit tables (every deployment; safe to repeat)',
      language: 'bash',
      auditing: true,
      code: [
        `# ${z ? '以 owner 帐号连线（psql 会提示输入密码）。ON_ERROR_STOP 让任何错误都使 psql 失败；最后的检查确认应用帐号已无法修改审计表' : 'Connect as the owner (psql prompts for the password). ON_ERROR_STOP makes any error fail psql; the final check proves the application account can no longer change the audit tables'}`,
        'LOCKED=""',
        `[ "\${MIGRATED:-}" = "$VERSION" ] && psql -X -v ON_ERROR_STOP=1 "host=<db-host> port=5432 dbname=productname user=productname_owner" <<'SQL' && LOCKED="$VERSION"`,
        'REVOKE UPDATE, DELETE, TRUNCATE ON "AuditTrails", "OperationAudits" FROM "productname_app";  -- @@auditing',
        'DO $$',
        'BEGIN',
        `  IF has_table_privilege('productname_app', '"AuditTrails"', 'UPDATE, DELETE, TRUNCATE')`,
        `     OR has_table_privilege('productname_app', '"OperationAudits"', 'UPDATE, DELETE, TRUNCATE') THEN`,
        `    RAISE EXCEPTION 'productname_app can still change the audit tables';`,
        '  END IF;',
        'END $$;',
        'SQL',
        `[ "$LOCKED" = "$VERSION" ] && echo "${z ? '审计表已锁定' : 'Audit tables locked'}" || echo "${z ? '锁定失败：停在这里，不要执行第 6 步' : 'Lock FAILED: stop here and do not run block 6'}"`,
      ].join('\n'),
    },
    {
      title: z ? '6. 切换符号链接并重新启动' : '6. Switch the symbolic links and restart',
      language: 'bash',
      code: [
        `# ${z ? '只有第 4 步（以及启用审计时的第 5 步）对这个版本成功时才切换' : 'Switch only when block 4 (and block 5 with auditing) succeeded for this version'}`,
        'if [ "${MIGRATED:-}" = "$VERSION" ] && [ "${LOCKED:-}" = "$VERSION" ]; then  # @@auditing',
        'if [ "${MIGRATED:-}" = "$VERSION" ]; then  # @@!auditing',
        '  sudo ln -sfn "$R/api" /opt/productname/api',
        '  sudo ln -sfn "$R/worker" /opt/productname/worker  # @@worker',
        '  sudo systemctl restart productname-api',
        '  sudo systemctl restart productname-worker  # @@worker',
        'else',
        `  echo "${z ? '前面的步骤没有对' : 'An earlier block did not succeed for'} $VERSION${z ? ' 成功，不切换' : '; not switching'}"`,
        'fi',
      ].join('\n'),
    },
    {
      title: z ? '7. 验证' : '7. Verify',
      language: 'bash',
      code: [
        `API_DOMAIN=api.example.com   # ${z ? `改成 ${env} 的 Api 域名` : `change to the ${env} Api domain`}`,
        'curl -fsS "https://$API_DOMAIN/health"',
        `TOKEN=<access token>   # ${z ? `${env} 身份提供者为 Api audience 签发的 token` : `issued for the Api audience by the ${env} identity provider`}`,
        `curl -s -o /dev/null -w '%{http_code}\\n' -H "Authorization: Bearer $TOKEN" "https://$API_DOMAIN/anything"   # ${z ? '404 = token 被接受；401 = Authority/Audience 设定不符' : '404 = token accepted; 401 = Authority/Audience mismatch'}`,
        'sudo journalctl -u productname-api -n 50 --no-pager',
        'sudo journalctl -u productname-worker -n 50 --no-pager  # @@worker',
      ].join('\n'),
      note: z ? '再到 Seq 确认没有新的 Error。' : 'Then check Seq for new errors.',
    },
    {
      title: z ? '回滚' : 'Rollback',
      language: 'bash',
      code: [
        `PREVIOUS=<version>   # ${z ? '上一个版本目录名称' : 'the previous version directory'}`,
        'sudo ln -sfn "/opt/productname/releases/$PREVIOUS/api" /opt/productname/api',
        'sudo ln -sfn "/opt/productname/releases/$PREVIOUS/worker" /opt/productname/worker  # @@worker',
        'sudo systemctl restart productname-api',
        'sudo systemctl restart productname-worker  # @@worker',
      ].join('\n'),
      note: z ? 'migration 不会自动回滚，所以必须向后兼容。' : 'Migrations are not rolled back, which is why they must be backward compatible.',
    },
  ];
  return blocks;
}

function backingServices(env: Env, locale: string): Block[] {
  const z = zh(locale);
  const prod = env === 'Production';
  return [
    {
      title: z ? '1. 托管 PostgreSQL' : '1. Managed PostgreSQL',
      language: 'text',
      code: [
        z ? `在云端供应商（例如 DigitalOcean Managed Databases、Azure Database for PostgreSQL、Amazon RDS）建立 ${env} 专用的数据库：` : `In your cloud provider (for example DigitalOcean Managed Databases, Azure Database for PostgreSQL or Amazon RDS), create a database cluster for ${env} only:`,
        z ? '- 引擎：PostgreSQL 17（与本地 docker-compose.yml 相同）' : '- Engine: PostgreSQL 17 (the same as the local docker-compose.yml)',
        z ? `- 区域：与 ${env} VM 相同` : `- Region: the same as the ${env} VM`,
        z ? '- 要求 TLS 连线' : '- Require TLS connections',
        z ? `- 连线来源：只允许 ${env} VM 的 IP（trusted sources / firewall）` : `- Allowed sources: only the ${env} VM's IP (trusted sources / firewall)`,
        ...(prod ? [z ? '- 开启自动备份与时间点还原（point in time restore）' : '- Turn on automated backups and point in time restore'] : []),
        z ? '记下 host、port（通常是 5432）与管理员帐号；管理员密码存入密码管理器。应用程序不使用管理员帐号：步骤中的 VM 设定会另外建立 owner 与 app 帐号。' : 'Note the host, the port (usually 5432) and the admin user; keep the admin password in your password manager. The application never uses the admin user: the VM setup step creates separate owner and app accounts.',
      ].join('\n'),
    },
    {
      title: z ? '2. 托管 RabbitMQ' : '2. Managed RabbitMQ',
      language: 'text',
      code: [
        z ? `在 RabbitMQ 托管服务（例如 CloudAMQP、Amazon MQ for RabbitMQ）建立 ${env} 专用的实例，版本 RabbitMQ 3.13 或 4.x。` : `In a hosted RabbitMQ service (for example CloudAMQP or Amazon MQ for RabbitMQ), create an instance for ${env} only, RabbitMQ 3.13 or 4.x.`,
        z ? '复制它的 AMQPS URL，格式为 amqps://<user>:<password>@<host>/<vhost>，稍后填入 ConnectionStrings__MessageBroker。' : 'Copy its AMQPS URL, shaped amqps://<user>:<password>@<host>/<vhost>; it goes into ConnectionStrings__MessageBroker later.',
        z ? `若服务支持来源 IP 限制，只允许 ${env} VM 的 IP。` : `If the service supports source IP restrictions, allow only the ${env} VM's IP.`,
      ].join('\n'),
    },
    {
      title: z ? `3. Seq：建立独立 VM（x86-64，Ubuntu 24.04 LTS），以 SSH 连线后执行` : `3. Seq: on its own VM (x86-64, Ubuntu 24.04 LTS), over SSH`,
      language: 'bash',
      code: [
        'sudo apt update && sudo apt install -y docker.io nginx certbot python3-certbot-nginx',
        `# ${z ? '管理员密码以不回显方式读入，只把杂凑值交给 Seq' : 'The admin password is read without echo; only its hash is given to Seq'}`,
        'IFS= read -rs SEQ_ADMIN_PASSWORD',
        'sudo docker pull datalust/seq:latest',
        'SEQ_HASH=$(printf \'%s\' "$SEQ_ADMIN_PASSWORD" | sudo docker run --rm -i datalust/seq:latest config hash | tail -1); unset SEQ_ADMIN_PASSWORD',
        'sudo docker run -d --name seq --restart unless-stopped -e ACCEPT_EULA=Y -e SEQ_FIRSTRUN_ADMINPASSWORDHASH="$SEQ_HASH" -v /var/lib/seq:/data -p 127.0.0.1:5341:80 datalust/seq:latest',
        'unset SEQ_HASH',
        `SEQ_DOMAIN=seq.example.com   # ${z ? `改成 ${env} Seq 的域名` : `change to the ${env} Seq domain`}`,
        'sudo certbot certonly --nginx --deploy-hook "systemctl reload nginx" -d "$SEQ_DOMAIN"',
        "sudo tee /etc/nginx/sites-available/seq.conf >/dev/null <<NGINX",
        'server { listen 80; server_name $SEQ_DOMAIN; return 301 https://\\$host\\$request_uri; }',
        'server {',
        '    listen 443 ssl;',
        '    server_name $SEQ_DOMAIN;',
        '    ssl_certificate     /etc/letsencrypt/live/$SEQ_DOMAIN/fullchain.pem;',
        '    ssl_certificate_key /etc/letsencrypt/live/$SEQ_DOMAIN/privkey.pem;',
        '    client_max_body_size 20m;',
        '    location / { proxy_pass http://127.0.0.1:5341; proxy_set_header Host \\$host; proxy_set_header X-Forwarded-Proto https; }',
        '}',
        'NGINX',
        'sudo ln -sf /etc/nginx/sites-available/seq.conf /etc/nginx/sites-enabled/seq.conf',
        'sudo rm -f /etc/nginx/sites-enabled/default',
        'sudo nginx -t && sudo systemctl reload nginx',
        'sudo ufw allow OpenSSH && sudo ufw allow \'Nginx Full\' && sudo ufw --force enable',
        'curl -fsS "https://$SEQ_DOMAIN/health"   # {"status":"healthy",...}',
      ].join('\n'),
      note: z
        ? '在 Seq 网页（https://<seq-domain>）以 admin 登入，到 Settings > API Keys 为 Api（与 Worker）各建立一个具 Ingest 权限的 key，填入环境变量文件的 Serilog__WriteTo__Seq__Args__apiKey。Seq 单一用户免费，多用户需授权（Reference 8.9）。'
        : 'Sign in to Seq (https://<seq-domain>) as admin, then under Settings > API Keys create one key with Ingest permission for the Api (and one for the Worker); they go into Serilog__WriteTo__Seq__Args__apiKey in the env files. Seq is free for a single user; more users need a license (Reference 8.9).',
    },
  ];
}

function Blocks({blocks, auditing}: {blocks: Block[]; auditing: boolean}): ReactNode {
  return (
    <>
      {blocks
        .filter((b) => auditing || !b.auditing)
        .map((b) => (
          <div key={b.title}>
            <h3>{b.title}</h3>
            <CodeBlock language={b.language}>{b.code}</CodeBlock>
            {b.note && <p>{b.note}</p>}
          </div>
        ))}
    </>
  );
}

export function VmSetup({env}: {env: Env}): ReactNode {
  const {active} = useProjects();
  const locale = useLocale();
  return <Blocks blocks={vmSetup(env, locale)} auditing={!active || active.auditing} />;
}

export function BackingServices({env}: {env: Env}): ReactNode {
  const locale = useLocale();
  return <Blocks blocks={backingServices(env, locale)} auditing />;
}

export function Deploy({env}: {env: Env}): ReactNode {
  const {active} = useProjects();
  const locale = useLocale();
  const t = useStrings();
  return (
    <>
      {active && (active.delivery === 'tailscale' || active.delivery === 'other') && (
        <Admonition type="caution">{t.needsOwnWork}</Admonition>
      )}
      <Blocks blocks={deploy(env, locale, active?.delivery ?? null)} auditing={!active || active.auditing} />
    </>
  );
}
