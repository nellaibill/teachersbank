# Teachers Bank API — Setup Guide

## Tech Stack
- **Backend:** PHP 8.x
- **Database:** MySQL 8.x
- **Web Server:** Apache (with mod_rewrite) or Nginx
- **Frontend:** Next.js (connects to this API)

---

## Project Structure

```
teachers-bank-api/
├── .htaccess                  # URL rewriting rules
├── API_CURL_COMMANDS.sh       # cURL test commands
├── README.md                  # This file
├── config/
│   ├── database.php           # DB credentials
│   └── schema.sql             # Database schema
├── middleware/
│   ├── cors.php               # CORS headers + response helpers
│   └── barcode.php            # Barcode string generator
└── api/
    ├── teachers/
    │   ├── index.php          # GET (list) + POST (create)
    │   └── single.php         # GET/PUT/DELETE by ID
    ├── dispatch/
    │   └── index.php          # GET (list/single) + POST (scan) + PUT
    ├── followups/
    │   └── index.php          # GET + POST + PUT
    └── reports/
        └── index.php          # Consolidated / Label / Dispatch / School Address
```

---

## Setup Steps

### 1. Database
```sql
-- Run schema.sql in MySQL
mysql -u root -p < config/schema.sql
```

### 2. Configure DB credentials
Edit `config/database.php`:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('DB_NAME', 'teachers_bank');
```

### 3. Apache — Enable mod_rewrite
```bash
a2enmod rewrite
# Ensure AllowOverride All in your VirtualHost config
```

### 4. Deploy
Place the `teachers-bank-api/` folder inside your Apache web root (e.g., `/var/www/html/`).

---

## API Endpoints Summary

| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | /api/teachers             | List teachers (with filters/search)  |
| POST   | /api/teachers             | Create new teacher + auto-barcode    |
| GET    | /api/teachers/{id}        | Get teacher + dispatch history       |
| PUT    | /api/teachers/{id}        | Update teacher details               |
| DELETE | /api/teachers/{id}        | Soft-delete (deactivate) teacher     |
| GET    | /api/dispatch             | List dispatches                      |
| GET    | /api/dispatch?id={id}     | Get dispatch + followups             |
| POST   | /api/dispatch             | Scan barcode → create dispatch       |
| PUT    | /api/dispatch?id={id}     | Update POD date / status             |
| GET    | /api/followups            | List followups                       |
| GET    | /api/followups?id={id}    | Get single followup                  |
| POST   | /api/followups            | Create follow-up manually            |
| PUT    | /api/followups?id={id}    | Update status/remarks/date           |
| GET    | /api/reports?type=...     | Generate reports                     |

### Report Types
- `consolidated` — All teachers with dispatch/followup summary
- `label` — Print-ready label data with barcode
- `dispatch` — Dispatch history with filters
- `school_address` — School address labels

---

## Barcode Format
```
ARL|EN6|X|EM|01|000001
  ^   ^  ^ ^  ^  ^
  |   |  | |  |  Auto ID (6-digit padded)
  |   |  | |  Standard
  |   |  | Medium (TM/EM)
  |   |  Subject Code
  |   District Code
  Prefix
```

---

## Dispatch Logic
1. User scans barcode → `POST /api/dispatch` with `barcode`
2. API finds teacher by barcode value
3. If already dispatched today → returns `409 Conflict`
4. Otherwise → creates dispatch record + Follow-up Level 1 (reminder = dispatch_date + 10 days)
5. Returns success with dispatch record and reminder date

## Followup Escalation Logic
- Level 1: dispatch_date + 10 days
- Level 2: dispatch_date + 20 days
- Level 3: dispatch_date + 30 days
- Level 4: dispatch_date + 40 days
- When status is set to `Informed` or `Completed` on levels 1–3, **next level is auto-created**

---

## Next.js Integration
Set in your `.env.local`:
```
NEXT_PUBLIC_API_BASE=http://localhost/teachers-bank-api
```

Example fetch:
```js
const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/teachers?page=1`);
const data = await res.json();
```
