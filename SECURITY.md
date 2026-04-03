# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to [security contact email]
3. Include a detailed description of the vulnerability
4. Allow up to 48 hours for initial response

## Security Features

- JWT-based authentication with secure cookie storage
- Rate limiting on all public endpoints
- Input validation and sanitization
- HTTPS enforcement in production
- Helmet.js security headers
- CORS configuration
- bcrypt password hashing
- GPS tracking with geofence alerts
