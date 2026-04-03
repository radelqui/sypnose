# Herramientas del Servidor

## Sistema
- OS: Ubuntu 22.04 LTS
- Shell: bash
- Node.js: 22.x
- Python: 3.12.3
- PostgreSQL: via Supabase (127.0.0.1:5433)

## Docker Containers Principales
| Container | Puerto | Funcion |
|-----------|--------|---------|
| gestoriard-app | 3000 | App Next.js GestoriaRD |
| nginx-waf-gestoriard | 3080 | Proxy reverso + WAF |
| coolify | 8000 | Plataforma de deploy |
| coolify-db | - | PostgreSQL de Coolify |
| supabase-pooler | 5432 | Connection pooler BD |
| supabase-rest | 3001 | PostgREST API |
| supabase-kong | 8100 | API Gateway Supabase |
| n8n | 5678 | Workflow automation |
| minio | 9000 | Object storage |
| facturaia-ocr | - | OCR FacturaIA |

## APIs Locales
| API | Puerto | Uso |
|-----|--------|-----|
| CLIProxyAPI | 8317 | Gateway IA (Claude + Gemini) |
| Perplexity Proxy | 8318 | Busquedas web |
| DGII Scraper | 8321 | Scraping portal DGII |
| n8n | 5678 | Workflows |
| Supabase Studio | 3001 | Admin BD |

## Paths de Proyectos
| Proyecto | Path |
|----------|------|
| GestoriaRD | ~/gestoriard-widget-clean |
| FacturaIA | ~/eas-builds/FacturaScannerApp |
| IATRADER | ~/IATRADER |
| DGII Scraper | ~/dgii-scraper |
| O365 Sync | ~/o365-sync |
| Seguridad | ~/servidor-infra |

## Servicios systemd (user)
- cliproxyapi.service
- perplexity-proxy.service
- ir2-pipeline-api.service
- mt5-trading.service
- iatrader-orquestador.service

## BD Supabase (PostgreSQL 127.0.0.1:5433)
User: postgres
Tablas principales: clientes, tareas_fiscales, dgii_*, credenciales_tss, templates_cartas
