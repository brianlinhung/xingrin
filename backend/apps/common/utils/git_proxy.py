"""Git proxy utilities for URL acceleration."""

import os
from urllib.parse import urlparse


def get_git_proxy_url(original_url: str) -> str:
    """
    Convert Git repository URL to proxy format for acceleration.
    
    Supports multiple mirror services (standard format):
    - gh-proxy.org: https://gh-proxy.org/https://github.com/user/repo.git
    - ghproxy.com: https://ghproxy.com/https://github.com/user/repo.git
    - mirror.ghproxy.com: https://mirror.ghproxy.com/https://github.com/user/repo.git
    - ghps.cc: https://ghps.cc/https://github.com/user/repo.git
    
    Args:
        original_url: Original repository URL, e.g., https://github.com/user/repo.git
        
    Returns:
        Converted URL based on GIT_MIRROR setting.
        If GIT_MIRROR is not set, returns the original URL unchanged.
    """
    git_mirror = os.getenv("GIT_MIRROR", "").strip()
    if not git_mirror:
        return original_url
    
    # Remove trailing slash from mirror URL if present
    git_mirror = git_mirror.rstrip("/")
    
    parsed = urlparse(original_url)
    host = parsed.netloc.lower()
    
    # Only support GitHub for now
    if "github.com" not in host:
        return original_url
    
    # Standard format: https://mirror.example.com/https://github.com/user/repo.git
    return f"{git_mirror}/{original_url}"
