"""
Network helpers for provider-specific connectivity workarounds.
"""
from __future__ import annotations

import socket
from contextlib import contextmanager
from typing import Iterator


@contextmanager
def prefer_ipv4_for_hosts(*hosts: str) -> Iterator[None]:
    """
    Temporarily resolve specific hosts over IPv4 only.

    Some Windows environments time out when third-party libraries resolve Gmail
    transports with the default address family selection. Forcing IPv4 keeps
    the hostname intact for TLS while avoiding the broken resolution path.
    """
    normalized_hosts = {host.lower().strip() for host in hosts if host}
    original_getaddrinfo = socket.getaddrinfo

    def ipv4_only_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        host_text = host.decode() if isinstance(host, bytes) else str(host)
        if host_text.lower().strip() in normalized_hosts:
            return original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
        return original_getaddrinfo(host, port, family, type, proto, flags)

    socket.getaddrinfo = ipv4_only_getaddrinfo
    try:
        yield
    finally:
        socket.getaddrinfo = original_getaddrinfo


def can_connect_to_host(host: str, port: int, timeout_seconds: float = 3.0) -> bool:
    """Return True when a TCP connection to host:port succeeds quickly."""
    try:
        with socket.create_connection((host, port), timeout=timeout_seconds):
            return True
    except OSError:
        return False
