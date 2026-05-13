-- 00_extensions.sql
-- Extensiones necesarias para UUID y generación criptográfica.

create extension if not exists pgcrypto;
