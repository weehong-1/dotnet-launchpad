import type {Progress, Project} from '@site/src/lib/project';

/** Bilingual text. */
export type Text = {en: string; zh: string};

export type Check = {
  id: string;
  text: Text;
  /** Only counts (and shows) for projects where this holds. */
  when?: (p: Project) => boolean;
};

export type Step = {
  /** Stable slug: also the page id under /docs/setup/ and the Progress key. Never rename. */
  id: string;
  num: string;
  title: Text;
  when?: (p: Project) => boolean;
  checks: Check[];
};

export type Phase = {id: string; num: string; title: Text; steps: Step[]};

const worker = (p: Project) => p.worker;
const noWorker = (p: Project) => !p.worker;
const auditing = (p: Project) => p.auditing;
const noAuditing = (p: Project) => !p.auditing;
const sonar = (p: Project) => p.sonar;
const qodana = (p: Project) => p.qodana;
const ownWork = (p: Project) => p.apiVersioning === true || p.delivery === 'tailscale' || p.delivery === 'other';

export const PHASES: Phase[] = [
  {
    id: 'before',
    num: '0',
    title: {en: 'Before you start', zh: '开工前'},
    steps: [
      {
        id: 'project-settings',
        num: '0.1',
        title: {en: 'Fill in Project Settings', zh: '填写 Project Settings'},
        checks: [
          {id: 'names', text: {en: 'Project Name and Short Name are saved.', zh: '项目名称与简短名称已保存。'}},
          {id: 'optional', text: {en: 'Worker and Auditing are decided (Reference 7).', zh: 'Worker 与审计已决定（Reference 第 7 节）。'}},
        ],
      },
      {
        id: 'project-decisions',
        num: '0.2',
        title: {en: 'Make the Project Decisions', zh: '做出项目决策'},
        checks: [
          {id: 'recorded', text: {en: 'API versioning, SonarCloud, Qodana and the delivery method are recorded.', zh: 'API 版本控制、SonarCloud、Qodana 与交付方式都已记录。'}},
          {id: 'own-work', text: {en: 'Choices with no template code are on the project backlog.', zh: '模板没有代码的选择已列入项目待办。'}, when: ownWork},
        ],
      },
      {
        id: 'licenses',
        num: '0.3',
        title: {en: 'Confirm licenses', zh: '确认授权'},
        checks: [
          {id: 'shell', text: {en: 'Commands run in bash, or in zsh with `interactive_comments` on.', zh: '指令在 bash 中执行，或在已开启 `interactive_comments` 的 zsh 中执行。'}},
          {id: 'mediatr', text: {en: 'MediatR license confirmed for the organisation that owns the system, and the key obtained.', zh: '已按实际拥有系统的组织确认 MediatR 授权，并取得 license key。'}},
          {id: 'masstransit', text: {en: 'MassTransit v9 license (or discount) confirmed in writing, and the license obtained.', zh: 'MassTransit v9 授权（或折扣）已书面确认，并取得授权。'}},
          {id: 'seq', text: {en: 'Seq license terms checked for the number of users.', zh: '已按使用人数确认 Seq 授权条款。'}},
          {id: 'mt-path', text: {en: 'The MassTransit license file is outside any repository and `MT_LICENSE_PATH` is exported in your shell profile.', zh: 'MassTransit 授权文件放在任何 repo 之外，且 shell 设定档已 export `MT_LICENSE_PATH`。'}},
        ],
      },
      {
        id: 'local-environment',
        num: '0.4',
        title: {en: 'Prepare this machine', zh: '准备本机环境'},
        checks: [
          {id: 'sdk', text: {en: '.NET 10 SDK installed; its exact version noted for global.json.', zh: '已安装 .NET 10 SDK，并记下确切版本供 global.json 使用。'}},
          {id: 'docker', text: {en: 'Docker is running and `docker compose version` works.', zh: 'Docker 正在运行，`docker compose version` 可以执行。'}},
          {id: 'tools', text: {en: 'git, `jq` and the GitHub CLI (`gh`) are installed and `gh` is signed in.', zh: '已安装 git、`jq` 与 GitHub CLI（`gh`），且 `gh` 已登录。'}},
        ],
      },
      {
        id: 'identity-provider',
        num: '0.5',
        title: {en: 'Prepare the identity provider', zh: '准备身份提供者'},
        checks: [
          {id: 'registered', text: {en: 'The Api is registered in the identity provider for Development, and its Authority and Audience are noted.', zh: 'Api 已在身份提供者中为 Development 注册，并记下 Authority 与 Audience。'}},
          {id: 'discovery', text: {en: '`<Authority>/.well-known/openid-configuration` opens.', zh: '`<Authority>/.well-known/openid-configuration` 可以打开。'}},
          {id: 'token', text: {en: 'A test client gets an access token for the Api audience (a JWT starting with `eyJ`).', zh: '测试客户端可以取得 Api audience 的 access token（以 `eyJ` 开头的 JWT）。'}},
        ],
      },
    ],
  },
  {
    id: 'solution',
    num: '1',
    title: {en: 'Create the solution', zh: '建立 solution'},
    steps: [
      {
        id: 'repository',
        num: '1.1',
        title: {en: 'Create the repository', zh: '建立 repo'},
        checks: [
          {id: 'folder', text: {en: 'Repository folder named after the Short Name, with `git init -b main` done.', zh: '以简短名称命名的 repo 文件夹已建立，并已执行 `git init -b main`。'}},
          {id: 'template', text: {en: '`docs/TEMPLATE.md` downloaded into the repository.', zh: '`docs/TEMPLATE.md` 已下载到 repo 中。'}},
          {id: 'instructions', text: {en: 'Route chosen. On the AI route, the common rules with Project Settings filled in are saved in the agent instruction file; the Script and Manual routes need nothing here.', zh: '已选定路线。AI 路线：已填好项目设定的共通规则保存到 AI 的项目指示档；脚本与手动路线在这里不需要做任何事。'}},
        ],
      },
      {
        id: 'empty-solution',
        num: '1.2',
        title: {en: 'Create the empty solution and project references', zh: '建立空 solution 与项目引用'},
        checks: [
          {id: 'projects', text: {en: '`dotnet sln list` shows every src and tests project from Reference 5.', zh: '`dotnet sln list` 列出 Reference 第 5 节的所有 src 与 tests 项目。'}},
          {id: 'references', text: {en: 'Project references match the Reference 12.2 table.', zh: '项目引用与 Reference 12.2 的表格一致。'}},
          {id: 'exe', text: {en: 'Every test project sets `<OutputType>Exe</OutputType>`.', zh: '每个测试项目都设定了 `<OutputType>Exe</OutputType>`。'}},
          {id: 'secrets', text: {en: 'User Secrets initialised in the Api.', zh: 'Api 已初始化 User Secrets。'}},
          {id: 'secrets-worker', text: {en: 'User Secrets initialised in the Worker.', zh: 'Worker 已初始化 User Secrets。'}, when: worker},
        ],
      },
      {
        id: 'solution-files',
        num: '1.3',
        title: {en: 'Add the solution level files', zh: '加入解决方案层级文件'},
        checks: [
          {id: 'root-files', text: {en: 'Directory.Build.props, Directory.Packages.props, global.json (your SDK version), .editorconfig, docker-compose.yml and BannedSymbols.txt are in place.', zh: 'Directory.Build.props、Directory.Packages.props、global.json（本机 SDK 版本）、.editorconfig、docker-compose.yml、BannedSymbols.txt 都已就位。'}},
          {id: 'deploy', text: {en: '`deploy/` holds the systemd, Nginx and env templates.', zh: '`deploy/` 内有 systemd、Nginx 与环境变量范本。'}},
          {id: 'ci', text: {en: '`.github/workflows/ci.yml` is in place.', zh: '`.github/workflows/ci.yml` 已就位。'}},
          {id: 'ci-sonar', text: {en: 'The SonarCloud job is in ci.yml.', zh: 'ci.yml 已加入 SonarCloud job。'}, when: sonar},
          {id: 'ci-qodana', text: {en: 'The Qodana job is in ci.yml and qodana.yaml is at the root.', zh: 'ci.yml 已加入 Qodana job，根目录有 qodana.yaml。'}, when: qodana},
          {id: 'packages', text: {en: 'NuGet packages referenced per 12.2, with versions only in Directory.Packages.props.', zh: 'NuGet 包按 12.2 引用，版本只写在 Directory.Packages.props。'}},
          {id: 'samples', text: {en: 'Template sample files deleted (Class1.cs, UnitTest1.cs, Worker.cs, WeatherForecast).', zh: '模板产生的范例文件已删除（Class1.cs、UnitTest1.cs、Worker.cs、WeatherForecast）。'}},
          {id: 'build', text: {en: '`dotnet build` has zero warnings and zero errors; `docker compose config` validates.', zh: '`dotnet build` 零警告零错误；`docker compose config` 验证通过。'}},
        ],
      },
    ],
  },
  {
    id: 'layers',
    num: '2',
    title: {en: 'Generate the layers', zh: '逐层生成'},
    steps: [
      {
        id: 'domain',
        num: '2.1',
        title: {en: 'Domain', zh: 'Domain'},
        checks: [
          {id: 'usings', text: {en: '`GlobalUsings.cs` from Reference 11.3 is in place.', zh: '已按 Reference 11.3 建立 `GlobalUsings.cs`。'}},
          {id: 'build', text: {en: '`dotnet build` has zero warnings and zero errors.', zh: '`dotnet build` 零警告零错误。'}},
          {id: 'deps', text: {en: 'Domain has no project references; its only NuGet package is MediatR.Contracts.', zh: 'Domain 没有任何项目引用，NuGet 包只有 MediatR.Contracts。'}},
          {id: 'factory', text: {en: '`IResultFactory.cs` sits next to `Result.cs` (13.11).', zh: '`IResultFactory.cs` 与 `Result.cs` 放在一起（13.11）。'}},
          {id: 'audit', text: {en: '`IAuditable` and `AuditIgnoreAttribute` exist (13.14, 13.15).', zh: '`IAuditable` 与 `AuditIgnoreAttribute` 已建立（13.14、13.15）。'}, when: auditing},
        ],
      },
      {
        id: 'application',
        num: '2.2',
        title: {en: 'Application', zh: 'Application'},
        checks: [
          {id: 'usings', text: {en: '`GlobalUsings.cs` from Reference 11.3 is in place.', zh: '已按 Reference 11.3 建立 `GlobalUsings.cs`。'}},
          {id: 'build', text: {en: '`dotnet build` has zero warnings and zero errors.', zh: '`dotnet build` 零警告零错误。'}},
          {id: 'deps', text: {en: 'Application references only Domain and does not reference MassTransit or Serilog.', zh: 'Application 只引用 Domain，没有引用 MassTransit 或 Serilog。'}},
          {id: 'order-audit', text: {en: 'Pipelines are registered in the order logging, operation audit, validation.', zh: '管线按日志、操作审计、验证的顺序注册。'}, when: auditing},
          {id: 'order', text: {en: 'Pipelines are registered in the order logging, validation.', zh: '管线按日志、验证的顺序注册。'}, when: noAuditing},
          {id: 'no-samples', text: {en: 'No sample Command, Query, Handler, Validator or DTO was created.', zh: '没有建立任何 Command、Query、Handler、Validator 或 DTO 范例。'}},
        ],
      },
      {
        id: 'infrastructure',
        num: '2.3',
        title: {en: 'Infrastructure', zh: 'Infrastructure'},
        checks: [
          {id: 'usings', text: {en: '`GlobalUsings.cs` from Reference 11.3 is in place.', zh: '已按 Reference 11.3 建立 `GlobalUsings.cs`。'}},
          {id: 'build', text: {en: '`dotnet build` has zero warnings and zero errors.', zh: '`dotnet build` 零警告零错误。'}},
          {id: 'framework', text: {en: 'The Infrastructure project has the `Microsoft.AspNetCore.App` framework reference.', zh: 'Infrastructure 项目有 `Microsoft.AspNetCore.App` framework reference。'}},
          {id: 'outbox-worker', text: {en: 'The Api keeps the check that disables Outbox delivery; the Worker delivers.', zh: 'Api 保留停用 Outbox 投递的判断，由 Worker 负责投递。'}, when: worker},
          {id: 'outbox-api', text: {en: 'The check that disables Outbox delivery is removed, so the Api delivers.', zh: '停用 Outbox 投递的判断已删除，由 Api 自行投递。'}, when: noWorker},
          {id: 'audit', text: {en: 'Audit files 15.9 to 15.14 exist, and `AuditTrailInterceptor` is last in `AddInterceptors`.', zh: '审计文件 15.9 至 15.14 已建立，`AuditTrailInterceptor` 是 `AddInterceptors` 中最后一个。'}, when: auditing},
          {id: 'nothing-extra', text: {en: 'No business entity configuration or repository was created (the Boilerplate audit configurations and the Script route\'s `InitialCreate` migration are expected).', zh: '没有建立任何业务实体配置或 Repository（Boilerplate 的审计配置与脚本路线的 `InitialCreate` migration 属于预期内容）。'}},
        ],
      },
      {
        id: 'api',
        num: '2.4',
        title: {en: 'Api and the first migration', zh: 'Api 与第一个 migration'},
        checks: [
          {id: 'usings', text: {en: '`GlobalUsings.cs` from Reference 11.3 is in place.', zh: '已按 Reference 11.3 建立 `GlobalUsings.cs`。'}},
          {id: 'build', text: {en: '`dotnet build` has zero warnings and zero errors.', zh: '`dotnet build` 零警告零错误。'}},
          {id: 'settings', text: {en: 'Four appsettings files; the database name is the Short Name, and the log path is `/var/log/<short name>/api/`.', zh: '四个 appsettings 文件已建立；数据库名称是简短名称，日志路径是 `/var/log/<简短名称>/api/`。'}},
          {id: 'program', text: {en: '`Program.cs` is replaced with 16.13, and launchSettings sets `ASPNETCORE_ENVIRONMENT` to Development.', zh: '`Program.cs` 已换成 16.13 的内容，launchSettings 的 `ASPNETCORE_ENVIRONMENT` 是 Development。'}},
          {id: 'migration', text: {en: 'The `InitialCreate` migration holds only the MassTransit Outbox and Inbox tables.', zh: '`InitialCreate` migration 只包含 MassTransit Outbox 与 Inbox 表。'}, when: noAuditing},
          {id: 'migration-audit', text: {en: 'The `InitialCreate` migration holds only the MassTransit Outbox and Inbox tables, plus AuditTrails and OperationAudits.', zh: '`InitialCreate` migration 只包含 MassTransit Outbox、Inbox 表，以及 AuditTrails 与 OperationAudits。'}, when: auditing},
        ],
      },
      {
        id: 'worker',
        num: '2.5',
        title: {en: 'Worker', zh: 'Worker'},
        when: worker,
        checks: [
          {id: 'usings', text: {en: '`GlobalUsings.cs` from Reference 11.3 is in place.', zh: '已按 Reference 11.3 建立 `GlobalUsings.cs`。'}},
          {id: 'build', text: {en: '`dotnet build` has zero warnings and zero errors.', zh: '`dotnet build` 零警告零错误。'}},
          {id: 'settings', text: {en: 'Four appsettings files without Cors, OpenApi, Migrations, Authentication and RateLimiting; `Application` is `<Project Name>.Worker`; the log path is `/var/log/<short name>/worker/`.', zh: '四个 appsettings 文件已移除 Cors、OpenApi、Migrations、Authentication、RateLimiting；`Application` 是 `<项目名称>.Worker`；日志路径是 `/var/log/<简短名称>/worker/`。'}},
          {id: 'program', text: {en: '`Program.cs` is replaced with 17.2, and launchSettings sets `DOTNET_ENVIRONMENT` to Development.', zh: '`Program.cs` 已换成 17.2 的内容，launchSettings 的 `DOTNET_ENVIRONMENT` 是 Development。'}},
        ],
      },
      {
        id: 'tests',
        num: '2.6',
        title: {en: 'Tests', zh: 'Tests'},
        checks: [
          {id: 'files', text: {en: 'Files 18.1 to 18.5 (including `ResultTests.cs` and `HealthCheckTests.cs`) and the four test `GlobalUsings.cs` files exist.', zh: '18.1 至 18.5 的文件（包括 `ResultTests.cs` 与 `HealthCheckTests.cs`）以及四个测试项目的 `GlobalUsings.cs` 都已建立。'}},
          {id: 'no-worker-const', text: {en: 'LayerTests has no Worker constant.', zh: 'LayerTests 没有 Worker 常数。'}, when: noWorker},
          {id: 'test', text: {en: '`dotnet test` passes, including the architecture, pipeline and integration tests (Docker running, `MT_LICENSE_PATH` set).', zh: '`dotnet test` 全部通过，包括架构、管线与整合测试（Docker 正在运行，已设定 `MT_LICENSE_PATH`）。'}},
        ],
      },
    ],
  },
  {
    id: 'local',
    num: '3',
    title: {en: 'Run it locally', zh: '本地跑通'},
    steps: [
      {
        id: 'local-services',
        num: '3.1',
        title: {en: 'Start local services and set secrets', zh: '启动本地服务并设定 secrets'},
        checks: [
          {id: 'compose', text: {en: '`docker compose ps` shows postgres, rabbitmq and seq running.', zh: '`docker compose ps` 显示 postgres、rabbitmq、seq 正在运行。'}},
          {id: 'uis', text: {en: 'The RabbitMQ UI (localhost:15672) and Seq (localhost:5341) open.', zh: 'RabbitMQ 管理界面（localhost:15672）与 Seq（localhost:5341）可以打开。'}},
          {id: 'mediatr', text: {en: 'The MediatR license key is in User Secrets for the Api.', zh: 'MediatR license key 已存入 Api 的 User Secrets。'}},
          {id: 'mediatr-worker', text: {en: 'The MediatR license key is in User Secrets for the Worker.', zh: 'MediatR license key 已存入 Worker 的 User Secrets。'}, when: worker},
          {id: 'masstransit', text: {en: '`echo $MT_LICENSE_PATH` prints the license file path in this terminal.', zh: '在这个终端中 `echo $MT_LICENSE_PATH` 会显示授权文件路径。'}},
          {id: 'auth', text: {en: '`Authentication:Authority` and `Authentication:Audience` are set for Development.', zh: 'Development 的 `Authentication:Authority` 与 `Authentication:Audience` 已设定。'}},
        ],
      },
      {
        id: 'run-locally',
        num: '3.2',
        title: {en: 'Run the Api and Worker', zh: '执行 Api 与 Worker'},
        checks: [
          {id: 'migrate', text: {en: 'The Api starts in Development and applies `InitialCreate` automatically.', zh: 'Api 以 Development 启动并自动套用 `InitialCreate`。'}},
          {id: 'health', text: {en: '`/health` returns Healthy and `/scalar` opens.', zh: '`/health` 返回 Healthy，`/scalar` 可以打开。'}},
          {id: 'auth', text: {en: 'Without a token, `/health` returns 200 and `/openapi/v1.json` and `/scalar` open (public by design); any other path returns 401.', zh: '不带 token 时，`/health` 返回 200，`/openapi/v1.json` 与 `/scalar` 可以打开（设计上即为公开）；其他任何路径返回 401。'}},
          {id: 'token', text: {en: 'With a valid access token, an unknown path returns 404 (not 401).', zh: '带有效的 access token 时，不存在的路径返回 404（而不是 401）。'}},
          {id: 'sit-fails', text: {en: 'With the SIT environment name and no connection string, the Api fails at startup.', zh: '以 SIT 环境名称且没有连接字串启动时，Api 在启动阶段失败。'}},
          {id: 'worker', text: {en: 'The Worker connects to RabbitMQ with no errors in the log.', zh: 'Worker 连上 RabbitMQ，日志没有错误。'}, when: worker},
          {id: 'seq', text: {en: 'Log entries appear in the local Seq.', zh: '本地 Seq 看得到日志。'}},
        ],
      },
      {
        id: 'commit',
        num: '3.3',
        title: {en: 'Commit and push the Skeleton Solution', zh: '提交并推送 Skeleton Solution'},
        checks: [
          {id: 'test', text: {en: '`dotnet test` passes on a clean clone.', zh: '在干净的 clone 上 `dotnet test` 全部通过。'}},
          {id: 'no-secrets', text: {en: 'No secret, license key or filled-in `.env` file is committed.', zh: '没有提交任何 secret、license key 或已填写的 `.env` 文件。'}},
          {id: 'ci-secret', text: {en: 'The `MT_LICENSE` secret is set in the GitHub repository before the first push.', zh: '第一次推送之前，已在 GitHub repo 设定 `MT_LICENSE` secret。'}},
          {id: 'pushed', text: {en: 'The Skeleton Solution is committed and pushed to a private GitHub repository.', zh: 'Skeleton Solution 已提交并推送到私有 GitHub repo。'}},
        ],
      },
    ],
  },
  {
    id: 'release',
    num: '4',
    title: {en: 'Get ready to go live', zh: '上线准备'},
    steps: [
      {
        id: 'ci',
        num: '4.1',
        title: {en: 'Set up CI', zh: '设定 CI'},
        checks: [
          {id: 'green', text: {en: 'The ci workflow is green on main.', zh: 'main 上的 ci workflow 通过。'}},
          {id: 'artifact', text: {en: 'The artifact `<short name>-<sha>` holds `api/`, `migrations/efbundle`, and `worker/` when the project has a Worker.', zh: '产物 `<简短名称>-<sha>` 内有 `api/`、`migrations/efbundle`，有 Worker 时还有 `worker/`。'}},
          {id: 'sonar', text: {en: '`SONAR_TOKEN`, `SONAR_PROJECT_KEY` and `SONAR_ORGANIZATION_KEY` are set and the SonarCloud job is green.', zh: '已设定 `SONAR_TOKEN`、`SONAR_PROJECT_KEY`、`SONAR_ORGANIZATION_KEY`，SonarCloud job 通过。'}, when: sonar},
          {id: 'qodana', text: {en: '`QODANA_TOKEN` is set and the Qodana job is green.', zh: '已设定 `QODANA_TOKEN`，Qodana job 通过。'}, when: qodana},
        ],
      },
      ...(['sit', 'prod'] as const).flatMap((env): Step[] => {
        const E = env === 'sit' ? {en: 'SIT', zh: 'SIT'} : {en: 'Production', zh: 'Production'};
        const base = env === 'sit' ? 4.2 : 4.5;
        return [
          {
            id: `${env}-services`,
            num: base.toFixed(1),
            title: {en: `${E.en}: backing services`, zh: `${E.zh}：后端服务`},
            checks: [
              {id: 'database', text: {en: `A managed PostgreSQL 17 for ${E.en} exists, requires TLS, and accepts connections only from the ${E.en} VM; its admin credentials are in your password manager.`, zh: `${E.zh} 的托管 PostgreSQL 17 已建立，要求 TLS，且只接受 ${E.zh} VM 的连线；管理员帐号密码已存入密码管理器。`}},
              ...(env === 'prod'
                ? [{id: 'backups', text: {en: 'Automated backups and point in time restore are on for the Production database.', zh: 'Production 数据库已开启自动备份与时间点还原。'}}]
                : []),
              {id: 'broker', text: {en: `A managed RabbitMQ for ${E.en} exists and its \`amqps://\` URL is noted.`, zh: `${E.zh} 的托管 RabbitMQ 已建立，并记下其 \`amqps://\` URL。`}},
              {id: 'seq', text: {en: `Seq for ${E.en} runs on its own VM behind HTTPS, with an admin password set.`, zh: `${E.zh} 的 Seq 在独立 VM 上以 HTTPS 运行，并已设定管理员密码。`}},
              {id: 'seq-keys', text: {en: 'Seq API keys with Ingest permission exist for the Api (and the Worker).', zh: '已为 Api（与 Worker）建立具 Ingest 权限的 Seq API key。'}},
            ],
          },
          {
            id: `${env}-vm`,
            num: (base + 0.1).toFixed(1),
            title: {en: `${E.en}: first-time VM setup`, zh: `${E.zh}：VM 首次设定`},
            checks: [
              {id: 'account', text: {en: 'VM time zone is UTC; the service account, directories and env files (owner root, mode 600) exist.', zh: 'VM 时区为 UTC；服务帐号、目录与环境变量文件（拥有者 root、权限 600）已建立。'}},
              {id: 'idp', text: {en: `The ${E.en} Api is registered in the identity provider; its Authority and Audience are in the env files and a test token can be obtained.`, zh: `已在身份提供者中注册 ${E.zh} 的 Api；Authority 与 Audience 已写入环境变量文件，并可取得测试 token。`}},
              {id: 'licenses', text: {en: '`MT_LICENSE` and `MediatR__LicenseKey` are filled in the env files.', zh: '环境变量文件已填入 `MT_LICENSE` 与 `MediatR__LicenseKey`。'}},
              {id: 'env-name', text: {en: `The env files set the environment name to exactly \`${env === 'sit' ? 'SIT' : 'Production'}\`.`, zh: `环境变量文件的环境名称正好是 \`${env === 'sit' ? 'SIT' : 'Production'}\`。`}},
              {id: 'systemd', text: {en: 'The systemd services are installed and enabled.', zh: 'systemd 服务已安装并启用。'}},
              {id: 'nginx', text: {en: 'Nginx serves the site configuration with a valid HTTPS certificate.', zh: 'Nginx 已套用站点配置，并有有效的 HTTPS 证书。'}},
              {id: 'hardening', text: {en: 'journald is capped at 1 GB; the firewall allows only SSH, 80 and 443.', zh: 'journald 上限为 1 GB；防火墙只开放 SSH、80、443。'}},
              {id: 'database', text: {en: 'The database exists with separate owner and application accounts.', zh: '数据库已建立，并有分开的 owner 帐号与应用程序帐号。'}},
              {id: 'broker-seq', text: {en: `The connectivity checks reach the ${E.en} database, broker and Seq from the VM.`, zh: `从 VM 执行的连线检查可以连上 ${E.zh} 的数据库、broker 与 Seq。`}},
              ...(env === 'prod'
                ? [{id: 'backups', text: {en: 'Daily database backups are on, and a restore has been rehearsed.', zh: '每日数据库备份已启用，并已演练还原。'}}]
                : []),
            ],
          },
          {
            id: `${env}-deploy`,
            num: (base + 0.2).toFixed(1),
            title: {en: `${E.en}: first deployment`, zh: `${E.zh}：首次部署与验证`},
            checks: [
              ...(env === 'prod'
                ? [{id: 'sit-first', text: {en: 'The same version passed its SIT deployment and testing.', zh: '同一版本已在 SIT 部署并通过测试。'}}]
                : []),
              {id: 'release', text: {en: 'The CI artifact is extracted to `/opt/<short name>/releases/<version>/`, with executables marked executable.', zh: 'CI 产物已解压到 `/opt/<简短名称>/releases/<version>/`，可执行文件已加上执行权限。'}},
              {id: 'migrate', text: {en: 'The migration bundle ran with the owner account.', zh: '已用 owner 帐号执行 migration bundle。'}},
              {id: 'revoke', text: {en: 'Block 5 printed "Audit tables locked": the application account cannot update, delete or truncate the audit tables.', zh: '第 5 步显示“审计表已锁定”：应用程序帐号无法更新、删除或清空审计表。'}, when: auditing},
              {id: 'switch', text: {en: 'The symbolic links point to the new version and the services restarted.', zh: '符号链接已指向新版本，服务已重新启动。'}},
              {id: 'verify', text: {en: '`https://<api domain>/health` returns Healthy and Seq shows no new errors.', zh: '`https://<api 域名>/health` 返回 Healthy，Seq 没有新的错误。'}},
              {id: 'token', text: {en: 'A valid access token from this environment\'s identity provider gets 404 on an unknown path (not 401).', zh: '此环境身份提供者签发的有效 access token 呼叫不存在的路径得到 404（而不是 401）。'}},
            ],
          },
        ];
      }),
    ],
  },
  {
    id: 'handover',
    num: '5',
    title: {en: 'Hand over to feature work', zh: '交棒'},
    steps: [
      {
        id: 'first-feature',
        num: '5.1',
        title: {en: 'Ready for feature work', zh: '准备开始功能开发'},
        checks: [
          {id: 'prompt', text: {en: 'The 8.15 feature slice prompt is saved where you will use it (agent instruction file or bookmark).', zh: '8.15 的 feature slice 提示词已放在会用到的地方（AI 项目指示档或书签）。'}},
          {id: 'audit-scope', text: {en: 'The audit rule is written down: which kinds of entities implement `IAuditable` and which kinds of requests implement `IAuditableRequest`.', zh: '审计规则已写下：哪些类型的实体实现 `IAuditable`、哪些类型的请求实现 `IAuditableRequest`。'}, when: auditing},
        ],
      },
    ],
  },
];

export const STEPS: Step[] = PHASES.flatMap((p) => p.steps);

export function stepById(id: string): Step {
  const step = STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Unknown step id: ${id}`);
  return step;
}

export function applies(step: Step, project: Project | null): boolean {
  return !project || !step.when || step.when(project);
}

export function checksFor(step: Step, project: Project | null): Check[] {
  return step.checks.filter((c) => !project || !c.when || c.when(project));
}

export function pick(text: Text, locale: string): string {
  return locale === 'zh-Hans' ? text.zh : text.en;
}

export type StepStatus = {skip: boolean; done: number; total: number; complete: boolean};

/** How far the project has come on one step; `skip` when the step does not apply to it. */
export function stepStatus(step: Step, project: Project | null, progress: Progress): StepStatus {
  const skip = project !== null && !applies(step, project);
  const checks = checksFor(step, project);
  const ok = new Set(project ? progress[project.id]?.[step.id] ?? [] : []);
  const done = checks.filter((c) => ok.has(c.id)).length;
  return {skip, done, total: checks.length, complete: project !== null && !skip && done === checks.length};
}

/** The short status the step lists show: ✓, 2/5, or — for a skipped step; empty without a project. */
export function statusLabel(s: StepStatus, project: Project | null): string {
  if (!project) return '';
  if (s.skip) return '—';
  return s.complete ? '✓' : `${s.done}/${s.total}`;
}
