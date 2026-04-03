# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- MCP Server for admin operations via OpenClaw
- CLI tool for project management
- GPS tracking showcase on homepage
- Demo car seed script (10 vehicles)
- Health check endpoint for backend
- Rate limiting on public API endpoints
- Error boundary for frontend React app
- SEO meta tags and structured data
- Database backup script

### Changed
- Complete frontend UX redesign with modern green/gold theme
- Improved error handling - no stack traces exposed to clients
- Reduced request body size limit from 50MB to 5MB
- Enhanced Docker configurations with health checks

### Removed
- Car Sales/Marketplace module (frontend, backend, admin, mobile, types)

### Security
- Added rate limiting to auth and payment endpoints
- Fixed JWT/Cookie secret validation for production
- Added input sanitization
- Fixed external link security (rel="noreferrer noopener")
- Removed hardcoded credentials from .env.example
