# ============================================================
# Teachers Bank API — cURL Test Commands (Updated)
#
# TWO URL STYLES — both work:
#
# Style A (with mod_rewrite .htaccess):
#   http://localhost/teachers-bank-api/api/teachers
#
# Style B (direct - NO mod_rewrite needed - USE THIS IF STYLE A FAILS):
#   http://localhost/teachers-bank-api/index.php/api/teachers
#
# ============================================================

BASE="http://localhost/teachers-bank-api/index.php"
# If mod_rewrite works, switch to:
# BASE="http://localhost/teachers-bank-api"


# ── CREATE TEACHER ───────────────────────────────────────────
curl -X POST "$BASE/api/teachers" \
  -H "Content-Type: application/json" \
  -d '{
    "teacher_name": "Mr. Thirumoorthy",
    "contact_number": "9585735917",
    "address_1": "Ponparappi Post",
    "address_2": "Senthurai TK",
    "address_3": "Ariyalur - 621709",
    "dt_code": "ARL",
    "sub_code": "MAT",
    "std": "10",
    "year_code": "2025",
    "medium": "TM",
    "school_name": "Govt. Higher Secondary School, Ponparappi",
    "school_type": "Govt. School"
  }'

# ── LIST TEACHERS ─────────────────────────────────────────────
curl -X GET "$BASE/api/teachers"
curl -X GET "$BASE/api/teachers?dt_code=ARL&medium=TM"
curl -X GET "$BASE/api/teachers?search=Thirumoorthy"

# ── GET / UPDATE / DELETE TEACHER ────────────────────────────
curl -X GET "$BASE/api/teachers/1"
curl -X PUT "$BASE/api/teachers/1" \
  -H "Content-Type: application/json" \
  -d '{"teacher_name":"Mr. Thirumoorthy S","contact_number":"9585735917","isActive":1}'
curl -X DELETE "$BASE/api/teachers/1"

# ── DISPATCH (SCAN BARCODE) ───────────────────────────────────
# Use barcode value from teacher creation response
curl -X POST "$BASE/api/dispatch" \
  -H "Content-Type: application/json" \
  -d '{"barcode":"ARL|MAT|MAT|TM|10|000001","dispatch_date":"2026-02-27"}'

# Duplicate scan - returns 409
curl -X POST "$BASE/api/dispatch" \
  -H "Content-Type: application/json" \
  -d '{"barcode":"ARL|MAT|MAT|TM|10|000001","dispatch_date":"2026-02-27"}'

curl -X GET "$BASE/api/dispatch"
curl -X GET "$BASE/api/dispatch?date=2026-02-27"
curl -X GET "$BASE/api/dispatch/1"
curl -X PUT "$BASE/api/dispatch/1" \
  -H "Content-Type: application/json" \
  -d '{"pod_date":"2026-03-05","status":"Delivered"}'

# ── FOLLOWUPS ─────────────────────────────────────────────────
curl -X GET "$BASE/api/followups?date=today&status=Pending"
curl -X GET "$BASE/api/followups?dispatch_id=1"
curl -X GET "$BASE/api/followups/1"
curl -X PUT "$BASE/api/followups/1" \
  -H "Content-Type: application/json" \
  -d '{"status":"Informed","remarks":"Teacher confirmed receipt"}'

# ── REPORTS ───────────────────────────────────────────────────
curl -X GET "$BASE/api/reports?type=consolidated"
curl -X GET "$BASE/api/reports?type=consolidated&dt_code=ARL"
curl -X GET "$BASE/api/reports?type=label"
curl -X GET "$BASE/api/reports?type=dispatch&from_date=2026-02-01&to_date=2026-02-28"
curl -X GET "$BASE/api/reports?type=school_address"
