# Teachers Bank Application — Comprehensive Analysis

**Document Date:** March 30, 2026  
**Purpose:** Complete reference guide for understanding the Teachers Bank system architecture, workflows, and implementation details.

### Recent Changes (March 30, 2026)
- **Dispatch Update Restoration**: Restored and enhanced dispatch update functionality
  - Re-added PO Number and PO Date fields (shown when status = "Dispatched")
  - Added Delivery Date field (shown when status = "Delivered")
  - Added validation: PO fields required for "Dispatched" status, Delivery Date required for "Delivered" status
  - Updated dispatch list table to show PO Number and Delivered Date columns
  - Created migration v6 to add po_date column to dispatch table

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Database Schema](#database-schema)
6. [Workflows](#core-workflows)
7. [API Endpoints](#api-endpoint-summary)
8. [Authentication & Authorization](#authentication--authorization)
9. [Frontend Pages & Features](#frontend-pages--features)
10. [Key Technical Features](#key-features--specifications)
11. [Data Flow Examples](#data-flow-examples)
12. [Security Implementation](#security-implementation)
13. [Configuration & Deployment](#configuration--deployment)
14. [Notable Implementation Details](#notable-implementation-details)

---

## Project Overview

**Teachers Bank** is a comprehensive teacher management and dispatch tracking system designed specifically for Tamil Nadu's education system. The system manages:

- **Teacher Records**: Detailed registration of teachers with multi-subject, multi-standard, multi-medium capabilities
- **Document Dispatch**: Barcode-based tracking of materials/documents sent to teachers
- **Follow-up Escalation**: Progressive follow-up workflow with automated reminders and manual escalation
- **Reporting**: Multiple report types for consolidated analysis, label printing, audit, and school-level mailing

### Key Use Cases

1. **Material Distribution**: Distribute textbooks, stationery, or documents to teachers across 36 Tamil Nadu districts
2. **Receipt Tracking**: Confirm teacher receipt of materials with proof-of-delivery (POD) tracking
3. **Follow-up Management**: Automated reminder system to contact teachers if materials not received in time
4. **Batch Operations**: Print mailing labels, generate reports, track dispatch history

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│             Next.js 14 Frontend (TypeScript)                 │
│  (Dashboard, Teachers, Dispatch, Follow-ups, Reports, Users)│
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS REST API
                       │ JWT Authentication
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          PHP 8.x Backend (Single Entry Point)                │
│  config/    → Database configuration                         │
│  middleware → CORS, JWT validation, barcode generation       │
│  api/       → Teachers, Dispatch, Follow-ups, Reports, Auth  │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQL Prepared Statements
                       │ Unique constraints
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            MySQL 8.x Database                                │
│  Tables: teachers, dispatch, followups, users                │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Frontend** initiates HTTP request with JWT token in `Authorization: Bearer <token>` header
2. **index.php Router** extracts path, validates JWT, checks RBAC permissions
3. **API Handler** (teachers/dispatch/followups/reports/users) executes business logic
4. **Database** retrieves/updates data using prepared statements
5. **Response** sent back as JSON with status code and data

---

## Tech Stack

### Backend
- **Language**: PHP 8.x
- **Database**: MySQL 8.x
- **Server**: Apache (with mod_rewrite) or Nginx
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Bcrypt password hashing, prepared statements

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + custom design tokens
- **UI Libraries**:
  - `react-hot-toast` — notifications
  - `lucide-react` — icons
  - `JsBarcode` — barcode rendering
- **Fonts**: 
  - Fraunces (serif, display)
  - DM Sans (body)
  - DM Mono (code)
- **State**: React Context (authentication)
- **HTTP**: Fetch API with JWT headers

### Development Tools
- **Next.js**: npm run dev (development server)
- **Package Manager**: npm/yarn
- **Database Management**: MySQL CLI or MySQL Workbench

---

## Folder Structure

### Backend (`teachers-bank-api/`)

```
teachers-bank-api/
├── index.php                      # Single entry point router
├── README.md                       # Setup & API documentation
├── postman-reference.json          # API testing reference
├── test.json                       # Test data
│
├── config/
│   ├── database.php               # MySQL connection & credentials
│   ├── schema.sql                 # Complete database schema
│   └── auth_schema.sql            # Alternative auth schema
│
├── middleware/
│   ├── cors.php                   # CORS headers + response helpers
│   ├── jwt.php                    # JWT token validation
│   └── barcode.php                # Barcode string generator utility
│
└── api/
    ├── auth/
    │   └── router.php             # Login, logout, me (Verify token)
    │
    ├── teachers/
    │   ├── router.php             # GET (list), POST (create), PUT, DELETE
    │   └── single.php             # GET/PUT/DELETE by ID
    │
    ├── dispatch/
    │   ├── index.php              # Core dispatch logic
    │   └── router.php             # GET (list/single), POST (scan), PUT (update)
    │
    ├── followups/
    │   ├── index.php              # Core followup logic
    │   └── router.php             # GET (list/single), POST, PUT
    │
    ├── reports/
    │   └── router.php             # Consolidated, Label, Dispatch, School Address
    │
    └── users/
        └── router.php             # User management (admin only)
```

### Frontend (`teachers-bank-frontend/`)

```
teachers-bank-frontend/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── next-env.d.ts
│
└── src/
    ├── app/
    │   ├── globals.css            # Global styles
    │   ├── layout.tsx             # Root layout with sidebar & auth check
    │   ├── page.tsx               # Dashboard
    │   ├── login/page.tsx         # Login page
    │   │
    │   ├── teachers/
    │   │   └── page.tsx           # Teacher CRUD UI
    │   │
    │   ├── dispatch/
    │   │   └── page.tsx           # Barcode scanner + dispatch list
    │   │
    │   ├── followups/
    │   │   └── page.tsx           # Follow-up tracker with overdue alerts
    │   │
    │   ├── reports/
    │   │   └── page.tsx           # Report generation (4 types)
    │   │
    │   └── users/
    │       └── page.tsx           # User management (admin only)
    │
    ├── components/
    │   ├── teachers/
    │   │   ├── TeacherFormModal.tsx   # Add/Edit teacher modal
    │   │   └── TeacherDetailModal.tsx # View teacher details
    │   │
    │   └── ui/
    │       ├── BarcodeDisplay.tsx     # Barcode render component
    │       ├── EmptyState.tsx         # Empty list placeholder
    │       └── Pagination.tsx         # Pagination controls
    │
    ├── context/
    │   └── AuthContext.tsx        # Authentication state & token management
    │
    └── lib/
        ├── api.ts                 # API fetch wrapper with JWT headers
        ├── types.ts               # TypeScript type definitions
        ├── teacherClassifications.ts # Classification parsing helpers
        └── utils.ts               # Utility functions
```

---

## Database Schema

### Overview

The database consists of **4 core tables**: `teachers`, `dispatch`, `followups`, and `users`.

### 1. Teachers Table

Master table for all teachers receiving materials.

```sql
CREATE TABLE teachers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  teacher_name    VARCHAR(150)  NOT NULL,
  contact_number  VARCHAR(15)   NOT NULL,
  teacher_address TEXT,
  pincode         CHAR(6),                    -- exactly 6 digits
  dt_code         VARCHAR(10),                -- e.g., "ARL", "CHN"
  sub_code        VARCHAR(255),               -- CSV: "MAT,ENG,SCI"
  std             VARCHAR(100),               -- CSV: "6,7,8,9,10"
  medium          VARCHAR(50),                -- CSV: "TM,EM"
  classifications LONGTEXT,                  -- JSON: [{"std":"6","medium":"TM","subjects":["MAT","ENG"]}]
  school_name     TEXT,
  school_type     VARCHAR(50),                -- "Govt. School", "CBSE School", etc.
  barcode         TEXT,                      -- unique per teacher
  remarks         TEXT,                      -- optional notes
  isActive        TINYINT(1) DEFAULT 1,      -- soft-delete flag
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields Explained:**

- **dt_code**: Single district code (e.g., "ALR" for Ariyalur, "CHN" for Chennai, "CBE" for Coimbatore)
  - Supports 36 Tamil Nadu districts
  
- **sub_code, std, medium**: CSV multi-value fields
  - `sub_code`: "MAT,ENG,SCI" (teacher can teach multiple subjects)
  - `std`: "6,7,8,9" (can teach across multiple grades)
  - `medium`: "TM,EM" (Tamil Medium and/or English Medium)
  
- **classifications**: JSON map for detailed subject-standard-medium relationships
  - Example: `[{"std":"6","medium":"TM","subjects":["MAT","ENG"]},{"std":"7","medium":"EM","subjects":["SCI"]}]`
  - Used for validation and detailed reporting
  
- **barcode**: Auto-generated, unique, immutable
  - Format: `DT_CODE|SUBJECT|GRADE|MEDIUM|01|AUTO_ID`
  - Example: `CHN|MAT|6|TM|01|000042`

### 2. Dispatch Table

Tracks each shipment/dispatch of materials to a teacher.

```sql
CREATE TABLE dispatch (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    dispatch_date DATE,
    pod_date DATE,                             -- POD = Proof of Delivery
    status VARCHAR(50) DEFAULT 'Dispatched',
    po_number VARCHAR(100),                    -- Purchase Order number
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    UNIQUE KEY unique_teacher_dispatch_date (teacher_id, dispatch_date)
);
```

**Key Features:**

- **One dispatch per teacher per day**: Unique constraint on `(teacher_id, dispatch_date)` prevents duplicate same-day dispatches
- **dispatch_date**: When materials were sent
- **pod_date**: When teacher confirmed receipt (initially NULL)
- **status**: Tracks state ("Dispatched", "Received", etc.)
- **Auto follow-up creation**: When dispatch status changes to `Delivered`, system auto-creates `followups.level_1` with `reminder_date = delivered_date + 10 days`

### 3. Followups Table

Tracks escalation workflow for ensuring teacher confirms receipt.

```sql
CREATE TABLE followups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dispatch_id INT NOT NULL,
    followup_level INT NOT NULL DEFAULT 1,
    reminder_date DATE,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'Pending',    -- Pending, Informed, Processing, Completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dispatch_id) REFERENCES dispatch(id)
);
```

**Follow-up Status Flow:**

```
Pending  ──(contact teacher)──>  Informed  ──(action taken)──>  Processing  ──(resolved)──>  Completed
```

**Escalation Logic:**

- **Level 1**: Auto-created when dispatch is created, reminder_date = dispatch_date + 10 days
- **Level 2+**: Can be created manually if Level 1 not resolved by reminder date
- **Overdue Detection**: Any followup where `status='Pending' AND reminder_date < TODAY` is shown in red on UI

### 4. Users Table

System users for authentication and role-based access.

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,           -- Bcrypt hashed
    full_name VARCHAR(150),
    role ENUM('admin', 'user', 'operator') DEFAULT 'user',
    isActive TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Default User:**
- **username**: admin
- **password**: admin123 (Bcrypt hashed: `$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`)
- **role**: admin

---

## Core Workflows

### Workflow 1: Teacher Registration & Barcode Generation

**Actors**: Admin / Management User

**Input**:
- Teacher name, contact number, address, pincode
- District code (e.g., "CHN" for Chennai)
- Subjects (CSV multi-select, e.g., "MAT,ENG,SCI")
- Standards (CSV, e.g., "6,7,8,9,10")
- Mediums (CSV, e.g., "TM,EM")
- School name & type

**Process**:
1. Frontend sends POST /api/teachers with all details
2. Backend validates:
   - Pincode is 6 digits
   - Subject-Standard mapping is valid (e.g., Physics only in 11-12, not 6-8)
   - District code exists in DISTRICTS map
   - School type is valid
3. Backend generates unique barcode: `{dt_code}|{subject}|{std}|{medium}|01|{auto_id}`
4. Backend creates classifications JSON: Parse CSV fields into structured map
5. Insert record into `teachers` table
6. Return: Teacher ID, barcode, confirmation

**Output**: Teacher record saved, barcode ready for scanning

**Example**:
```
Input: name="Ram Kumar", subject="MAT,ENG", std="6,7,8", medium="TM,EM", district="CHN"
→ Auto-generated barcode: "CHN|MAT|6|TM|01|000042"
→ classifications: [{"std":"6","medium":"TM","subjects":["MAT","ENG"]},...]
→ Saved to database
```

---

### Workflow 2: Dispatch via Barcode Scanning

**Actors**: Operator (special role)

**Prerequisites**: Teacher must be registered with barcode

**Input**:
- Barcode (scanned via USB scanner or typed manually)
- Dispatch date (defaults to today)

**Process**:
1. Frontend displays barcode input field with real-time preview (JsBarcode renders image)
2. Operator scans barcode or types it
3. Frontend sends POST /api/dispatch with `{barcode, dispatch_date}`
4. Backend validates:
   - Barcode exists in `teachers` table AND `isActive=1`
   - Check for duplicate: No existing dispatch for this teacher on this date
5. Backend creates dispatch record:
   - `INSERT INTO dispatch (teacher_id, dispatch_date, status)` 
   - status defaults to "Dispatched"
6. Backend auto-creates first follow-up:
   - `INSERT INTO followups (dispatch_id, followup_level=1, reminder_date=dispatch_date+10days, status='Pending')`
7. Backend returns 200 OK with:
   - dispatch_id, teacher details, reminder_date
8. Frontend shows confirmation toast with teacher name

**Error Handling**:
- Invalid barcode → 404: "Invalid barcode — teacher not found"
- Duplicate dispatch → 409: "Already dispatched today. Duplicate dispatch rejected"

**Output**: Dispatch record created, automatic Level-1 follow-up with 10-day reminder

**Example**:
```
Scan: "CHN|MAT|6|TM|01|000042" on 2025-03-28
→ dispatch_id=5, dispatch_date=2025-03-28, teacher="Ram Kumar"
→ (No follow-up created yet - waiting for delivery confirmation)
→ UI shows: "✓ Dispatch successful for Ram Kumar"

Update dispatch to status="Delivered", delivered_date=2025-03-30
→ followup_level=1, reminder_date=2025-04-09 auto-created
→ UI shows: "✓ Follow-up reminder created (2025-04-09)"
```

---

### Workflow 3: Follow-up Escalation & Tracking

**Actors**: Operator / Admin

**Part A: Automatic Reminder Creation**
- When dispatch status updated to "Delivered" with delivered_date D:
  - System auto-creates followup_level=1, reminder_date=D+10days
  - Duplicate prevention: Only creates if Level 1 doesn't already exist

**Part B: Overdue Detection & Alerts**
1. Frontend shows Follow-ups page with all pending follow-ups
2. Frontend highlights in RED any followup where `reminder_date < TODAY AND status='Pending'`
3. Operator sees red banner: "You have X overdue follow-ups"

**Part C: Manual Follow-up Update**
1. Operator clicks on a follow-up in the list
2. Modal opens with current status, remarks, reminder_date
3. Operator updates:
   - Status: (Pending → Informed → Processing → Completed)
   - Remarks: "Called teacher, confirmed receipt"
   - Reminder_date: Change if needed
4. Frontend sends PUT /api/followups/{id} with updated data
5. Backend updates record, returns modified followup

**Part D: Escalation to Next Level**
1. If Level-1 reminder passed and no response (status still 'Pending'):
   - Operator can manually create followup_level=2
   - New reminder_date set to level2_creation_date + 10 days
   - UI shows: "Next level will auto-create on {date}" (if auto-escalation enabled)

**Output**: Follow-ups tracked, escalated, resolved over time

**Example**:
```
2025-03-28: Dispatch created (status="Dispatched") → No follow-up yet
2025-03-30: Status updated to "Delivered", delivered_date=2025-03-30 → Level 1 reminder_date=2025-04-09
2025-04-09 (Overdue): UI shows red alert "Ram Kumar's follow-up is overdue"
2025-04-10: Operator calls, updates followup status='Informed', remarks="Confirmed receipt"
2025-04-15: Teacher still no POD? Operator creates Level 2, reminder_date=2025-04-25
2025-04-20: Teacher sends POD, operator updates dispatch.pod_date=2025-04-20
2025-04-21: Operator marks followup_level=1 status='Completed'
```

---

### Workflow 4: Proof of Delivery (POD) Confirmation

**Actors**: Operator / Admin

**Input**:
- Dispatch ID
- POD date (when teacher confirmed receipt)
- Optional: Status update

**Process**:
1. Operator navigates to Dispatch list
2. Finds dispatch record for teacher
3. Clicks "Update POD" or similar button
4. Modal opens with dispatch details
5. Operator enters POD date and clicks save
6. Frontend sends PUT /api/dispatch/{id} with `{pod_date, status}`
7. Backend updates dispatch record
8. Operator can now mark corresponding follow-up_level=1 as 'Completed'

**Output**: Dispatch marked as received, follow-up resolved

---

### Workflow 5: Reporting & Analysis

**Actors**: Admin / Authorized User

**Four Report Types**:

#### A. Consolidated Report
- **Endpoint**: GET /api/reports?type=consolidated
- **Purpose**: Network-wide teacher summary
- **Filters**: district, subject, standard, medium, school_type, teacher_name, contact
- **Output Columns**:
  - SNo, Teacher Name, Contact, School, District
  - Total Dispatches, Last Dispatch Date
  - Latest Follow-up Status, Latest Follow-up Level
  - Barcode, Address, Pincode
- **Use Case**: Overview of all teachers and their dispatch status

#### B. Label Report
- **Endpoint**: GET /api/reports?type=label
- **Purpose**: Print-ready mailing labels
- **Format**: 4-column grid with barcode images
- **Output**: Teacher name, full address, pincode, school name, barcode image
- **Filters**: Same as consolidated
- **Use Case**: Print labels for packaging/mailing materials to teachers

#### C. Dispatch Report
- **Endpoint**: GET /api/reports?type=dispatch
- **Purpose**: Dispatch history with audit details
- **Filters**: Date range, status, teacher
- **Output**: Dispatch date, POD date, status, teacher, school, follow-up count
- **Use Case**: Audit trail, reconciliation, performance metrics

#### D. School Address Report
- **Endpoint**: GET /api/reports?type=school_address
- **Purpose**: School-level mailing labels for batch dispatch
- **Grouping**: By school name
- **Output**: School address, pincode, list of teachers at that school
- **Use Case**: Send materials to school principal for distribution to multiple teachers

---

## API Endpoint Summary

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| POST | /api/auth/login | Login with username & password → returns JWT token | No |
| GET | /api/auth/me | Verify token and get user info | Yes |
| POST | /api/auth/logout | Logout (clear server-side token) | Yes |

### Teachers Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---|---|
| GET | /api/teachers | List teachers with filters & pagination | Yes | admin, user |
| POST | /api/teachers | Create new teacher (auto-barcode) | Yes | admin, user |
| GET | /api/teachers/{id} | Get teacher details + dispatch history | Yes | admin, user |
| PUT | /api/teachers/{id} | Update teacher information | Yes | admin, user |
| DELETE | /api/teachers/{id} | Soft-delete (deactivate) teacher | Yes | admin, user |

**Query Filters** (GET /api/teachers):
- `page`: Pagination (default 1)
- `limit`: Records per page (default 20, max 100)
- `dt_code`: Filter by district (e.g., "CHN")
- `sub_code`: Filter by subject (e.g., "MAT")
- `std`: Filter by standard (e.g., "6")
- `medium`: Filter by medium (e.g., "TM")
- `school_type`: Filter by school type
- `teacher_name`: Search by name (LIKE)
- `contact_number`: Search by contact (LIKE)
- `barcode`: Search by barcode

### Dispatch Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---|---|
| GET | /api/dispatch | List dispatches with filters | Yes | admin, user, operator |
| GET | /api/dispatch?id={id} | Get single dispatch + followups | Yes | admin, user, operator |
| POST | /api/dispatch | Scan barcode → create dispatch + L1 followup | Yes | admin, user, operator |
| PUT | /api/dispatch?id={id} | Update dispatch (POD date, status, PO number, delivery date) | Yes | admin, user, operator |

**Query Filters** (GET /api/dispatch):
- `date`: Filter by dispatch date
- `status`: Filter by status
- `teacher_id`: Filter by teacher
- `from_date`: Filter from date range
- `to_date`: Filter to date range
- `page`: Pagination
- `limit`: Records per page

**PUT /api/dispatch/{id} Request Body** (Update Dispatch):
```json
{
  "status": "Delivered",        // Required if updating status
  "pod_date": "2025-04-15",     // Delivery date (required when status="Delivered")
  "po_number": "PO-12345"       // Optional PO/reference number
}
```

**Validation Rules for Delivery**:
- If `status` is "Delivered", `pod_date` (delivery date) **must be provided**
- Delivery date must be >= dispatch date
- Delivery date must be in YYYY-MM-DD format

### Follow-ups Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---|---|
| GET | /api/followups | List followups with filters | Yes | admin, user |
| GET | /api/followups?id={id} | Get single followup | Yes | admin, user |
| POST | /api/followups | Create followup manually | Yes | admin, user |
| PUT | /api/followups?id={id} | Update followup (status, remarks, date) | Yes | admin, user |

**Query Filters** (GET /api/followups):
- `date`: Filter by reminder date (or "today")
- `status`: Filter by status (or "Processing" for Pending+Informed)
- `dispatch_id`: Filter by dispatch
- `followup_level`: Filter by level number
- `from_date`: Date range start
- `to_date`: Date range end
- `overdue_only`: Show only overdue (reminder_date < TODAY, status='Pending')
- `page`: Pagination
- `limit`: Records per page

### Reports Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---|---|
| GET | /api/reports?type=consolidated | Consolidated teacher report | Yes | admin, user |
| GET | /api/reports?type=label | Print-ready label report | Yes | admin, user |
| GET | /api/reports?type=dispatch | Dispatch history report | Yes | admin, user |
| GET | /api/reports?type=school_address | School address labels | Yes | admin, user |

**Query Filters** (All report types):
- `dt_code`: Filter by district
- `sub_code`: Filter by subject
- `std`: Filter by standard
- `medium`: Filter by medium
- `school_type`: Filter by school type
- `teacher_name`: Search by teacher name
- `contact`: Search by contact number

### Users Endpoints (Admin Only)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---|---|
| GET | /api/users | List all users | Yes | admin |
| POST | /api/users | Create new user | Yes | admin |
| PUT | /api/users/{id} | Update user information | Yes | admin |
| DELETE | /api/users/{id} | Soft-delete user | Yes | admin |

---

## Authentication & Authorization

### JWT Flow

1. **User Login** (POST /api/auth/login)
   - Provide username & password
   - Backend validates against `users` table (Bcrypt password check)
   - Returns JWT token (typically valid for 24 hours)
   - Frontend stores token in `sessionStorage` (key: `tb_jwt`)

2. **Authenticated Requests**
   - Include header: `Authorization: Bearer <JWT_TOKEN>`
   - Backend middleware/jwt.php validates token signature & expiry
   - Returns decoded user info if valid, rejects if expired/invalid

3. **Token Verification** (GET /api/auth/me)
   - Frontend calls on app init to verify stored token
   - Backend returns user object if token valid
   - Clear token from storage if invalid

4. **Token Storage**
   - **sessionStorage** (not localStorage!)
   - Token expires/clears when browser tab/window closes
   - Security benefit: Prevents token theft from browser cache

5. **Logout** (POST /api/auth/logout)
   - Frontend clears sessionStorage token
   - Backend (if applicable) can invalidate token server-side
   - User redirected to login page

### Role-Based Access Control (RBAC)

**Three Roles**:

| Role | Permissions |
|------|-------------|
| **admin** | Full access: Teachers, Dispatch, Follow-ups, Reports, Users |
| **user** | Teachers, Dispatch, Follow-ups, Reports (no user management) |
| **operator** | ONLY Dispatch endpoint (barcode scanning, dispatch list) |

**Enforcement Points**:

1. **Router Level** (index.php)
   - Before dispatching to API handler, checks user role
   - Operator can ONLY access `/dispatch` routes
   - Returns 403 Forbidden if unauthorized

2. **Endpoint Level**
   - Some endpoints check role before execution
   - User management endpoints require admin role

**Rationale**:
- **Operator**: Restricted to scanning barcodes only, prevents data tampering
- **User**: Standard staff with full operational access
- **Admin**: Management & user administration

---

## Frontend Pages & Features

### 1. Login Page (`/login`)

**Purpose**: User authentication

**Features**:
- Username field
- Password field
- Login button
- Error message display
- Redirect to dashboard on success

**Flow**:
1. User enters credentials
2. Frontend sends POST /api/auth/login
3. If success: Store JWT in sessionStorage, redirect to dashboard
4. If failed: Show error message

---

### 2. Dashboard (`/`)

**Purpose**: Welcome screen with quick stats and actions

**Features**:
- Welcome message with user's name
- Quick statistics:
  - Total active teachers
  - Dispatches today
  - Overdue follow-ups (count & red alert)
- Quick action buttons:
  - "Add Teacher" → navigate to /teachers
  - "Scan Barcode" → navigate to /dispatch
  - "View Follow-ups" → navigate to /followups

**Responsive**: Full-width on all devices

---

### 3. Teachers Management (`/teachers`)

**Purpose**: CRUD operations for teacher records

**Features**:

**List View**:
- Table with columns: Name, Contact, School, District, Subjects, Standards, Barcode, Actions
- Pagination (20 per page default)
- Search bar: Search by name or contact number
- Filters:
  - District dropdown (36 TN districts)
  - Subject multi-select (17 subjects)
  - Standard multi-select (6-12)
  - Medium checkbox (TM/EM)
  - School type dropdown
- Action buttons per row:
  - Edit (open modal)
  - View Details (show dispatch history)
  - Delete/Deactivate (soft-delete)
- Add button: "Add New Teacher" (opens form modal)

**Add/Edit Modal**:
- Form fields:
  - Teacher Name (required)
  - Contact Number (required)
  - Address
  - Pincode (6 digits validation)
  - District (dropdown, required)
  - Subjects (multi-select with CSV)
  - Standards (multi-select with CSV)
  - Mediums (checkboxes: TM, EM)
  - School Name
  - School Type (dropdown)
  - Remarks (optional)
- On save:
  - Validate all required fields
  - Send POST /api/teachers (add) or PUT /api/teachers/{id} (edit)
  - Show toast notification: "✓ Teacher saved successfully"
  - Close modal, refresh list

**View Details Modal**:
- Read-only view of teacher:
  - All basic info
  - Barcode image (rendered with JsBarcode)
  - Classification JSON (pretty-printed)
- Dispatch history:
  - List of all dispatches for this teacher
  - Columns: Dispatch Date, POD Date, Status, Follow-up Count
  - Most recent first

---

### 4. Dispatch (`/dispatch`)

**Purpose**: Barcode scanning and dispatch tracking

**Features**:

**Barcode Scanner Section**:
- Large input field: "Scan barcode or enter manually"
- Real-time barcode preview (JsBarcode renders SVG image)
- Scan history with quick-access buttons
- Dispatch date picker (defaults to today)
- Scan button (green): Submits POST /api/dispatch
- Clear button: Clears input & preview

**Dispatch Results Panel**:
- On successful scan:
  - ✓ Green checkmark + "Dispatch successful"
  - Teacher details: Name, Contact, School
  - Dispatch ID, Dispatch Date
  - Auto-created reminder date (dispatch_date + 10 days)
  - Toast notification

**Dispatch List**:
- Table with columns: Dispatch Date, Teacher, Contact, School, Status, POD Date, Followup Count, Actions
- Filters:
  - Date picker (from/to)
  - Status dropdown (Dispatched, Received, etc.)
  - Teacher search
- Pagination (20 default)
- Action buttons:
  - View: Show dispatch + followups details
  - Update POD: Modal to update dispatch status and delivery date

**Update Dispatch Modal**:
- Shows current dispatch info: Teacher name, dispatch date
- Status dropdown: "Dispatched", "Delivered", "Returned"
- **Conditional Delivery Date Field** (NEW):
  - When status = "Delivered": Shows highlighted "Delivery Date" field with validation
  - Displays: "Date when the teacher received the materials"
  - Date must be >= dispatch date
  - Field is required when status is "Delivered"
  - When status ≠ "Delivered": Shows optional "POD Date" field
- PO Number field (optional): Reference or proof of delivery number
- Save/Cancel buttons
- Client-side validation:
  - Prevents save if status is "Delivered" without delivery date
  - Shows error if delivery date is before dispatch date

**Responsive**: Full width on desktop, stacked on mobile

---

### 5. Follow-ups (`/followups`)

**Purpose**: Track and escalate follow-up workflow

**Features**:

**Overdue Alert Banner**:
- Red banner at top if overdue items exist: "⚠️ You have X overdue follow-ups"
- Click to filter to overdue only

**Follow-up List**:
- Table with columns: 
  - Teacher, Contact, Dispatch Date, Level, Reminder Date, Status, Days Overdue (if pending), Actions
- Color-coding:
  - Red background: Overdue (reminder_date < today, status='Pending')
  - Yellow: Processing/Informed
  - Green: Completed
- Filters:
  - Status dropdown (All, Pending, Informed, Processing, Completed)
  - Reminder date range
  - Follow-up level
- Pagination (20 default)
- Action buttons:
  - Update Status: Modal to change status + add remarks + update reminder_date
  - Create Next Level: Button to manually create followup_level+1 with new reminder_date

**Manual Follow-up Creation**:
- Button: "+ Create Manual Follow-up"
- Modal:
  - Dispatch dropdown (search by teacher/date)
  - Follow-up level (dropdown, auto-suggest next available level)
  - Reminder date (date picker)
  - Status (Pending default)
  - Remarks (optional)
  - Save button

**Auto-Escalation Preview**:
- For each Level-1 follow-up with reminder_date < today:
  - UI shows: "Level 2 will auto-create on {calculated_date}" (if auto-escalation enabled)

---

### 6. Reports (`/reports`)

**Purpose**: Generate and export report data

**Features**:

**Report Type Selector**:
- Radio buttons or tabs: Consolidated, Label, Dispatch, School Address

**Common Filters**:
- District dropdown
- Subject multi-select
- Standard multi-select
- Medium checkboxes
- School type dropdown
- Teacher name search
- Date range (for dispatch/followup reports)

#### A. Consolidated Report View
- Button: "Generate Consolidated Report"
- Output: Table with columns:
  - SNo, Teacher, Contact, School, District
  - Total Dispatches, Last Dispatch Date
  - Latest Followup Status, Latest Followup Level
  - Actions: Download CSV
- Print button: Print-friendly layout (no UI chrome)

#### B. Label Report View
- Button: "Generate Labels"
- Output: 4-column grid layout with:
  - Teacher barcode image
  - Teacher name
  - Full address (multi-line)
  - Pincode
  - School name
- Print button: Print layout optimized for label printer
- Download CSV button: Export data

#### C. Dispatch Report View
- Button: "Generate Dispatch Report"
- Output: Table with columns:
  - Dispatch Date, Teacher, School, Status, POD Date, Follow-up Count
- Aggregated metrics:
  - Total dispatches in range
  - Dispatch status breakdown (pie chart optional)
  - Average days to POD
- Download CSV button

#### D. School Address Report View
- Button: "Generate School Labels"
- Output: Grouped by school:
  - School Name (bold header)
  - School Address
  - Pincode
  - List of teachers at that school
- Print button: Print-friendly school label layout
- Download CSV button

---

### 7. User Management (`/users`) — Admin Only

**Purpose**: Create and manage system users (admin, user, operator roles)

**Features**:

**User List**:
- Table with columns: Username, Full Name, Role, Status (Active/Inactive), Created Date, Actions
- Pagination (20 default)
- Action buttons:
  - Edit (open modal)
  - Deactivate/Activate (toggle isActive)
  - Delete (soft-delete)

**Add/Edit User Modal**:
- Fields:
  - Username (required, unique)
  - Password (required for new, optional for edit)
  - Full Name (required)
  - Role (dropdown: admin, user, operator)
  - Status (Active/Inactive checkbox)
- Validation:
  - Username not already taken
  - Password min 6 characters
- On save: POST /api/users (add) or PUT /api/users/{id} (edit)

**Reset Password Option**:
- Admin can reset user password to temporary value
- User prompted to change on next login (optional feature)

---

## Key Features & Specifications

### 1. Barcode System

**Format**:
```
DT_CODE | SUBJECT | STANDARD | MEDIUM | 01 | AUTO_ID
ARL     | EN6     | X        | EM     | 01 | 000001
```

**Properties**:
- **Unique per teacher**: No two teachers have same barcode
- **Auto-generated**: System generates on teacher creation
- **Immutable**: Cannot be changed after creation
- **Scannable**: Standard format for USB barcode scanners
- **Human-readable**: Contains meaningful codes (district, subject, grade)

**Scanning**:
- USB barcode scanner reads entire barcode string
- Manual entry supported for fallback
- Real-time preview with JsBarcode library
- Validation against teacher database

---

### 2. Multi-Value Fields

Teachers can teach **multiple subjects**, **multiple standards**, and **multiple mediums** simultaneously.

**Example**:
```
Teacher: Priya Sharma
Subjects:      "MAT,ENG,SCI"
Standards:     "6,7,8,9"
Mediums:       "TM,EM"

Interpretation:
- Teaches Math, English, Science
- In grades 6, 7, 8, 9
- In both Tamil Medium and English Medium
- Total combinations: 3 subjects × 4 standards × 2 mediums = 24 class combinations

classifications JSON:
[
  {"std":"6","medium":"TM","subjects":["MAT","ENG","SCI"]},
  {"std":"6","medium":"EM","subjects":["MAT","ENG"]},
  {"std":"7","medium":"TM","subjects":["MAT","ENG","SCI"]},
  ...
]
```

**Storage**:
- CSV format in DB: `sub_code="MAT,ENG,SCI"`, `std="6,7,8,9"`
- JSON format for classifications: Structured map for reporting/validation

**Validation**:
- Subject must be valid (from SUBJECTS map)
- Subject-Standard mapping must be valid (e.g., Physics only in 11-12)
- Duplicates removed (MAT,MAT → MAT)
- Invalid combinations rejected

---

### 3. Classifications Map

Compact JSON representation of subject-standard-medium relationships.

**Structure**:
```json
[
  {
    "std": "6",
    "medium": "TM",
    "subjects": ["MAT", "ENG", "SCI"]
  },
  {
    "std": "7",
    "medium": "EM",
    "subjects": ["MAT", "ENG"]
  }
]
```

**Uses**:
- Detailed reporting: "Show all teachers teaching Math in grade 6 Tamil Medium"
- Form validation: Prevent invalid subject-standard combinations
- Teacher detail view: Display structured breakdown
- API responses: Return structured data for UI rendering

**Updates**:
- Parsed from CSV fields on teacher creation
- Re-validated on teacher update
- Converted back to CSV for backwards compatibility

---

### 4. Follow-up Escalation

**Automatic Creation**:
- When dispatch status changes to "Delivered" with date D
- System auto-creates followup_level=1, reminder_date=D+10 days
- Duplicate prevention: Checks if Level 1 already exists before creating

**Manual Escalation**:
- If Level-1 not resolved by reminder_date
- Operator can create Level-2 manually
- Set new reminder_date for Level-2 (e.g., +10 days from Level-2 creation)

**Multi-Level Support**:
- Can have Level-1, Level-2, Level-3, ... as needed
- Each level has separate reminder_date and status
- Latest level shown in dispatch details

**Status Transitions**:
```
Pending --[contact teacher]--> Informed
              ↓
          Processing --[resolved]--> Completed
```

**Overdue Logic**:
- Any followup where `status='Pending' AND reminder_date < today`
- Shown in red on UI
- Counted in overdue banner

---

### 5. District & Subject Validation

**36 Tamil Nadu Districts** (dt_code):
```
ALR=Ariyalur, CGP=Chengalpattu, CHN=Chennai, CBE=Coimbatore, CUD=Cuddalore,
DPI=Dharmapuri, DGL=Dindigul, ERD=Erode, KLK=Kallakurichi, KPM=Kanchipuram,
KKI=Kanyakumari, KRL=Karaikal, KRR=Karur, KGI=Krishnagiri, MDU=Madurai,
MYD=Mayiladuthurai, NPM=Nagapattinam, NKL=Namakkal, NLG=Nilgiris, PLR=Perambalur,
PDY=Pondicherry, PDK=Pudukottai, RPM=Ramanathapuram, RPT=Ranipet, SLM=Salem,
SGI=Sivagangai, TJR=Thanjavur, TEN=Tenkasi, TNI=Theni, TVM=Thiruvannamalai,
TUT=Thoothukudi, TRY=Tiruchirappalli, TVL=Tirunelveli, TPT=Tirupathur,
TPR=Tiruppur, TLR=Tiruvallur, TVR=Tiruvarur, VLR=Vellore, VPM=Villupuram, VNR=Virudhunagar
```

**17 Subjects** (sub_code):
- **Basic (6-10)**: TAM (Tamil), ENG (English), MAT (Maths), SCI (Science), SS (Social Science)
- **Advanced (11-12)**: PHY (Physics), CHE (Chemistry), BIO (Biology), BOT (Botany), ZOO (Zoology), CS (Computer Science), CA (Computer Applications), BM (Business Maths), ECO (Economics), COM (Commerce), ACC (Accountancy), HIS (History)

**Subject-Standard Mapping**:
```
TAM: 6-12   (taught in all grades)
ENG: 6-12
MAT: 6-12
SCI: 6-10   (not in 11-12, replaced by stream-specific subjects)
SS: 6-10
PHY: 11-12  (only in higher secondary)
CHE: 11-12
BIO: 11-12
... (etc.)
```

**Validation Rules**:
- Physics cannot be assigned to grade 6 (would be rejected)
- Social Science cannot be assigned to grade 11
- Duplicates in CSV removed
- Invalid codes ignored or rejected with error message

---

### 6. Responsive Design

**Breakpoints**:
- **Mobile** (< 768px): Single column, stacked layout, collapsible sidebar
- **Tablet** (768px - 1024px): 2-column layout, sidebar visible
- **Desktop** (> 1024px): Full sidebar + main content, multi-column tables

**Components**:
- Sidebar: Collapses to hamburger menu on mobile
- Navigation: Mobile menu with overlay
- Tables: Horizontal scroll on mobile, full width on desktop
- Modals: Full-screen on mobile, centered on desktop
- Forms: Single column on mobile, adjusted spacing

**Print Support**:
- CSS class `no-print` on UI elements (hide on print)
- Report pages optimized for printing
- Label pages formatted for standard label printer (4 columns)
- Barcode images render clearly on print

---

### 7. Data Validation

**Teacher Form Validation**:
- Name: Required, max 150 chars
- Contact: Required, 10-15 digits
- Pincode: 6 digits exactly
- District: Must be in DISTRICTS map
- Subject: Each must be in SUBJECTS map
- Standard: Each in [6-12], must match subject mapping
- Medium: Only "TM" or "EM"
- School type: Must be in predefined list

**Dispatch Validation**:
- Barcode: Required, must exist, teacher isActive=1
- Dispatch date: Valid date, preferably today or past
- Duplicate check: No dispatch for same (teacher, date) pair

**Follow-up Validation**:
- Dispatch ID: Must exist
- Level: Integer > 0
- Reminder date: Valid date
- Status: Must be in [Pending, Informed, Processing, Completed]

---

## Data Flow Examples

### Example 1: Complete Dispatch & Follow-up Cycle

**Timeline**:

**March 28, 2025 — Teacher Registration**
```
Admin creates:
- Name: Ram Kumar
- Contact: 9876543210
- Address: 42 School Rd, Chennai
- Pincode: 600001
- District: CHN (Chennai)
- Subjects: MAT, ENG
- Standards: 6, 7, 8
- Mediums: TM, EM
- School: Chennai Govt School
- School Type: Govt. School

System generates:
- Barcode: CHN|MAT|6|TM|01|000001 (unique ID incremented)
- classifications: [{"std":"6","medium":"TM","subjects":["MAT","ENG"]}, ...]
- Database: INSERT INTO teachers (...)
- Result: ✓ Teacher saved, barcode ready
```

**April 5, 2025 — Dispatch Scan**
```
Operator at mailroom:
1. Goes to Dispatch page
2. Scans barcode: "CHN|MAT|6|TM|01|000001"
3. System validates: ✓ Found teacher "Ram Kumar", isActive=1
4. Checks for duplicates: ✓ No dispatch for 2025-04-05 yet
5. Creates dispatch record:
   - dispatch_id = 42
   - teacher_id = 1 (Ram Kumar's ID)
   - dispatch_date = 2025-04-05
   - status = "Dispatched"
6. Auto-creates followup:
   - followup_id = 105
   - dispatch_id = 42
   - followup_level = 1
   - reminder_date = 2025-04-15 (10 days later)
   - status = "Pending"
7. Returns: ✓ Dispatch successful, Reminder set for April 15
8. UI shows toast & dispatch confirmation with teacher details
```

**April 15, 2025 — Overdue Alert**
```
Operator checks Follow-ups page:
- Queries: SELECT * FROM followups WHERE reminder_date <= '2025-04-15' AND status='Pending'
- Finds: Ram Kumar's Level-1 followup, reminder_date=2025-04-15
- UI highlights: RED background (today is reminder date), "Days overdue: 0"
- Banner shows: "⚠️ You have 3 overdue follow-ups"
```

**April 16, 2025 — Follow-up Contact**
```
Operator:
1. Clicks on Ram Kumar's follow-up
2. Modal opens: Current status = "Pending"
3. Operator updates:
   - Status: "Pending" → "Informed"
   - Remarks: "Called teacher, confirmed receipt, materials received safely"
   - Reminder date: Keep as 2025-04-15
4. Sends PUT /api/followups/105 with updates
5. Database: UPDATE followups SET status='Informed', remarks='...' WHERE id=105
6. Result: ✓ Follow-up updated, no longer appears in overdue list
```

**April 20, 2025 — POD Reception**
```
Teacher submits proof:
- Teacher provides PO receipt or acknowledgment
- Operator:
  1. Goes to Dispatch list
  2. Finds Ram Kumar's dispatch (2025-04-05)
  3. Clicks "Update POD"
  4. Modal shows: POD date = NULL
  5. Enters: POD date = 2025-04-20
  6. Sends PUT /api/dispatch/42 with pod_date update
  7. Database: UPDATE dispatch SET pod_date='2025-04-20' WHERE id=42
8. Then marks follow-up as "Completed":
  - Goes back to Follow-ups
  - Finds followup_level=1 for this dispatch
  - Clicks "Mark Complete"
  - Updates status to "Completed"
9. Result: ✓ Dispatch closed with POD, follow-up resolved
```

**Summary View (April 25)**
```
Consolidated Report for Ram Kumar:
- Total Dispatches: 1
- Last Dispatch Date: 2025-04-05
- Latest Followup Level: 1
- Latest Followup Status: Completed
- Time to POD: 15 days
```

---

### Example 2: Multi-Subject Teacher, Overdue Escalation

**Setup**:
```
Teacher: Priya Sharma
- Subjects: MAT, SCI, ENG
- Standards: 6, 7, 8, 9
- Mediums: TM, EM
- School: Chennai Girls School, Chennai (CHN)
```

**Dispatch Timeline**:

**March 1, 2025 — Dispatch 1**
```
Scan → dispatch_id=1, dispatch_date=2025-03-01, followup_level=1, reminder_date=2025-03-11
```

**March 1, 2025 — Dispatch 2** (Same teacher, different day - allowed!)
```
Scan → dispatch_id=2, dispatch_date=2025-03-01 attempted
⚠️ ERROR: "Already dispatched today"
← Can't dispatch same teacher same day (unique constraint prevents this)
```

**March 5, 2025 — Dispatch 2** (Different day - allowed!)
```
Scan → dispatch_id=2, dispatch_date=2025-03-05, followup_level=1, reminder_date=2025-03-15
```

**March 11, 2025 — Overdue L1 for Dispatch 1**
```
Operator checks Follow-ups:
- Followup_level=1 for dispatch_id=1: reminder_date=2025-03-11 ← Today!
- Status="Pending"
- UI highlights: RED background, "Days overdue: 0"
- Shows: Priya Sharma, dispatch 2025-03-01, reminder due
```

**March 12, 2025 — No Response, Create L2**
```
Operator:
1. Still no response from Priya
2. Clicks "Create Next Level"
3. Modal: Create followup_level=2, reminder_date=2025-03-22
4. Systems auto-suggests: "Level 2 will auto-create on 2025-03-22" (if enabled)
5. Creates followup_id=200, dispatch_id=1, followup_level=2, status='Pending'
6. Now two follow-ups in system:
   - Level 1: Pending, reminder_date=2025-03-11 (overdue by 1 day)
   - Level 2: Pending, reminder_date=2025-03-22 (upcoming)
```

**March 12, 2025 — Response to L1**
```
Meanwhile, Priya calls back:
- Operator finds original Level-1 followup
- Updates: status='Informed', remarks='Will collect materials from school office'
- Level-1 now shows: Informed, not in overdue list
- But Level-2 remains pending with future reminder
```

**March 22, 2025 — Escalation Results**
```
Operator checks:
- Dispatch 1: dispatch_date=2025-03-01, status='Dispatched'
- Level-1: status='Informed', remarks='...'
- Level-2: status='Pending', reminder_date=2025-03-22 (today, now overdue)
  - If no response today, consider Level-3
  - Or if Priya confirms receipt, mark dispatch.pod_date and close
```

**March 25, 2025 — Final Resolution**
```
Priya submits POD for Dispatch 1:
- Operator updates dispatch_id=1: pod_date=2025-03-25, status='Received'
- Marks both followups as 'Completed'
- Dispatch 1 closes: Total 25 days from dispatch to POD (dispatch_date 03-01 → pod_date 03-25)

Dispatch 2 (March 5 dispatch):
- Reminder date: 2025-03-15 (passed, overdue)
- Operator must handle this separately if no response
```

---

### Example 3: Reporting Analysis

**Scenario**: End of month report (March 2025)

**Operator-generated at admin request**:

**Consolidated Report** (GET /api/reports?type=consolidated&from_date=2025-03-01&to_date=2025-03-31)

```
Output:
┌─────┬──────────────────┬───────────┬───────────────┬──────────────┬───────────────┬──────────────────┐
│ SNo │ Teacher          │ Contact   │ School        │ Dispatches   │ Last Dispatch │ Latest Status    │
├─────┼──────────────────┼───────────┼───────────────┼──────────────┼───────────────┼──────────────────┤
│ 1   │ Ram Kumar        │ 9876543210│ Govt School   │ 1            │ 2025-04-05    │ Completed (L1)   │
│ 2   │ Priya Sharma     │ 9876543211│ Girls School  │ 2            │ 2025-03-05    │ Completed (L2)   │
│ 3   │ Arjun Singh      │ 9876543212│ CBSE School   │ 2            │ 2025-03-28    │ Pending (L1) ⚠️  │
│ ... │                  │           │               │              │               │                  │
└─────┴──────────────────┴───────────┴───────────────┴──────────────┴───────────────┴──────────────────┘
```

**Key Metrics**:
- Total teachers: 127
- Active dispatches in period: 253
- Pending follow-ups (overdue): 12
- Average days to POD: 18 days
- Follow-up effectiveness: 87% (223 completed / 256 created)

**Label Report** (GET /api/reports?type=label&school_type=Govt.%20School)

```
Output: 4-column grid layout
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ [BARCODE IMG]   │ [BARCODE IMG]   │ [BARCODE IMG]   │ [BARCODE IMG]   │
│ Ram Kumar       │ Lakshmi Nair     │ Bala Chandra    │ Sneha Verma     │
│ 42 School Rd    │ 100 Park Lane    │ 50 Main St      │ 75 Temple Rd    │
│ Pin: 600001     │ Pin: 635001      │ Pin: 631402     │ Pin: 613401     │
│ Govt School     │ Govt School      │ Govt School     │ Govt School     │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
... (continues for all filtered teachers)
```

Ready to print on label stock sheets!

**Dispatch Report** (Filter: 2025-03-01 to 2025-03-31)

```
┌────┬────────────────┬──────────────┬──────────────┬──────────┬──────────┬──────────────────┐
│ ID │ Teacher        │ Dispatch Dt  │ POD Dt       │ Days     │ Status   │ Follow-ups       │
├────┼────────────────┼──────────────┼──────────────┼──────────┼──────────┼──────────────────┤
│ 1  │ Ram Kumar      │ 2025-03-01   │ 2025-03-16   │ 15       │ Received │ L1(Inf), L2(Cmp) │
│ 2  │ Priya Sharma   │ 2025-03-05   │ (pending)    │ 23       │ Dispatch │ L1(Pend)         │
│ 3  │ Arjun Singh    │ 2025-03-10   │ 2025-03-28   │ 18       │ Received │ L1(Inf)          │
│ ... │               │              │              │          │          │                  │
└────┴────────────────┴──────────────┴──────────────┴──────────┴──────────┴──────────────────┘

Summary:
- Dispatches: 253
- Received: 235 (93%)
- Pending: 18 (7%)
- Avg days to POD: 18
```

**School Address Report** (All schools in Chennai district)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHENNAI GOVT SCHOOL
123 Government Road, Chennai
Pin: 600001

Teachers receiving materials:
- Ram Kumar (MAT, ENG, 6-8, TM/EM)
- Meera Devi (SCI, 6-9, EM)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIRLS' GOVT SECONDARY SCHOOL
75 Park Avenue, Chennai
Pin: 600002

Teachers receiving materials:
- Priya Sharma (MAT, SCI, ENG, 6-9, TM/EM)
- Sudha Kumari (SCI, 6-10, TM)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
... (continues for all schools)
```

Use this to send batch materials to school office for distribution!

---

## Security Implementation

### 1. JWT Token Management

**Token Storage**:
- **Stored in**: `sessionStorage` (not `localStorage`)
- **Key**: `tb_jwt`
- **Lifecycle**: 
  - Created on login
  - Verified on app init (GET /api/auth/me)
  - Cleared on logout or tab close
- **Security Benefits**:
  - `sessionStorage` clears when tab/browser closes
  - Prevents XSS token theft from browser storage
  - No localStorage exposure to malware

**Token Contents**:
- User ID
- Username
- Role (admin, user, operator)
- Issued at (iat)
- Expiry (exp) — typically 24 hours

**Validation**:
- Every API request includes: `Authorization: Bearer <JWT>`
- Backend middleware/jwt.php verifies:
  - Token signature (HMAC-SHA256)
  - Expiry time
  - User role for role-based access

---

### 2. CORS (Cross-Origin Resource Sharing)

**Configuration** (middleware/cors.php):
- Allows requests from allowed origins only (frontend domain)
- Preflight requests (OPTIONS) handled
- Credentials allowed for JWT transmission
- Safe headers only (application/json, etc.)

**Protection**:
- Prevents malicious websites from making API calls on behalf of user
- Only whitelisted frontend domain can access API

---

### 3. SQL Injection Prevention

**Method**: Prepared Statements with Bound Parameters

Every database query uses:
```php
$stmt = $conn->prepare("SELECT * FROM teachers WHERE barcode = ? AND isActive = 1");
$stmt->bind_param('s', $barcode);  // 's' = string type
$stmt->execute();
```

**Benefits**:
- SQL code separated from data
- Special characters escaped automatically
- Attacker input cannot alter query logic
- Prevents SQL injection vectors

---

### 4. Password Security

**Hashing Algorithm**: Bcrypt (industry standard)

**Registration**:
```php
$hashedPassword = password_hash($inputPassword, PASSWORD_BCRYPT);
// Stored in DB: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
```

**Login**:
```php
if (password_verify($inputPassword, $storedHash)) {
    // Correct password
    issueJWT();
}
```

**Properties**:
- One-way hashing (cannot be reversed)
- Salt automatically included (15 rounds)
- Even identical passwords have different hashes
- Resistant to rainbow table attacks

---

### 5. Role-Based Access Control (RBAC)

**Enforcement Points**:

1. **index.php Router** (before API dispatch):
   ```php
   if (in_array($resource, $protectedResources)) {
       $authUser = requireAuth();
       if ($authUser['role'] === 'operator' && $resource !== 'dispatch') {
           sendError('Forbidden — operators can only access dispatch', 403);
       }
   }
   ```

2. **Per-Endpoint Checks**:
   - User management: Only admin
   - Teacher management: Admin + user
   - Dispatch: All roles (but operator restricted at router level)

**Benefits**:
- Operator cannot access teacher/user/followup data
- Cannot create/modify users
- Cannot generate sensitive reports
- Can only scan barcodes for dispatch

---

### 6. Data Validation

**Input Validation** (before database):
- Pincode: Exactly 6 digits
- Contact: Numeric, 10-15 characters
- Email: Valid format
- Names: Non-empty, max length
- Enumerations: Must be in allowed list (district, subject, school type)
- Dates: Valid date format

**Output Encoding** (before frontend):
- HTML entities escaped in JSON responses
- Special characters properly encoded
- Prevents stored XSS if frontend displays user input

---

### 7. Barcode Validation

**Validation Chain**:
1. Barcode string checked for format
2. Barcode looked up in `teachers` table
3. Teacher `isActive=1` verified
4. Duplicate dispatch check on (teacher_id, dispatch_date)

**Attack Prevention**:
- Fake barcodes rejected (not in database)
- Inactive teachers cannot be dispatched to
- Prevents same-day duplicates (malicious retry)

---

### 8. Data Integrity

**Database Constraints**:
- **PRIMARY KEY** (id): Ensures uniqueness
- **FOREIGN KEY** (teacher_id, dispatch_id): Referential integrity
- **UNIQUE KEY** (teacher_id, dispatch_date): Prevents duplicates
- **DEFAULT VALUES**: Enforce consistent state
- **TIMESTAMP**: Automatic audit trail

---

### 9. Error Handling

**Safe Error Messages**:
- Client: Generic message ("Dispatch failed")
- Logs: Detailed error with SQL details
- No database schema leaked to frontend
- No sensitive file paths exposed

---

### 10. HTTPS Requirement

**Production**:
- All traffic over HTTPS (TLS/SSL encryption)
- Protects JWT tokens in transit
- Prevents man-in-the-middle attacks
- Certificates validated

---

## Configuration & Deployment

### Local Development Setup

**Prerequisites**:
- Apache 2.x with mod_rewrite enabled
- PHP 8.0+
- MySQL 8.0+

**Steps**:

1. **Install Dependencies**
   ```bash
   # Backend: No external dependencies, uses built-in PHP
   
   # Frontend:
   cd teachers-bank-frontend
   npm install
   ```

2. **Configure Database**
   ```bash
   # Edit config/database.php
   define('DB_HOST', 'localhost');
   define('DB_USER', 'root');
   define('DB_PASS', 'your_password');
   define('DB_NAME', 'teachers_bank');
   ```

3. **Create Database**
   ```bash
   mysql -u root -p < teachers-bank-api/config/schema.sql
   ```

4. **Enable Mod_Rewrite**
   ```bash
   a2enmod rewrite
   # Ensure AllowOverride All in VirtualHost config
   sudo systemctl restart apache2
   ```

5. **Configure Frontend API**
   ```bash
   # Create .env.local in teachers-bank-frontend/
   NEXT_PUBLIC_API_BASE=http://localhost/teachers-bank-api/index.php
   ```

6. **Run Frontend Dev Server**
   ```bash
   cd teachers-bank-frontend
   npm run dev
   # Runs on http://localhost:3000
   ```

7. **Access Application**
   - Frontend: http://localhost:3000
   - Default login: username=admin, password=admin123
   - API directly: http://localhost/teachers-bank-api/index.php/api/teachers (requires JWT in header)

---

### Production Deployment

**Observed Production Setup** (from AuthContext.tsx):
- **Domain**: https://iiplrgscbse.com
- **Backend**: /teachers-bank-api/index.php
- **Frontend**: Deployed on same domain or separate CDN

**Deployment Checklist**:

1. **Backend (PHP)**
   - Deploy to `/var/www/html/teachers-bank-api/` (Apache)
   - Update config/database.php with prod DB credentials
   - Ensure mod_rewrite works with production server
   - Set appropriate file permissions (644 for files, 755 for dirs)

2. **Frontend (Next.js)**
   - Build: `npm run build`
   - Deploy built output to static hosting or Next.js server
   - Or: `npm run start` to run Node.js server
   - Update NEXT_PUBLIC_API_BASE to production API URL
   - Use HTTPS only

3. **Database**
   - MySQL 8.0+ on prod server
   - Daily backups of `teachers_bank` database
   - User with limited permissions (not root)

4. **Security**
   - HTTPS certificates (Let's Encrypt or paid)
   - Firewall rules: Only allow HTTP/HTTPS traffic
   - Regular security updates for OS, PHP, MySQL
   - Restrict database access to backend server only

5. **Monitoring**
   - Application logs: Check Apache error/access logs
   - Database logs: Monitor slow query logs
   - Uptime monitoring: Ping /api/auth/me endpoint
   - Error tracking: Log failed database queries

6. **Performance**
   - MySQL indexing on frequently filtered columns (dt_code, dispatch_date)
   - Frontend caching: Static assets (CSS, JS, images)
   - API response caching: GET endpoints (optional Redis)
   - Database query optimization: Review slow queries

---

## Notable Implementation Details

### 1. Follow-up "Only Latest" Query Pattern

When listing follow-ups, the system retrieves only the **latest follow-up per dispatch** (avoids showing old history).

**SQL Pattern**:
```sql
SELECT f.*, d.dispatch_date, t.teacher_name
FROM followups f
JOIN (
    SELECT dispatch_id, MAX(id) AS latest_id
    FROM followups
    GROUP BY dispatch_id
) latest ON latest.latest_id = f.id
JOIN dispatch d ON f.dispatch_id = d.id
JOIN teachers t ON d.teacher_id = t.id
```

**Why**: Simplifies UI (one row per dispatch rather than multiple rows per level)

---

### 2. Operator Role Restrictions

Operators are **extremely restricted** to dispatch endpoint only.

**Design Rationale**:
- Scanning operations require no data access beyond barcode lookup
- Prevents operators from modifying teacher records or user accounts
- Reduces liability for data tampering
- Enforced at both router (index.php) and endpoint levels

---

### 3. Soft Deletes (isActive Flag)

Teachers are never permanently deleted, only "deactivated" (isActive=0).

**Benefits**:
- Maintains data integrity (foreign keys still valid)
- Preserves dispatch/follow-up history for archived teacher
- Allows re-activation if deactivation was mistake
- Audit trail preserved

---

### 4. CSV Normalization for Multi-Value Fields

When saving CSV fields (sub_code, std, medium):
- Split by comma
- Trim whitespace
- Remove duplicates: array_unique()
- Validate against allowed lists: SUBJECTS, STANDARDS, MEDIUMS
- Rejoin deduplicated, validated values
- Store back as CSV

**Example**:
```
Input: "MAT, ENG, MAT, INVALID"
→ Split: ["MAT", " ENG", " MAT", " INVALID"]
→ Trim: ["MAT", "ENG", "MAT", "INVALID"]
→ Remove duplicates: ["MAT", "ENG", "INVALID"]
→ Validate: ["MAT", "ENG"] (INVALID rejected)
→ Store: "MAT,ENG"
```

---

### 5. Classifications JSON Parsing

When saving classifications (from CSV subject-standard-medium):

**Input Format**: `"6|TM|MAT,ENG;7|EM|SCI"`

**Process**:
1. Split by semicolon: ["6|TM|MAT,ENG", "7|EM|SCI"]
2. For each entry:
   - Split by pipe: std="6", medium="TM", subjects_raw="MAT,ENG"
   - Split subjects: ["MAT", "ENG"]
   - Validate: Check subject-standard pairing
3. Build JSON array

**Output**:
```json
[
  {"std":"6", "medium":"TM", "subjects":["MAT","ENG"]},
  {"std":"7", "medium":"EM", "subjects":["SCI"]}
]
```

**Usage**:
- Stored in LONGTEXT column
- Parsed on report generation
- Returned as structured JSON in API responses

---

### 6. Pagination Strategy

All list endpoints support pagination:
- `page`: Page number (1-indexed), default 1
- `limit`: Records per page, default 20, max 100

**Benefits**:
- Prevents huge data dumps
- Reduces memory usage
- Faster API responses
- Better frontend experience

**Implementation**:
```php
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
$offset = ($page - 1) * $limit;

// Get total count
$stmt = $conn->prepare("SELECT COUNT(*) AS total FROM teachers");
$total = $stmt->get_result()->fetch_assoc()['total'];

// Get paginated results
$stmt = $conn->prepare("SELECT * FROM teachers LIMIT ? OFFSET ?");
$stmt->bind_param('ii', $limit, $offset);
```

---

### 7. Authentication Context (Frontend React)

**File**: src/context/AuthContext.tsx

**Features**:
- Loads JWT from sessionStorage on app init
- Verifies token with GET /api/auth/me
- Maintains user object in context
- Handles automatic redirects:
  - Unauthenticated → /login
  - Operator access to admin pages → 403

**Token Persistence**:
- Survives page refresh (stored in sessionStorage)
- Cleared on tab close (browser behavior)
- No tokens in HTML/cookies

---

### 8. API Wrapper (lib/api.ts)

**Consistency**:
```typescript
// All API calls use wrapper with JWT headers
const response = await fetch(`${API_BASE}/api/teachers`, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`,
  },
});
```

**Benefits**:
- Centralized token management
- Automatic header injection
- Consistent error handling
- Ensures JWT always included

---

### 9. Barcode Preview (Real-Time)

**Frontend** (JsBarcode library):
```typescript
import JsBarcode from 'jsbarcode';

useEffect(() => {
  if (barcodeValue) {
    JsBarcode("#barcode-canvas", barcodeValue, {
      format: "CODE128",
      width: 2,
      height: 100,
    });
  }
}, [barcodeValue]);
```

**User Experience**:
- Operator scans barcode
- SVG image renders in real-time
- Confirms read before submitting
- Catches scanning errors early

---

### 10. Duplicate Dispatch Prevention

**Database Level**:
```sql
UNIQUE KEY unique_teacher_dispatch_date (teacher_id, dispatch_date)
```

**Application Level**:
```php
$chk = $conn->prepare("SELECT id FROM dispatch WHERE teacher_id = ? AND dispatch_date = ?");
$chk->bind_param('is', $teacher['id'], $dispatchDate);
$chk->execute();
if ($chk->get_result()->fetch_assoc()) {
    sendError('Already dispatched today. Duplicate dispatch rejected.', 409);
}
```

**Prevents**:
- Accidental double-scanning
- Malicious retry attacks
- Data integrity (only 1 dispatch per teacher per day)

---

## Summary of Key Processes

| Process | Trigger | Key Actors | Duration | Output |
|---------|---------|-----------|----------|--------|
| **Teacher Onboarding** | Manual entry | Admin/User | 5 mins | Teacher record + auto barcode |
| **Barcode Scanning** | Operator scans | Operator | 30 secs | Dispatch created, L1 followup auto-created |
| **Follow-up Tracking** | Reminder date reached | Operator/Admin | 1-2 mins | Status updated, remarks logged |
| **Escalation** | L1 overdue + no response | Operator/Admin | 1 min | L2 created with new reminder |
| **POD Confirmation** | Teacher submits receipt | Operator/Admin | 1 min | Dispatch.pod_date set, follow-up marked complete |
| **Reporting** | Manual request or scheduled | Admin | 5-10 mins | Filtered data export (consolidated/label/audit/school) |
| **User Management** | Admin action | Admin | 2 mins | User created/updated/deactivated |

---

## Quick Reference: Most Important Tables

### teachers Table (Core)
- `id`: Primary key
- `barcode`: Unique identifier for scanning
- `teacher_name, contact_number`: Contact info
- `dt_code`: District assignment
- `sub_code, std, medium`: Multi-value capabilities
- `classifications`: JSON map of subject-standard-medium relationships
- `isActive`: Soft-delete flag

### dispatch Table (Tracking)
- `id`: Primary key
- `teacher_id`: FK to teacher
- `dispatch_date`: When sent
- `pod_date`: When received (proof of delivery)
- `status`: Dispatched / Received / etc.
- **UNIQUE(teacher_id, dispatch_date)**: Prevents same-day duplicates

### followups Table (Escalation)
- `dispatch_id`: FK to dispatch
- `followup_level`: 1, 2, 3, ... (escalation)
- `reminder_date`: When follow-up is due
- `status`: Pending → Informed → Processing → Completed
- `remarks`: Notes from contact

### users Table (Authentication)
- `username, password`: Login credentials
- `role`: admin / user / operator
- `isActive`: Account status

---

**End of Analysis Document**

Generated: March 28, 2026
Reference for: Teachers Bank Application (Complete System)

