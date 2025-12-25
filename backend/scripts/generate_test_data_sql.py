#!/usr/bin/env python3
"""
直接通过 SQL 插入测试数据

用法：
    python scripts/generate_test_data_sql.py
    python scripts/generate_test_data_sql.py --clear  # 清除后重新生成
"""

import argparse
import random
import json
import os
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values


def load_env_file(env_path: str) -> dict:
    """从 .env 文件加载环境变量"""
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars


def get_db_config() -> dict:
    """从 docker/.env 读取数据库配置"""
    # 获取项目根目录
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent.parent
    env_path = project_root / 'docker' / '.env'
    
    env_vars = load_env_file(str(env_path))
    
    # 获取数据库配置，docker/.env 中 DB_HOST=postgres 是容器内地址，本地运行需要用 localhost
    db_host = env_vars.get('DB_HOST', 'postgres')
    if db_host == 'postgres':
        db_host = 'localhost'  # 本地运行脚本时使用 localhost
    
    return {
        'host': db_host,
        'port': int(env_vars.get('DB_PORT', 5432)),
        'dbname': env_vars.get('DB_NAME', 'xingrin'),
        'user': env_vars.get('DB_USER', 'postgres'),
        'password': env_vars.get('DB_PASSWORD', ''),
    }


DB_CONFIG = get_db_config()


class TestDataGenerator:
    def __init__(self, clear: bool = False):
        self.conn = psycopg2.connect(**DB_CONFIG)
        self.conn.autocommit = False
        self.clear = clear
        
    def run(self):
        try:
            if self.clear:
                print("🗑️  清除现有数据...")
                self.clear_data()
                
            print("🚀 开始生成测试数据...\n")
            
            engine_ids = self.create_engines()
            worker_ids = self.create_workers()
            org_ids = self.create_organizations()
            target_ids = self.create_targets(org_ids)
            scan_ids = self.create_scans(target_ids, engine_ids, worker_ids)
            self.create_scheduled_scans(org_ids, target_ids, engine_ids)
            self.create_subdomains(target_ids)
            website_ids = self.create_websites(target_ids)
            self.create_endpoints(target_ids)
            self.create_directories(target_ids, website_ids)
            self.create_host_port_mappings(target_ids)
            self.create_vulnerabilities(target_ids)
            
            # 生成快照数据（扫描历史详细页面使用）
            self.create_subdomain_snapshots(scan_ids)
            self.create_website_snapshots(scan_ids)
            self.create_endpoint_snapshots(scan_ids)
            self.create_directory_snapshots(scan_ids)
            self.create_host_port_mapping_snapshots(scan_ids)
            self.create_vulnerability_snapshots(scan_ids)
            
            self.conn.commit()
            print("\n✅ 测试数据生成完成！")
        except Exception as e:
            self.conn.rollback()
            print(f"\n❌ 生成失败: {e}")
            raise
        finally:
            self.conn.close()

    def clear_data(self):
        """清除所有测试数据"""
        cur = self.conn.cursor()
        tables = [
            # 快照表（先删除，因为有外键依赖 scan）
            'vulnerability_snapshot', 'host_port_mapping_snapshot', 'directory_snapshot',
            'endpoint_snapshot', 'website_snapshot', 'subdomain_snapshot',
            # 资产表
            'vulnerability', 'host_port_mapping', 'directory', 'endpoint',
            'website', 'subdomain', 'scheduled_scan', 'scan',
            'organization_targets', 'target', 'organization',
            'nuclei_template_repo', 'wordlist', 'scan_engine', 'worker_node'
        ]
        for table in tables:
            cur.execute(f"DELETE FROM {table}")
        self.conn.commit()
        print("  ✓ 数据清除完成\n")

    def create_workers(self) -> list:
        """创建 Worker 节点"""
        print("👷 创建 Worker 节点...")
        cur = self.conn.cursor()
        
        # 生成随机后缀确保唯一性
        suffix = random.randint(1000, 9999)
        
        regions = ['asia-singapore', 'asia-tokyo', 'asia-hongkong', 'europe-frankfurt', 'europe-london', 
                   'us-east-virginia', 'us-west-oregon', 'us-central-iowa', 'australia-sydney', 'brazil-saopaulo']
        statuses = ['online', 'offline', 'pending', 'deploying', 'maintenance']
        
        workers = [
            (f'local-worker-primary-{suffix}', '127.0.0.1', True, 'online'),
        ]
        
        # 随机生成 4-8 个远程 worker
        num_remote = random.randint(4, 8)
        selected_regions = random.sample(regions, min(num_remote, len(regions)))
        for i, region in enumerate(selected_regions):
            ip = f'192.168.{random.randint(1, 254)}.{random.randint(1, 254)}'
            status = random.choice(statuses)
            workers.append((f'remote-worker-{region}-{suffix}-{i:02d}', ip, False, status))
        
        ids = []
        for name, ip, is_local, status in workers:
            cur.execute("""
                INSERT INTO worker_node (name, ip_address, ssh_port, username, password, is_local, status, created_at, updated_at)
                VALUES (%s, %s, 22, 'root', '', %s, %s, NOW(), NOW())
                ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
                RETURNING id
            """, (name, ip, is_local, status))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                
        print(f"  ✓ 创建了 {len(ids)} 个 Worker 节点\n")
        return ids

    def create_engines(self) -> list:
        """创建扫描引擎"""
        print("⚙️  创建扫描引擎...")
        cur = self.conn.cursor()
        
        suffix = random.randint(1000, 9999)
        
        engine_templates = [
            ('Full-Comprehensive-Security-Assessment', 'subdomain_discovery:\n  enabled: true\n  tools: [subfinder, amass]\nvulnerability_scanning:\n  enabled: true\n  nuclei:\n    severity: critical,high,medium,low,info\n    rate_limit: {rate}\n    concurrency: {conc}'),
            ('Quick-Reconnaissance-Fast-Discovery', 'subdomain_discovery:\n  enabled: true\n  tools: [subfinder]\n  timeout: {timeout}\nport_scanning:\n  enabled: true\n  top_ports: {ports}'),
            ('Deep-Vulnerability-Assessment-Extended', 'vulnerability_scanning:\n  enabled: true\n  nuclei:\n    severity: critical,high,medium,low,info\n    templates: [cves, vulnerabilities, exposures]\n    rate_limit: {rate}'),
            ('Passive-Information-Gathering-OSINT', 'subdomain_discovery:\n  enabled: true\n  passive_only: true\n  sources: [crtsh, hackertarget, threatcrowd]\n  timeout: {timeout}'),
            ('Web-Application-Security-Scanner', 'web_discovery:\n  enabled: true\n  httpx:\n    threads: {conc}\nvulnerability_scanning:\n  enabled: true\n  dalfox:\n    enabled: true'),
            ('API-Endpoint-Security-Audit', 'endpoint_discovery:\n  enabled: true\n  katana:\n    depth: {depth}\n    concurrency: {conc}\nvulnerability_scanning:\n  enabled: true'),
            ('Infrastructure-Port-Scanner', 'port_scanning:\n  enabled: true\n  naabu:\n    top_ports: {ports}\n    rate: {rate}\n  service_detection: true'),
            ('Directory-Bruteforce-Engine', 'directory_bruteforce:\n  enabled: true\n  ffuf:\n    threads: {conc}\n    wordlist: common.txt\n    recursion_depth: {depth}'),
        ]
        
        # 随机选择 4-6 个引擎模板
        num_engines = random.randint(4, 6)
        selected = random.sample(engine_templates, min(num_engines, len(engine_templates)))
        
        ids = []
        for name_base, config_template in selected:
            name = f'{name_base}-{suffix}'
            config = config_template.format(
                rate=random.choice([100, 150, 200, 300]),
                conc=random.choice([10, 20, 50, 100]),
                timeout=random.choice([300, 600, 900, 1200]),
                ports=random.choice([100, 1000, 'full']),
                depth=random.choice([2, 3, 4, 5])
            )
            cur.execute("""
                INSERT INTO scan_engine (name, configuration, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
                ON CONFLICT (name) DO UPDATE SET configuration = EXCLUDED.configuration, updated_at = NOW()
                RETURNING id
            """, (name, config))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                
        print(f"  ✓ 创建了 {len(ids)} 个扫描引擎\n")
        return ids

    def create_organizations(self) -> list:
        """创建组织"""
        print("🏢 创建组织...")
        cur = self.conn.cursor()
        
        suffix = random.randint(1000, 9999)
        
        org_templates = [
            ('Acme Corporation', '全球领先的技术解决方案提供商，专注于企业级软件开发、云计算服务和网络安全解决方案。'),
            ('TechStart Innovation Labs', '专注于人工智能、机器学习和区块链技术研发的创新实验室。'),
            ('Global Financial Services', '提供全方位数字银行服务的金融科技公司，包括移动支付、在线贷款、投资理财等服务。'),
            ('HealthCare Plus Medical', '医疗信息化解决方案提供商，专注于电子病历系统、医院信息管理系统和远程医疗平台开发。'),
            ('E-Commerce Mega Platform', '亚太地区最大的电子商务平台之一，提供 B2B、B2C 和 C2C 多种交易模式。'),
            ('Smart City Infrastructure', '智慧城市基础设施解决方案提供商，专注于物联网传感器网络、智能交通系统。'),
            ('Educational Technology', '在线教育技术联盟，提供 K-12 和高等教育在线学习平台。'),
            ('Green Energy Solutions', '可再生能源管理系统提供商，专注于太阳能、风能发电站的监控、调度和优化管理。'),
            ('CyberSec Defense Corp', '网络安全防御公司，提供渗透测试、漏洞评估和安全咨询服务。'),
            ('CloudNative Systems', '云原生系统开发商，专注于 Kubernetes、微服务架构和 DevOps 工具链。'),
            ('DataFlow Analytics', '大数据分析平台，提供实时数据处理、商业智能和预测分析服务。'),
            ('MobileFirst Technologies', '移动优先技术公司，专注于 iOS/Android 应用开发和跨平台解决方案。'),
        ]
        
        divisions = ['Global Division', 'Asia Pacific', 'EMEA Region', 'Americas', 'R&D Center', 'Digital Platform', 'Cloud Services', 'Security Team']
        
        # 随机选择 5-10 个组织
        num_orgs = random.randint(5, 10)
        selected = random.sample(org_templates, min(num_orgs, len(org_templates)))
        
        ids = []
        for name_base, desc in selected:
            division = random.choice(divisions)
            name = f'{name_base} - {division} ({suffix})'
            cur.execute("""
                INSERT INTO organization (name, description, created_at, deleted_at)
                VALUES (%s, %s, NOW() - INTERVAL '%s days', NULL)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (name, desc, random.randint(0, 365)))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                
        print(f"  ✓ 创建了 {len(ids)} 个组织\n")
        return ids


    def create_targets(self, org_ids: list) -> list:
        """创建扫描目标"""
        print("🎯 创建扫描目标...")
        cur = self.conn.cursor()
        
        suffix = random.randint(1000, 9999)
        
        # 域名前缀和后缀组合，增加随机性
        prefixes = ['api', 'portal', 'secure', 'admin', 'dashboard', 'app', 'mobile', 'staging', 'dev', 'test', 'qa', 'uat', 'beta', 'prod', 'internal', 'external', 'public', 'private']
        companies = ['acme', 'techstart', 'globalfinance', 'healthcare', 'ecommerce', 'smartcity', 'edutech', 'greenenergy', 'cybersec', 'cloudnative', 'dataflow', 'mobilefirst', 'secureops', 'devplatform']
        tlds = ['.com', '.io', '.net', '.org', '.dev', '.app', '.cloud', '.tech', '.systems']
        
        ids = []
        
        # 随机生成 10-20 个域名目标
        num_domains = random.randint(10, 20)
        used_domains = set()
        
        for i in range(num_domains):
            prefix = random.choice(prefixes)
            company = random.choice(companies)
            tld = random.choice(tlds)
            domain = f'{prefix}.{company}-{suffix}{tld}'
            
            if domain in used_domains:
                continue
            used_domains.add(domain)
            
            cur.execute("""
                INSERT INTO target (name, type, created_at, last_scanned_at, deleted_at)
                VALUES (%s, 'domain', NOW() - INTERVAL '%s days', NOW() - INTERVAL '%s days', NULL)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (domain, random.randint(30, 365), random.randint(0, 30)))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                # 随机关联到组织
                if org_ids and random.random() > 0.3:  # 70% 概率关联
                    org_id = random.choice(org_ids)
                    cur.execute("""
                        INSERT INTO organization_targets (organization_id, target_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                    """, (org_id, row[0]))
        
        # 随机生成 3-8 个 IP 目标
        num_ips = random.randint(3, 8)
        for _ in range(num_ips):
            # 使用文档保留的 IP 范围
            ip_ranges = [
                (203, 0, 113),   # TEST-NET-3
                (198, 51, 100),  # TEST-NET-2
                (192, 0, 2),     # TEST-NET-1
            ]
            base = random.choice(ip_ranges)
            ip = f'{base[0]}.{base[1]}.{base[2]}.{random.randint(1, 254)}'
            
            cur.execute("""
                INSERT INTO target (name, type, created_at, last_scanned_at, deleted_at)
                VALUES (%s, 'ip', NOW() - INTERVAL '%s days', NOW() - INTERVAL '%s days', NULL)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (ip, random.randint(30, 365), random.randint(0, 30)))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
        
        # 随机生成 2-5 个 CIDR 目标
        num_cidrs = random.randint(2, 5)
        cidr_bases = ['10.0', '172.16', '172.17', '172.18', '192.168']
        for _ in range(num_cidrs):
            base = random.choice(cidr_bases)
            third_octet = random.randint(0, 255)
            mask = random.choice([24, 25, 26, 27, 28])
            cidr = f'{base}.{third_octet}.0/{mask}'
            
            cur.execute("""
                INSERT INTO target (name, type, created_at, last_scanned_at, deleted_at)
                VALUES (%s, 'cidr', NOW() - INTERVAL '%s days', NOW() - INTERVAL '%s days', NULL)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (cidr, random.randint(30, 365), random.randint(0, 30)))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                
        print(f"  ✓ 创建了 {len(ids)} 个扫描目标\n")
        return ids

    def create_scans(self, target_ids: list, engine_ids: list, worker_ids: list) -> list:
        """创建扫描任务"""
        print("🔍 创建扫描任务...")
        cur = self.conn.cursor()
        
        if not target_ids or not engine_ids:
            print("  ⚠ 缺少目标或引擎，跳过\n")
            return []
        
        statuses = ['cancelled', 'completed', 'failed', 'initiated', 'running']
        status_weights = [0.05, 0.6, 0.1, 0.1, 0.15]  # completed 占比最高
        stages = ['subdomain_discovery', 'port_scanning', 'web_discovery', 'vulnerability_scanning', 'directory_bruteforce', 'endpoint_discovery']
        
        error_messages = [
            'Connection timeout while scanning target. Please check network connectivity.',
            'DNS resolution failed for target domain.',
            'Rate limit exceeded. Scan paused and will resume automatically.',
            'Worker node disconnected during scan execution.',
            'Insufficient disk space on worker node.',
            'Target returned too many errors, scan aborted.',
            'Authentication failed for protected resources.',
        ]
        
        ids = []
        # 随机选择目标数量
        num_targets = min(random.randint(8, 15), len(target_ids))
        selected_targets = random.sample(target_ids, num_targets)
        
        for target_id in selected_targets:
            # 每个目标随机 1-6 个扫描任务
            num_scans = random.randint(1, 6)
            for _ in range(num_scans):
                status = random.choices(statuses, weights=status_weights)[0]
                engine_id = random.choice(engine_ids)
                worker_id = random.choice(worker_ids) if worker_ids else None
                
                progress = random.randint(10, 95) if status == 'running' else (100 if status == 'completed' else random.randint(0, 50))
                stage = random.choice(stages) if status == 'running' else ''
                error_msg = random.choice(error_messages) if status == 'failed' else ''
                
                # 随机生成更真实的统计数据
                subdomains = random.randint(5, 800)
                websites = random.randint(2, 150)
                endpoints = random.randint(20, 2000)
                ips = random.randint(3, 100)
                directories = random.randint(50, 3000)
                vulns_critical = random.randint(0, 8)
                vulns_high = random.randint(0, 20)
                vulns_medium = random.randint(0, 40)
                vulns_low = random.randint(0, 60)
                vulns_total = vulns_critical + vulns_high + vulns_medium + vulns_low + random.randint(0, 30)  # info
                
                days_ago = random.randint(0, 90)
                
                cur.execute("""
                    INSERT INTO scan (
                        target_id, engine_id, status, worker_id, progress, current_stage,
                        results_dir, error_message, container_ids, stage_progress,
                        cached_subdomains_count, cached_websites_count, cached_endpoints_count,
                        cached_ips_count, cached_directories_count, cached_vulns_total,
                        cached_vulns_critical, cached_vulns_high, cached_vulns_medium, cached_vulns_low,
                        created_at, stopped_at, deleted_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        NOW() - INTERVAL '%s days', %s, NULL
                    )
                    RETURNING id
                """, (
                    target_id, engine_id, status, worker_id, progress, stage,
                    f'/app/results/scan_{target_id}_{random.randint(1000, 9999)}', error_msg, '{}', '{}',
                    subdomains, websites, endpoints, ips, directories, vulns_total,
                    vulns_critical, vulns_high, vulns_medium, vulns_low,
                    days_ago,
                    datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23)) if status in ['completed', 'failed', 'cancelled'] else None
                ))
                row = cur.fetchone()
                if row:
                    ids.append(row[0])
                    
        print(f"  ✓ 创建了 {len(ids)} 个扫描任务\n")
        return ids

    def create_scheduled_scans(self, org_ids: list, target_ids: list, engine_ids: list):
        """创建定时扫描任务"""
        print("⏰ 创建定时扫描任务...")
        cur = self.conn.cursor()
        
        if not engine_ids:
            print("  ⚠ 缺少引擎，跳过\n")
            return
        
        suffix = random.randint(1000, 9999)
        
        schedule_templates = [
            ('Daily-Full-Security-Assessment', '0 {hour} * * *'),
            ('Weekly-Vulnerability-Scan', '0 {hour} * * {dow}'),
            ('Monthly-Penetration-Testing', '0 {hour} {dom} * *'),
            ('Hourly-Quick-Reconnaissance', '{min} * * * *'),
            ('Bi-Weekly-Compliance-Check', '0 {hour} 1,15 * *'),
            ('Quarterly-Infrastructure-Audit', '0 {hour} 1 1,4,7,10 *'),
            ('Daily-API-Security-Scan', '{min} {hour} * * *'),
            ('Weekly-Web-Application-Scan', '0 {hour} * * {dow}'),
            ('Nightly-Asset-Discovery', '0 {hour} * * *'),
            ('Weekend-Deep-Scan', '0 {hour} * * 0,6'),
            ('Business-Hours-Monitor', '0 9-17 * * 1-5'),
            ('Off-Hours-Intensive-Scan', '0 {hour} * * *'),
        ]
        
        # 随机选择 6-12 个定时任务
        num_schedules = random.randint(6, 12)
        selected = random.sample(schedule_templates, min(num_schedules, len(schedule_templates)))
        
        count = 0
        for name_base, cron_template in selected:
            name = f'{name_base}-{suffix}-{count:02d}'
            cron = cron_template.format(
                hour=random.randint(0, 23),
                min=random.randint(0, 59),
                dow=random.randint(0, 6),
                dom=random.randint(1, 28)
            )
            enabled = random.random() > 0.3  # 70% 启用
            
            engine_id = random.choice(engine_ids)
            # 随机决定关联组织还是目标
            if org_ids and target_ids:
                if random.random() > 0.5:
                    org_id = random.choice(org_ids)
                    target_id = None
                else:
                    org_id = None
                    target_id = random.choice(target_ids)
            elif org_ids:
                org_id = random.choice(org_ids)
                target_id = None
            elif target_ids:
                org_id = None
                target_id = random.choice(target_ids)
            else:
                org_id = None
                target_id = None
            
            run_count = random.randint(0, 200)
            has_run = random.random() > 0.2  # 80% 已运行过
            
            cur.execute("""
                INSERT INTO scheduled_scan (
                    name, engine_id, organization_id, target_id, cron_expression, is_enabled,
                    run_count, last_run_time, next_run_time, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW() - INTERVAL '%s days', NOW())
                ON CONFLICT DO NOTHING
            """, (
                name, engine_id, org_id, target_id, cron, enabled,
                run_count if has_run else 0,
                datetime.now() - timedelta(days=random.randint(0, 14), hours=random.randint(0, 23)) if has_run else None,
                datetime.now() + timedelta(hours=random.randint(1, 336))  # 最多 2 周后
            , random.randint(30, 180)))
            count += 1
            
        print(f"  ✓ 创建了 {count} 个定时扫描任务\n")


    def create_subdomains(self, target_ids: list):
        """创建子域名"""
        print("🌐 创建子域名...")
        cur = self.conn.cursor()
        
        prefixes = [
            'api', 'admin', 'portal', 'dashboard', 'app', 'mobile', 'staging', 'dev',
            'test', 'qa', 'uat', 'beta', 'alpha', 'demo', 'sandbox', 'internal',
            'secure', 'auth', 'login', 'sso', 'oauth', 'identity', 'accounts',
            'mail', 'smtp', 'imap', 'webmail', 'ftp', 'sftp', 'files', 'storage',
            'cdn', 'static', 'assets', 'media', 'db', 'database', 'mysql', 'postgres',
            'redis', 'mongo', 'elastic', 'vpn', 'remote', 'gateway', 'proxy',
            'monitoring', 'metrics', 'grafana', 'prometheus', 'kibana', 'logs',
            'jenkins', 'ci', 'cd', 'gitlab', 'jira', 'confluence', 'kubernetes', 'k8s',
            'www', 'www2', 'www3', 'ns1', 'ns2', 'mx', 'mx1', 'mx2', 'autodiscover',
            'webdisk', 'cpanel', 'whm', 'webmail2', 'email', 'smtp2', 'pop', 'pop3',
            'imap2', 'calendar', 'contacts', 'drive', 'docs', 'sheets', 'slides',
            'meet', 'chat', 'teams', 'slack', 'discord', 'zoom', 'video', 'stream',
            'blog', 'news', 'press', 'media2', 'images', 'img', 'photos', 'video2',
            'shop', 'store', 'cart', 'checkout', 'pay', 'payment', 'billing', 'invoice',
            'support', 'help', 'helpdesk', 'ticket', 'tickets', 'status', 'health',
            'api-v1', 'api-v2', 'api-v3', 'graphql', 'rest', 'soap', 'rpc', 'grpc',
        ]
        
        # 二级前缀，用于生成更复杂的子域名
        secondary_prefixes = ['', 'prod-', 'dev-', 'staging-', 'test-', 'int-', 'ext-', 'us-', 'eu-', 'ap-']
        
        # 获取域名目标
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL")
        domain_targets = cur.fetchall()
        
        count = 0
        for target_id, target_name in domain_targets:
            # 每个目标随机 15-60 个子域名
            num = random.randint(15, 60)
            selected = random.sample(prefixes, min(num, len(prefixes)))
            
            for prefix in selected:
                # 随机添加二级前缀
                sec_prefix = random.choice(secondary_prefixes) if random.random() > 0.7 else ''
                subdomain_name = f'{sec_prefix}{prefix}.{target_name}'
                
                cur.execute("""
                    INSERT INTO subdomain (name, target_id, created_at)
                    VALUES (%s, %s, NOW() - INTERVAL '%s days')
                    ON CONFLICT DO NOTHING
                """, (subdomain_name, target_id, random.randint(0, 90)))
                count += 1
                
        print(f"  ✓ 创建了 {count} 个子域名\n")

    def create_websites(self, target_ids: list) -> list:
        """创建网站"""
        print("🌍 创建网站...")
        cur = self.conn.cursor()
        
        titles = [
            'Enterprise Resource Planning System - Dashboard | Acme Corporation Internal Portal',
            'Customer Relationship Management Platform - Login | Secure Access Required',
            'Human Resources Information System - Employee Self Service Portal v3.2.1',
            'Supply Chain Management - Logistics Tracking Dashboard | Real-time Updates',
            'Business Intelligence Analytics - Executive Summary Report Generator',
            'Content Management System - Admin Panel | Headless CMS API Gateway',
            'Project Management Collaboration Tools - Team Workspace | Agile Board',
            'E-Commerce Platform - Product Catalog Management | Inventory Control',
        ]
        
        webservers = ['nginx/1.24.0', 'Apache/2.4.57', 'Microsoft-IIS/10.0', 'cloudflare', 'gunicorn/21.2.0']
        tech_stacks = [
            ['React', 'Node.js', 'Express', 'MongoDB'],
            ['Vue.js', 'Django', 'PostgreSQL', 'Celery'],
            ['Angular', 'Spring Boot', 'MySQL'],
            ['Next.js', 'FastAPI', 'Redis'],
        ]
        
        # 真实的 body preview 内容
        body_previews = [
            '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Login - Enterprise Portal</title><link rel="stylesheet" href="/assets/css/main.css"></head><body><div id="app"></div><script src="/assets/js/bundle.js"></script></body></html>',
            '<!DOCTYPE html><html><head><title>Dashboard</title><meta name="description" content="Enterprise management dashboard for monitoring and analytics"><link rel="icon" href="/favicon.ico"></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>',
            '{"status":"ok","version":"2.4.1","environment":"production","timestamp":"2024-12-22T10:30:00Z","services":{"database":"healthy","cache":"healthy","queue":"healthy"},"uptime":864000}',
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>You don\'t have permission to access this resource. Please contact the administrator if you believe this is an error.</p><hr><address>nginx/1.24.0</address></body></html>',
            '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>系统维护中</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:50px;}</style></head><body><h1>系统正在维护中</h1><p>预计恢复时间：2024-12-23 08:00</p></body></html>',
            '{"error":"Unauthorized","message":"Invalid or expired authentication token. Please login again.","code":"AUTH_001","timestamp":"2024-12-22T15:45:30.123Z","path":"/api/v1/users/profile"}',
            '<!DOCTYPE html><html><head><title>Welcome to nginx!</title><style>body{width:35em;margin:0 auto;font-family:Tahoma,Verdana,Arial,sans-serif;}</style></head><body><h1>Welcome to nginx!</h1><p>If you see this page, the nginx web server is successfully installed and working.</p></body></html>',
            '<?xml version="1.0" encoding="UTF-8"?><error><code>500</code><message>Internal Server Error</message><details>An unexpected error occurred while processing your request. Please try again later or contact support.</details><requestId>req_abc123xyz789</requestId></error>',
            '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=https://login.example.com/sso"><title>Redirecting...</title></head><body><p>Redirecting to login page...</p><a href="https://login.example.com/sso">Click here if not redirected</a></body></html>',
            '{"data":{"user":{"id":12345,"username":"admin","email":"admin@example.com","role":"administrator","lastLogin":"2024-12-21T18:30:00Z","permissions":["read","write","delete","admin"]},"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}}',
            '<!DOCTYPE html><html><head><title>API Documentation - Swagger UI</title><link rel="stylesheet" type="text/css" href="/swagger-ui.css"><link rel="icon" type="image/png" href="/favicon-32x32.png"></head><body><div id="swagger-ui"></div><script src="/swagger-ui-bundle.js"></script></body></html>',
            '{"openapi":"3.0.3","info":{"title":"Enterprise API","description":"RESTful API for enterprise resource management","version":"1.0.0","contact":{"email":"api-support@example.com"}},"servers":[{"url":"https://api.example.com/v1"}]}',
            '<!DOCTYPE html><html><head><title>404 Not Found</title><style>*{margin:0;padding:0;}body{background:#f1f1f1;font-family:Arial;}.container{max-width:600px;margin:100px auto;text-align:center;}</style></head><body><div class="container"><h1>404</h1><p>Page not found</p></div></body></html>',
            'PING OK - Packet loss = 0%, RTA = 0.45 ms|rta=0.450000ms;100.000000;500.000000;0.000000 pl=0%;20;60;0',
            '{"metrics":{"requests_total":1234567,"requests_per_second":450.5,"avg_response_time_ms":23.4,"error_rate":0.02,"active_connections":1250,"memory_usage_mb":2048,"cpu_usage_percent":45.6}}',
            '<!DOCTYPE html><html><head><title>Under Construction</title></head><body style="background:#000;color:#0f0;font-family:monospace;padding:20px;"><pre>  _   _           _             ____                _                   _   _             \n | | | |_ __   __| | ___ _ __  / ___|___  _ __  ___| |_ _ __ _   _  ___| |_(_) ___  _ __  \n | | | | \'_ \\ / _` |/ _ \\ \'__|| |   / _ \\| \'_ \\/ __| __| \'__| | | |/ __| __| |/ _ \\| \'_ \\ \n | |_| | | | | (_| |  __/ |   | |__| (_) | | | \\__ \\ |_| |  | |_| | (__| |_| | (_) | | | |\n  \\___/|_| |_|\\__,_|\\___|_|    \\____\\___/|_| |_|___/\\__|_|   \\__,_|\\___|\\__|_|\\___/|_| |_|\n</pre><p>Coming Soon...</p></body></html>',
            '{"success":false,"error":{"type":"ValidationError","message":"Request validation failed","details":[{"field":"email","message":"Invalid email format"},{"field":"password","message":"Password must be at least 8 characters"}]}}',
            'Server: Apache/2.4.57 (Ubuntu)\nX-Powered-By: PHP/8.2.0\nContent-Type: text/html; charset=UTF-8\nSet-Cookie: PHPSESSID=abc123; path=/; HttpOnly; Secure\n\n<!DOCTYPE html><html><head><title>phpinfo()</title></head><body>PHP Version 8.2.0</body></html>',
        ]
        
        # 获取域名目标
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL LIMIT 10")
        domain_targets = cur.fetchall()
        
        ids = []
        for target_id, target_name in domain_targets:
            for i in range(random.randint(3, 6)):
                protocol = random.choice(['https', 'http'])
                port = random.choice([80, 443, 8080, 8443, 3000])
                
                if port in [80, 443]:
                    url = f'{protocol}://{target_name}/'
                else:
                    url = f'{protocol}://{target_name}:{port}/'
                
                if i > 0:
                    path = random.choice(['admin/', 'api/', 'portal/', 'dashboard/'])
                    url = f'{protocol}://{target_name}:{port}/{path}'
                
                cur.execute("""
                    INSERT INTO website (
                        url, target_id, host, title, webserver, tech, status_code,
                        content_length, content_type, location, body_preview, vhost,
                        created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                    RETURNING id
                """, (
                    url, target_id, target_name, random.choice(titles),
                    random.choice(webservers), random.choice(tech_stacks),
                    random.choice([200, 301, 302, 403, 404]),
                    random.randint(1000, 500000), 'text/html; charset=utf-8',
                    f'https://{target_name}/login' if random.choice([True, False]) else '',
                    random.choice(body_previews),
                    random.choice([True, False, None])
                ))
                row = cur.fetchone()
                if row:
                    ids.append(row[0])
                    
        print(f"  ✓ 创建了 {len(ids)} 个网站\n")
        return ids

    def create_endpoints(self, target_ids: list):
        """创建端点"""
        print("🔗 创建端点...")
        cur = self.conn.cursor()
        
        paths = [
            '/api/v1/users/authentication/login', '/api/v1/users/authentication/logout',
            '/api/v1/users/profile/settings/preferences', '/api/v2/products/catalog/categories/list',
            '/api/v2/orders/checkout/payment-processing', '/api/v3/analytics/dashboard/metrics/summary',
            '/graphql/query', '/graphql/mutation', '/admin/dashboard/overview',
            '/admin/users/management/list', '/admin/settings/configuration/system',
            '/portal/customer/account/billing-history', '/internal/health/readiness-check',
            '/internal/metrics/prometheus-endpoint', '/webhook/payment/stripe/callback',
            '/oauth/authorize', '/oauth/token', '/swagger/v1/swagger.json', '/openapi/v3/api-docs',
        ]
        
        gf_patterns = [['debug', 'config'], ['api', 'json'], ['upload', 'file'], ['admin'], ['auth'], []]
        
        # 真实的 API 响应 body preview
        body_previews = [
            '{"status":"success","data":{"user_id":12345,"username":"john_doe","email":"john@example.com","role":"user","created_at":"2024-01-15T10:30:00Z","last_login":"2024-12-22T08:45:00Z"}}',
            '{"success":true,"message":"Authentication successful","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c","expires_in":3600}',
            '{"error":"Unauthorized","code":"AUTH_FAILED","message":"Invalid credentials provided. Please check your username and password.","timestamp":"2024-12-22T15:30:45.123Z","request_id":"req_abc123xyz"}',
            '{"data":{"products":[{"id":1,"name":"Enterprise License","price":999.99,"currency":"USD"},{"id":2,"name":"Professional License","price":499.99,"currency":"USD"},{"id":3,"name":"Basic License","price":99.99,"currency":"USD"}],"total":3,"page":1,"per_page":10}}',
            '{"health":{"status":"healthy","version":"2.4.1","uptime":"15d 6h 32m","checks":{"database":"ok","redis":"ok","elasticsearch":"ok","rabbitmq":"ok"},"memory":{"used":"2.1GB","total":"8GB"},"cpu":"23%"}}',
            '{"errors":[{"field":"email","message":"Email address is already registered"},{"field":"password","message":"Password must contain at least one uppercase letter, one number, and one special character"}],"code":"VALIDATION_ERROR"}',
            '{"result":{"query":"SELECT * FROM users WHERE id = ?","rows_affected":1,"execution_time_ms":12,"cached":false},"data":[{"id":1,"name":"Admin User","status":"active"}]}',
            '<!DOCTYPE html><html><head><title>GraphQL Playground</title><link rel="stylesheet" href="/graphql/playground.css"></head><body><div id="root"><div class="loading">Loading GraphQL Playground...</div></div><script src="/graphql/playground.js"></script></body></html>',
            '{"swagger":"2.0","info":{"title":"Enterprise API","description":"RESTful API for enterprise resource management","version":"1.0.0"},"host":"api.example.com","basePath":"/v1","schemes":["https"],"paths":{"/users":{"get":{"summary":"List users"}}}}',
            '{"openapi":"3.0.3","info":{"title":"User Management API","version":"2.0.0","description":"API for managing user accounts and permissions","contact":{"email":"api@example.com"}},"servers":[{"url":"https://api.example.com/v2","description":"Production server"}]}',
            '{"metrics":{"http_requests_total":{"value":1523456,"labels":{"method":"GET","status":"200"}},"http_request_duration_seconds":{"value":0.023,"labels":{"quantile":"0.99"}},"process_cpu_seconds_total":{"value":12345.67}}}',
            '# HELP http_requests_total Total number of HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",status="200"} 1523456\nhttp_requests_total{method="POST",status="201"} 45678\n# HELP http_request_duration_seconds HTTP request latency\nhttp_request_duration_seconds{quantile="0.5"} 0.012',
            '{"order":{"id":"ORD-2024-123456","status":"processing","items":[{"sku":"PROD-001","name":"Widget Pro","quantity":2,"price":49.99}],"subtotal":99.98,"tax":8.00,"shipping":5.99,"total":113.97,"created_at":"2024-12-22T14:30:00Z"}}',
            '{"session":{"id":"sess_abc123xyz789","user_id":12345,"ip_address":"192.168.1.100","user_agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36","created_at":"2024-12-22T10:00:00Z","expires_at":"2024-12-22T22:00:00Z","is_active":true}}',
            '{"rate_limit":{"limit":1000,"remaining":847,"reset":1703260800,"retry_after":null},"request_id":"req_xyz789abc123","timestamp":"2024-12-22T16:45:30Z"}',
            '{"webhook":{"id":"wh_123456","event":"payment.completed","data":{"payment_id":"pay_abc123","amount":9999,"currency":"usd","status":"succeeded","customer_id":"cus_xyz789"},"created":1703260800}}',
            '{"oauth":{"access_token":"ya29.a0AfH6SMBx...","token_type":"Bearer","expires_in":3600,"refresh_token":"1//0gYx...","scope":"openid email profile"}}',
            '{"debug":{"request":{"method":"POST","path":"/api/v1/users","headers":{"Content-Type":"application/json","Authorization":"Bearer ***"},"body":{"email":"test@example.com"}},"response":{"status":201,"time_ms":45},"trace_id":"trace_abc123"}}',
            '{"config":{"app":{"name":"Enterprise Portal","version":"3.2.1","environment":"production"},"features":{"dark_mode":true,"beta_features":false,"maintenance_mode":false},"limits":{"max_upload_size":"50MB","rate_limit":"1000/hour"}}}',
            '{"analytics":{"page_views":{"today":12345,"this_week":87654,"this_month":345678},"unique_visitors":{"today":4567,"this_week":23456,"this_month":98765},"bounce_rate":"32.5%","avg_session_duration":"4m 32s"}}',
            '{"search":{"query":"enterprise software","results":[{"id":1,"title":"Enterprise Resource Planning","score":0.95},{"id":2,"title":"Enterprise Security Suite","score":0.87}],"total":156,"took_ms":23,"page":1,"per_page":10}}',
            '{"batch":{"id":"batch_123","status":"completed","total_items":1000,"processed":1000,"failed":3,"started_at":"2024-12-22T10:00:00Z","completed_at":"2024-12-22T10:15:32Z","errors":[{"item_id":45,"error":"Invalid format"},{"item_id":123,"error":"Duplicate entry"}]}}',
            '{"notification":{"id":"notif_abc123","type":"email","recipient":"user@example.com","subject":"Your order has shipped","status":"delivered","sent_at":"2024-12-22T14:30:00Z","opened_at":"2024-12-22T15:45:00Z"}}',
            '{"cache":{"status":"hit","key":"user:12345:profile","ttl":3600,"size_bytes":2048,"created_at":"2024-12-22T10:00:00Z","last_accessed":"2024-12-22T16:30:00Z","hit_count":156}}',
            '{"queue":{"name":"email_notifications","messages":{"pending":234,"processing":12,"completed":45678,"failed":23},"consumers":3,"avg_processing_time_ms":150,"oldest_message_age":"2m 15s"}}',
        ]
        
        # 获取域名目标
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL LIMIT 8")
        domain_targets = cur.fetchall()
        
        count = 0
        for target_id, target_name in domain_targets:
            num = random.randint(15, 25)
            selected = random.sample(paths, min(num, len(paths)))
            
            for path in selected:
                protocol = random.choice(['https', 'http'])
                port = random.choice([443, 8443, 3000, 8080])
                url = f'{protocol}://{target_name}:{port}{path}' if port != 443 else f'{protocol}://{target_name}{path}'
                
                cur.execute("""
                    INSERT INTO endpoint (
                        url, target_id, host, title, webserver, status_code, content_length,
                        content_type, tech, location, body_preview, vhost, matched_gf_patterns,
                        created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (
                    url, target_id, target_name, 'API Documentation - Swagger UI',
                    random.choice(['nginx/1.24.0', 'gunicorn/21.2.0']),
                    random.choice([200, 201, 301, 400, 401, 403, 404, 500]),
                    random.randint(100, 50000), 'application/json',
                    random.choice([['Node.js', 'Express'], ['Python', 'FastAPI'], ['Go', 'Gin']]),
                    '', random.choice(body_previews),
                    random.choice([True, False, None]), random.choice(gf_patterns)
                ))
                count += 1
                
        print(f"  ✓ 创建了 {count} 个端点\n")


    def create_directories(self, target_ids: list, website_ids: list):
        """创建目录"""
        print("📁 创建目录...")
        cur = self.conn.cursor()
        
        if not website_ids:
            print("  ⚠ 没有网站，跳过\n")
            return
        
        dir_paths = [
            '/admin/', '/administrator/', '/wp-admin/', '/wp-content/', '/backup/', '/backups/',
            '/old/', '/archive/', '/temp/', '/test/', '/dev/', '/staging/', '/config/',
            '/api/', '/api/v1/', '/api/v2/', '/uploads/', '/files/', '/documents/', '/docs/',
            '/images/', '/assets/', '/static/', '/css/', '/js/', '/logs/', '/debug/',
            '/private/', '/secure/', '/internal/', '/data/', '/database/', '/phpmyadmin/',
            '/cgi-bin/', '/includes/', '/lib/', '/vendor/', '/node_modules/', '/plugins/',
            '/themes/', '/templates/', '/src/', '/app/', '/portal/', '/dashboard/', '/panel/',
            '/user/', '/users/', '/account/', '/profile/', '/member/', '/customer/',
        ]
        
        content_types = ['text/html; charset=utf-8', 'application/json', 'text/plain', 'text/css']
        
        # 获取网站信息（用于生成目录 URL）
        cur.execute("SELECT id, url, target_id FROM website LIMIT 15")
        websites = cur.fetchall()
        
        count = 0
        for website_id, website_url, target_id in websites:
            num = random.randint(20, 35)
            selected = random.sample(dir_paths, min(num, len(dir_paths)))
            
            for path in selected:
                url = website_url.rstrip('/') + path
                
                cur.execute("""
                    INSERT INTO directory (
                        url, target_id, status, content_length, words, lines,
                        content_type, duration, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (
                    url, target_id,
                    random.choice([200, 301, 302, 403, 404, 500]),
                    random.randint(0, 100000), random.randint(0, 5000), random.randint(0, 500),
                    random.choice(content_types), random.randint(10000000, 5000000000)
                ))
                count += 1
                
        print(f"  ✓ 创建了 {count} 个目录\n")

    def create_host_port_mappings(self, target_ids: list):
        """创建主机端口映射"""
        print("🔌 创建主机端口映射...")
        cur = self.conn.cursor()
        
        # 扩展端口列表，包含更多常见端口
        ports = [
            # 常见服务端口
            21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 161, 389, 443, 445,
            # 数据库端口
            1433, 1521, 3306, 5432, 6379, 9200, 27017,
            # Web 服务端口
            8000, 8080, 8081, 8443, 8888, 9000, 9090, 9443,
            # 其他常见端口
            993, 995, 1080, 1723, 2049, 2181, 3000, 3128, 3389, 4443, 5000, 5001,
            5432, 5672, 5900, 5984, 6000, 6443, 7001, 7002, 8001, 8002, 8008,
            8009, 8010, 8020, 8090, 8161, 8180, 8181, 8200, 8280, 8300, 8400,
            8500, 8600, 8686, 8787, 8880, 8983, 9001, 9002, 9003, 9080, 9091,
            9100, 9200, 9300, 9418, 9999, 10000, 10250, 11211, 15672, 27018, 50000,
        ]
        # 去重
        ports = list(set(ports))
        
        # 获取域名目标
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL LIMIT 8")
        domain_targets = cur.fetchall()
        
        count = 0
        for target_id, target_name in domain_targets:
            num_ips = random.randint(5, 10)
            
            for _ in range(num_ips):
                ip = f'192.168.{random.randint(1, 254)}.{random.randint(1, 254)}'
                # 增加每个 IP 的端口数量，8-20 个端口
                num_ports = random.randint(8, 20)
                selected_ports = random.sample(ports, min(num_ports, len(ports)))
                
                for port in selected_ports:
                    cur.execute("""
                        INSERT INTO host_port_mapping (target_id, host, ip, port, created_at)
                        VALUES (%s, %s, %s, %s, NOW())
                        ON CONFLICT DO NOTHING
                    """, (target_id, target_name, ip, port))
                    count += 1
                    
        print(f"  ✓ 创建了 {count} 个主机端口映射\n")

    def create_vulnerabilities(self, target_ids: list):
        """创建漏洞"""
        print("🐛 创建漏洞...")
        cur = self.conn.cursor()
        
        vuln_types = [
            'sql-injection', 'cross-site-scripting-xss', 'cross-site-request-forgery-csrf',
            'server-side-request-forgery-ssrf', 'xml-external-entity-xxe', 'remote-code-execution-rce',
            'local-file-inclusion-lfi', 'directory-traversal', 'authentication-bypass',
            'insecure-direct-object-reference-idor', 'sensitive-data-exposure', 'security-misconfiguration',
            'broken-access-control', 'cors-misconfiguration', 'subdomain-takeover',
            'exposed-admin-panel', 'default-credentials', 'information-disclosure',
        ]
        
        sources = ['nuclei', 'dalfox', 'sqlmap', 'crlfuzz', 'httpx', 'manual-testing']
        severities = ['unknown', 'info', 'low', 'medium', 'high', 'critical']
        
        descriptions = [
            'A SQL injection vulnerability was discovered in the login form. An attacker can inject malicious SQL queries through the username parameter.',
            'A reflected cross-site scripting (XSS) vulnerability was found in the search functionality. User input is not properly sanitized.',
            'Server-Side Request Forgery (SSRF) vulnerability detected in the URL preview feature. An attacker can manipulate the server to make requests to internal services.',
            'Remote Code Execution (RCE) vulnerability found in the file upload functionality. Insufficient validation of uploaded files allows attackers to upload malicious scripts.',
            'Authentication bypass vulnerability discovered in the password reset mechanism. Attackers can reset any users password without proper verification.',
            'Insecure Direct Object Reference (IDOR) vulnerability found in the user profile API. By manipulating the user ID parameter, attackers can access other users data.',
            'CORS misconfiguration detected - The Access-Control-Allow-Origin header is set to wildcard (*) with credentials allowed.',
            'Information disclosure through verbose error messages - Application errors reveal sensitive information about the technology stack.',
        ]
        
        paths = ['/api/v1/users/login', '/api/v2/search', '/admin/dashboard', '/portal/upload', '/graphql', '/oauth/authorize']
        
        # 获取域名目标
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL LIMIT 10")
        domain_targets = cur.fetchall()
        
        count = 0
        for target_id, target_name in domain_targets:
            num = random.randint(5, 15)
            
            for _ in range(num):
                severity = random.choice(severities)
                cvss_ranges = {
                    'critical': (9.0, 10.0), 'high': (7.0, 8.9), 'medium': (4.0, 6.9),
                    'low': (0.1, 3.9), 'info': (0.0, 0.0), 'unknown': (0.0, 10.0)
                }
                cvss_range = cvss_ranges.get(severity, (0.0, 10.0))
                cvss_score = round(random.uniform(*cvss_range), 1)
                
                path = random.choice(paths)
                url = f'https://{target_name}{path}?param=test&id={random.randint(1, 1000)}'
                
                raw_output = json.dumps({
                    'template': f'CVE-2024-{random.randint(10000, 99999)}',
                    'matcher_name': 'default',
                    'severity': severity,
                    'host': target_name,
                    'matched_at': url,
                })
                
                cur.execute("""
                    INSERT INTO vulnerability (
                        target_id, url, vuln_type, severity, source, cvss_score,
                        description, raw_output, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    target_id, url, random.choice(vuln_types), severity,
                    random.choice(sources), cvss_score, random.choice(descriptions), raw_output
                ))
                count += 1
                
        print(f"  ✓ 创建了 {count} 个漏洞\n")

    def create_subdomain_snapshots(self, scan_ids: list):
        """创建子域名快照"""
        print("📸 创建子域名快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        prefixes = [
            'api', 'admin', 'portal', 'dashboard', 'app', 'mobile', 'staging', 'dev',
            'test', 'qa', 'uat', 'beta', 'mail', 'vpn', 'cdn', 'static',
        ]
        
        count = 0
        for scan_id in scan_ids[:15]:  # 为前15个扫描创建快照
            # 获取扫描对应的目标域名
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            num = random.randint(5, 15)
            selected = random.sample(prefixes, min(num, len(prefixes)))
            
            for prefix in selected:
                subdomain_name = f'{prefix}.{target_name}'
                cur.execute("""
                    INSERT INTO subdomain_snapshot (scan_id, name, created_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (scan_id, subdomain_name))
                count += 1
                
        print(f"  ✓ 创建了 {count} 个子域名快照\n")

    def create_website_snapshots(self, scan_ids: list):
        """创建网站快照"""
        print("📸 创建网站快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        titles = [
            'Enterprise Portal - Login', 'Admin Dashboard', 'API Documentation',
            'Customer Portal', 'Developer Console', 'Support Center',
        ]
        webservers = ['nginx/1.24.0', 'Apache/2.4.57', 'cloudflare']
        tech_stacks = [['React', 'Node.js'], ['Vue.js', 'Django'], ['Angular', 'Spring Boot']]
        
        count = 0
        for scan_id in scan_ids[:15]:
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            for i in range(random.randint(2, 5)):
                protocol = random.choice(['https', 'http'])
                port = random.choice([80, 443, 8080])
                url = f'{protocol}://{target_name}:{port}/' if port not in [80, 443] else f'{protocol}://{target_name}/'
                
                cur.execute("""
                    INSERT INTO website_snapshot (
                        scan_id, url, host, title, web_server, tech, status,
                        content_length, content_type, location, body_preview, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (
                    scan_id, url, target_name, random.choice(titles),
                    random.choice(webservers), random.choice(tech_stacks),
                    random.choice([200, 301, 403]),
                    random.randint(1000, 50000), 'text/html; charset=utf-8',
                    '',  # location 字段
                    '<!DOCTYPE html><html><head><title>Test</title></head><body>Content</body></html>'
                ))
                count += 1
                
        print(f"  ✓ 创建了 {count} 个网站快照\n")

    def create_endpoint_snapshots(self, scan_ids: list):
        """创建端点快照"""
        print("📸 创建端点快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        paths = [
            '/api/v1/users', '/api/v1/auth/login', '/api/v2/products',
            '/admin/dashboard', '/graphql', '/health', '/metrics',
        ]
        
        count = 0
        for scan_id in scan_ids[:15]:
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            for path in random.sample(paths, random.randint(3, 6)):
                url = f'https://{target_name}{path}'
                cur.execute("""
                    INSERT INTO endpoint_snapshot (
                        scan_id, url, host, title, status_code, content_length,
                        location, webserver, content_type, tech, body_preview,
                        matched_gf_patterns, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (
                    scan_id, url, target_name, 'API Endpoint',
                    random.choice([200, 201, 401, 403, 404]),
                    random.randint(100, 5000),
                    '',  # location
                    'nginx/1.24.0',
                    'application/json', ['REST', 'JSON'],
                    '{"status":"ok","data":{}}',
                    []  # matched_gf_patterns
                ))
                count += 1
                
        print(f"  ✓ 创建了 {count} 个端点快照\n")

    def create_directory_snapshots(self, scan_ids: list):
        """创建目录快照"""
        print("📸 创建目录快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        dirs = [
            '/admin/', '/backup/', '/config/', '/uploads/', '/static/',
            '/assets/', '/images/', '/js/', '/css/', '/api/',
        ]
        
        count = 0
        for scan_id in scan_ids[:15]:
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            for d in random.sample(dirs, random.randint(3, 7)):
                url = f'https://{target_name}{d}'
                cur.execute("""
                    INSERT INTO directory_snapshot (
                        scan_id, url, status, content_length, words, lines,
                        content_type, duration, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (
                    scan_id, url, random.choice([200, 301, 403]),
                    random.randint(500, 10000), random.randint(50, 500),
                    random.randint(10, 100), 'text/html',
                    random.randint(10000000, 500000000)  # 纳秒
                ))
                count += 1
                
        print(f"  ✓ 创建了 {count} 个目录快照\n")

    def create_host_port_mapping_snapshots(self, scan_ids: list):
        """创建主机端口映射快照"""
        print("📸 创建主机端口映射快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        common_ports = [22, 80, 443, 3306, 5432, 6379, 8080, 8443, 9000]
        
        count = 0
        for scan_id in scan_ids[:15]:
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            # 生成随机 IP
            ip = f'192.168.{random.randint(1, 254)}.{random.randint(1, 254)}'
            
            for port in random.sample(common_ports, random.randint(3, 6)):
                cur.execute("""
                    INSERT INTO host_port_mapping_snapshot (
                        scan_id, host, ip, port, created_at
                    ) VALUES (%s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (scan_id, target_name, ip, port))
                count += 1
                
        print(f"  ✓ 创建了 {count} 个主机端口映射快照\n")

    def create_vulnerability_snapshots(self, scan_ids: list):
        """创建漏洞快照"""
        print("📸 创建漏洞快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        vuln_types = ['xss', 'sqli', 'ssrf', 'lfi', 'rce', 'xxe', 'csrf']
        severities = ['critical', 'high', 'medium', 'low', 'info']
        sources = ['nuclei', 'dalfox', 'sqlmap']
        
        count = 0
        for scan_id in scan_ids[:15]:
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            for _ in range(random.randint(2, 8)):
                severity = random.choice(severities)
                cvss_ranges = {
                    'critical': (9.0, 10.0), 'high': (7.0, 8.9), 'medium': (4.0, 6.9),
                    'low': (0.1, 3.9), 'info': (0.0, 0.0)
                }
                cvss_range = cvss_ranges.get(severity, (0.0, 10.0))
                cvss_score = round(random.uniform(*cvss_range), 1)
                
                url = f'https://{target_name}/api/v1/users?id={random.randint(1, 100)}'
                
                cur.execute("""
                    INSERT INTO vulnerability_snapshot (
                        scan_id, url, vuln_type, severity, source, cvss_score,
                        description, raw_output, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    scan_id, url, random.choice(vuln_types), severity,
                    random.choice(sources), cvss_score,
                    f'Detected {severity} severity vulnerability',
                    json.dumps({'template': f'CVE-2024-{random.randint(10000, 99999)}'})
                ))
                count += 1
                
        print(f"  ✓ 创建了 {count} 个漏洞快照\n")


def main():
    parser = argparse.ArgumentParser(description="直接通过 SQL 生成测试数据")
    parser.add_argument('--clear', action='store_true', help='清除现有数据后重新生成')
    args = parser.parse_args()
    
    generator = TestDataGenerator(clear=args.clear)
    generator.run()


if __name__ == "__main__":
    main()
