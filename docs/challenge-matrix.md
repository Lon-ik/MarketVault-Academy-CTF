# Матрица челленджей

| # | Slug | Сервис | Категория | Сложность |
|---|------|--------|-----------|-----------|
| 1 | jwt-alg-none | auth-service | JWT | easy |
| 2 | jwt-weak-secret | auth-service | JWT | medium |
| 3 | sqli-auth-bypass | auth-service | SQL Injection | easy |
| 4 | mass-assignment-role | auth-service | Mass Assignment | medium |
| 5 | brute-force-login | auth-service | Brute Force | easy |
| 6 | open-redirect-login | auth-service | Open Redirect | easy |
| 7 | password-reset-poisoning | auth-service | Host Header | hard |
| 8 | graphql-introspection | api-gateway | GraphQL | easy |
| 9 | graphql-batching-dos | api-gateway | GraphQL | hard |
| 10 | prototype-pollution | api-gateway | Prototype Pollution | medium |
| 11 | ssrf-image-fetch | api-gateway | SSRF | medium |
| 12 | cors-wildcard-credentials | api-gateway | CORS | easy |
| 13 | graphql-idor | api-gateway | IDOR | medium |
| 14 | legacy-lfi | legacy-service | LFI | easy |
| 15 | legacy-rfi | legacy-service | RFI | hard |
| 16 | legacy-xxe | legacy-service | XXE | medium |
| 17 | legacy-command-injection | legacy-service | Command Injection | easy |
| 18 | legacy-php-object-injection | legacy-service | Deserialization | hard |
| 19 | legacy-upload-php | legacy-service | File Upload | medium |
| 20 | inventory-idor | inventory-service | IDOR | easy |
| 21 | inventory-race-condition | inventory-service | Race Condition | hard |
| 22 | inventory-path-traversal | inventory-service | Path Traversal | medium |
| 23 | nosql-auth-bypass | api-gateway | NoSQL | easy |
| 24 | nosql-blind | api-gateway | NoSQL | medium |
| 25 | dom-xss | frontend | XSS | easy |
| 26 | csrf-profile-change | frontend | CSRF | medium |
| 27 | clickjacking-checkout | frontend | Clickjacking | easy |
| 28 | postmessage-xss | frontend | XSS | medium |
| 29 | session-fixation | auth-service | Session Fixation | hard |
| 30 | cache-poisoning | api-gateway | Cache Poisoning | hard |

## Распределение

| Сервис | Чеllенджей |
|--------|-----------|
| auth-service | 8 |
| api-gateway | 9 |
| legacy-service | 6 |
| inventory-service | 3 |
| frontend | 4 |

## Сложность

| Уровень | Количество |
|---------|-----------|
| easy | 12 |
| medium | 10 |
| hard | 8 |