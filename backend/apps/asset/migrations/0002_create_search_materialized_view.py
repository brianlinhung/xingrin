"""
创建资产搜索 IMMV（增量维护物化视图）

使用 pg_ivm 扩展创建 IMMV，数据变更时自动增量更新，无需手动刷新。

包含：
1. asset_search_view - Website 搜索视图
2. endpoint_search_view - Endpoint 搜索视图

重要限制：
⚠️ pg_ivm 不支持数组类型字段（ArrayField），因为其使用 anyarray 伪类型进行比较时，
PostgreSQL 无法确定空数组的元素类型，导致错误：
  "cannot determine element type of \"anyarray\" argument"

因此，所有 ArrayField 字段（tech, matched_gf_patterns 等）已从 IMMV 中移除，
搜索时通过 JOIN 原表获取。

如需添加新的数组字段，请：
1. 不要将其包含在 IMMV 视图中
2. 在搜索服务中通过 JOIN 原表获取
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('asset', '0001_initial'),
    ]

    operations = [
        # 1. 确保 pg_trgm 扩展已启用（用于文本模糊搜索索引）
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql="-- pg_trgm extension kept for other uses"
        ),
        
        # 2. 确保 pg_ivm 扩展已启用（用于 IMMV 增量维护）
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_ivm;",
            reverse_sql="-- pg_ivm extension kept for other uses"
        ),
        
        # ==================== Website IMMV ====================
        
        # 2. 创建 asset_search_view IMMV
        # ⚠️ 注意：不包含 w.tech 数组字段，pg_ivm 不支持 ArrayField
        # 数组字段通过 search_service.py 中 JOIN website 表获取
        migrations.RunSQL(
            sql="""
                SELECT pgivm.create_immv('asset_search_view', $$
                    SELECT 
                        w.id,
                        w.url,
                        w.host,
                        w.title,
                        w.status_code,
                        w.response_headers,
                        w.response_body,
                        w.content_type,
                        w.content_length,
                        w.webserver,
                        w.location,
                        w.vhost,
                        w.created_at,
                        w.target_id
                    FROM website w
                $$);
            """,
            reverse_sql="SELECT pgivm.drop_immv('asset_search_view');"
        ),
        
        # 3. 创建 asset_search_view 索引
        migrations.RunSQL(
            sql="""
                -- 唯一索引
                CREATE UNIQUE INDEX IF NOT EXISTS asset_search_view_id_idx 
                ON asset_search_view (id);
                
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
                
                -- status_code 索引
                CREATE INDEX IF NOT EXISTS asset_search_view_status_idx 
                ON asset_search_view (status_code);
                
                -- created_at 排序索引
                CREATE INDEX IF NOT EXISTS asset_search_view_created_idx 
                ON asset_search_view (created_at DESC);
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS asset_search_view_id_idx;
                DROP INDEX IF EXISTS asset_search_view_host_trgm_idx;
                DROP INDEX IF EXISTS asset_search_view_title_trgm_idx;
                DROP INDEX IF EXISTS asset_search_view_url_trgm_idx;
                DROP INDEX IF EXISTS asset_search_view_headers_trgm_idx;
                DROP INDEX IF EXISTS asset_search_view_body_trgm_idx;
                DROP INDEX IF EXISTS asset_search_view_status_idx;
                DROP INDEX IF EXISTS asset_search_view_created_idx;
            """
        ),

        # ==================== Endpoint IMMV ====================
        
        # 4. 创建 endpoint_search_view IMMV
        # ⚠️ 注意：不包含 e.tech 和 e.matched_gf_patterns 数组字段，pg_ivm 不支持 ArrayField
        # 数组字段通过 search_service.py 中 JOIN endpoint 表获取
        migrations.RunSQL(
            sql="""
                SELECT pgivm.create_immv('endpoint_search_view', $$
                    SELECT 
                        e.id,
                        e.url,
                        e.host,
                        e.title,
                        e.status_code,
                        e.response_headers,
                        e.response_body,
                        e.content_type,
                        e.content_length,
                        e.webserver,
                        e.location,
                        e.vhost,
                        e.created_at,
                        e.target_id
                    FROM endpoint e
                $$);
            """,
            reverse_sql="SELECT pgivm.drop_immv('endpoint_search_view');"
        ),
        
        # 5. 创建 endpoint_search_view 索引
        migrations.RunSQL(
            sql="""
                -- 唯一索引
                CREATE UNIQUE INDEX IF NOT EXISTS endpoint_search_view_id_idx 
                ON endpoint_search_view (id);
                
                -- host 模糊搜索索引
                CREATE INDEX IF NOT EXISTS endpoint_search_view_host_trgm_idx 
                ON endpoint_search_view USING gin (host gin_trgm_ops);
                
                -- title 模糊搜索索引
                CREATE INDEX IF NOT EXISTS endpoint_search_view_title_trgm_idx 
                ON endpoint_search_view USING gin (title gin_trgm_ops);
                
                -- url 模糊搜索索引
                CREATE INDEX IF NOT EXISTS endpoint_search_view_url_trgm_idx 
                ON endpoint_search_view USING gin (url gin_trgm_ops);
                
                -- response_headers 模糊搜索索引
                CREATE INDEX IF NOT EXISTS endpoint_search_view_headers_trgm_idx 
                ON endpoint_search_view USING gin (response_headers gin_trgm_ops);
                
                -- response_body 模糊搜索索引
                CREATE INDEX IF NOT EXISTS endpoint_search_view_body_trgm_idx 
                ON endpoint_search_view USING gin (response_body gin_trgm_ops);
                
                -- status_code 索引
                CREATE INDEX IF NOT EXISTS endpoint_search_view_status_idx 
                ON endpoint_search_view (status_code);
                
                -- created_at 排序索引
                CREATE INDEX IF NOT EXISTS endpoint_search_view_created_idx 
                ON endpoint_search_view (created_at DESC);
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS endpoint_search_view_id_idx;
                DROP INDEX IF EXISTS endpoint_search_view_host_trgm_idx;
                DROP INDEX IF EXISTS endpoint_search_view_title_trgm_idx;
                DROP INDEX IF EXISTS endpoint_search_view_url_trgm_idx;
                DROP INDEX IF EXISTS endpoint_search_view_headers_trgm_idx;
                DROP INDEX IF EXISTS endpoint_search_view_body_trgm_idx;
                DROP INDEX IF EXISTS endpoint_search_view_status_idx;
                DROP INDEX IF EXISTS endpoint_search_view_created_idx;
            """
        ),
    ]
