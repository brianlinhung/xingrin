"""
创建资产搜索物化视图和刷新状态表

物化视图用于加速资产搜索，避免实时 JOIN 大表。
刷新状态表用于控制物化视图的刷新时机（防抖机制）。
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('asset', '0001_initial'),
    ]

    operations = [
        # 1. 创建刷新状态表
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS asset_search_refresh_status (
                    id SERIAL PRIMARY KEY,
                    needs_refresh BOOLEAN DEFAULT FALSE,
                    last_refresh_at TIMESTAMP WITH TIME ZONE,
                    last_refresh_duration_ms INTEGER,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                -- 插入初始记录（单例模式，只有一条记录）
                INSERT INTO asset_search_refresh_status (id, needs_refresh)
                VALUES (1, FALSE)
                ON CONFLICT (id) DO NOTHING;
            """,
            reverse_sql="""
                DROP TABLE IF EXISTS asset_search_refresh_status;
            """
        ),
        
        # 2. 创建物化视图
        migrations.RunSQL(
            sql="""
                CREATE MATERIALIZED VIEW asset_search_view AS
                SELECT 
                    w.id,
                    w.url,
                    w.host,
                    w.title,
                    w.tech,
                    w.status_code,
                    w.webserver,
                    w.response_headers,
                    w.response_body,
                    w.content_type,
                    w.created_at,
                    w.target_id,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', v.id,
                                'name', v.vuln_type,
                                'vuln_type', v.vuln_type,
                                'severity', v.severity,
                                'url', v.url
                            )
                        ) FILTER (WHERE v.id IS NOT NULL),
                        '[]'::json
                    ) AS vulnerabilities
                FROM website w
                LEFT JOIN vulnerability v ON w.target_id = v.target_id
                GROUP BY w.id, w.url, w.host, w.title, w.tech, w.status_code, 
                         w.webserver, w.response_headers, w.response_body, 
                         w.content_type, w.created_at, w.target_id;
            """,
            reverse_sql="""
                DROP MATERIALIZED VIEW IF EXISTS asset_search_view;
            """
        ),
        
        # 3. 创建唯一索引（支持 CONCURRENTLY 刷新）
        migrations.RunSQL(
            sql="""
                CREATE UNIQUE INDEX IF NOT EXISTS asset_search_view_id_idx 
                ON asset_search_view (id);
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS asset_search_view_id_idx;
            """
        ),
        
        # 4. 创建搜索优化索引
        migrations.RunSQL(
            sql="""
                -- host 模糊搜索索引
                CREATE INDEX IF NOT EXISTS asset_search_view_host_trgm_idx 
                ON asset_search_view USING gin (host gin_trgm_ops);
                
                -- title 模糊搜索索引
                CREATE INDEX IF NOT EXISTS asset_search_view_title_trgm_idx 
                ON asset_search_view USING gin (title gin_trgm_ops);
                
                -- url 模糊搜索索引
                CREATE INDEX IF NOT EXISTS asset_search_view_url_trgm_idx 
                ON asset_search_view USING gin (url gin_trgm_ops);
                
                -- response_headers 模糊搜索索引
                CREATE INDEX IF NOT EXISTS asset_search_view_headers_trgm_idx 
                ON asset_search_view USING gin (response_headers gin_trgm_ops);
                
                -- response_body 模糊搜索索引
                CREATE INDEX IF NOT EXISTS asset_search_view_body_trgm_idx 
                ON asset_search_view USING gin (response_body gin_trgm_ops);
                
                -- tech 数组索引
                CREATE INDEX IF NOT EXISTS asset_search_view_tech_idx 
                ON asset_search_view USING gin (tech);
                
                -- status_code 索引
                CREATE INDEX IF NOT EXISTS asset_search_view_status_idx 
                ON asset_search_view (status_code);
                
                -- created_at 排序索引
                CREATE INDEX IF NOT EXISTS asset_search_view_created_idx 
                ON asset_search_view (created_at DESC);
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS asset_search_view_host_trgm_idx;
                DROP INDEX IF EXISTS asset_search_view_title_trgm_idx;
                DROP INDEX IF EXISTS asset_search_view_url_trgm_idx;
                DROP INDEX IF EXISTS asset_search_view_headers_trgm_idx;
                DROP INDEX IF EXISTS asset_search_view_body_trgm_idx;
                DROP INDEX IF EXISTS asset_search_view_tech_idx;
                DROP INDEX IF EXISTS asset_search_view_status_idx;
                DROP INDEX IF EXISTS asset_search_view_created_idx;
            """
        ),
    ]
