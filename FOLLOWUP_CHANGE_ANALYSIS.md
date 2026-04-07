# Follow-up Logic Change — Impact Analysis

**Date:** April 7, 2026  
**Status:** Analysis Phase (Production Review Required)  
**Current Implementation:** Follow-up triggered on dispatch creation  
**Requested Change:** Follow-up triggered only on "Delivered" status update

---

## 1. Current Implementation

### Where Follow-ups Are Created

**Primary Location:** When barcode is scanned during dispatch
- **File:** `teachers-bank-api/api/dispatch/index.php` (lines 57-62)
- **File:** `teachers-bank-api/api/dispatch/router.php` (lines 45-47)
- **Trigger:** `POST /api/dispatch` (scanAndDispatch function)
- **Timing:** Immediately when dispatch record is created
- **Details:**
  ```php
  // Line 57-62 in index.php
  $reminderDate = date('Y-m-d', strtotime($dispatchDate . ' +10 days'));
  $fup = $conn->prepare("
      INSERT INTO followups (dispatch_id, followup_level, reminder_date, status)
      VALUES (?, 1, ?, 'Pending')
  ");
  ```

**Secondary Location:** Manual follow-up creation
- **File:** `teachers-bank-api/api/followups/index.php` (line 149)
- **Trigger:** `POST /api/followups` (createFollowup function)
- **Usage:** Staff can manually create Level 2+ follow-ups for escalation
- **This remains unchanged** — only auto-creation on dispatch needs to change

### Current Dispatch Statuses

The dispatch table has a `status` field with these values (from UI):
- `Dispatched` (default, set when barcode scanned)
- `Delivered` (set via UpdateDispatchModal when materials received)
- `Returned` (set via UpdateDispatchModal)

### Related Dates

- `dispatch_date` — When materials were sent out
- `delivered_date` — When teacher received materials (new field)
- `pod_date` — When proof of delivery was received
- `created_at` — Record created timestamp

---

## 2. Requested Change

### What Needs to Change

**Old Flow:**
```
Scan Barcode
    ↓
Dispatch created (status = "Dispatched")
    ↓
[AUTOMATIC] Follow-up Level 1 created → reminder_date = dispatch_date + 10 days
```

**New Flow:**
```
Scan Barcode
    ↓
Dispatch created (status = "Dispatched")
    ↓
[NO AUTOMATIC FOLLOW-UP]
    ↓
Update dispatch status to "Delivered"
    ↓
[AUTOMATIC] Follow-up Level 1 created → reminder_date = delivered_date + 10 days
```

### Key Change Points

1. **Remove auto-creation from scanAndDispatch()**
   - Stop creating follow-up in `POST /api/dispatch`
   - Affects: `api/dispatch/index.php` and `api/dispatch/router.php`

2. **Add auto-creation to updateDispatch()**
   - Create follow-up when status changes to "Delivered"
   - Affects: `api/dispatch/index.php` and potentially `api/dispatch/router.php`
   - Check if Level 1 already exists to avoid duplicates

3. **Frontend notification change**
   - Currently shows "Follow-up reminder: [date]" in dispatch success
   - Will need to update or remove this notification

---

## 3. Impact Analysis

### Data Impact

#### 1. Existing Dispatches in Database
**Status:** ⚠️ **REQUIRES MIGRATION DECISION**

- **Dispatches with status = "Dispatched"** 
  - These have existing follow-ups (Level 1)
  - Question: Delete these pending follow-ups or keep them?
  - Recommendation: Keep them (avoid data loss, allow manual management)

- **Dispatches with status = "Delivered"**
  - These should have already had follow-ups
  - These are OK (follow-up already created)

- **Dispatches with status = "Returned"**
  - Follow-ups may not be relevant
  - But shouldn't break anything

#### 2. Production Data Considerations
- **Database has ~?? dispatch records** (needs count verification)
- **Database has ~?? followup records** (needs count verification)
- **Operational impact:** Follow-ups already created won't be automatically removed
- **Manual cleanup:** May need to manually delete or mark completed certain follow-ups

### Workflow Impact

#### 1. For Operators (Positive)
- ✅ Follow-ups only appear after confirmed delivery
- ✅ Reduces noise from premature follow-ups
- ✅ More accurate follow-up timing

#### 2. For Operators (Negative)
- ❌ Must explicitly mark status as "Delivered" to trigger follow-up
- ❌ If forgotten, follow-up won't be created at all
- ⚠️ Requires operational discipline
- ⚠️ Won't work if they only scan barcode without status update

#### 3. For Management (Positive)
- ✅ Only track follow-ups for actually delivered materials
- ✅ Better separation: dispatch ≠ delivery

#### 4. For Management (Negative)
- ❌ May lose visibility of materials that are dispatched but not yet delivered
- ⚠️ If delivery confirmation is forgotten for 10+ days, follow-up reminder won't fire

### Reporting & Analytics Impact

**Potentially Affected Reports:**
- **Follow-ups Report:** Will only show follow-ups for delivered items
- **Dispatch Report:** No change (shows all dispatches)
- **Consolidated Report:** May need adjustment if it relies on follow-up creation timing

### Edge Cases & Risks

#### 1. Lost Follow-ups (HIGH RISK)
- **Scenario:** Dispatch marked "Delivered" but status update PUT request fails
- **Result:** Follow-up won't be created
- **Mitigation:** Ensure error handling and retry mechanism in frontend

#### 2. Duplicate Follow-ups (MEDIUM RISK)
- **Scenario:** Status updated to "Delivered" twice
- **Result:** Two Level 1 follow-ups created
- **Mitigation:** Add check to prevent duplicate Level 1 before creating

#### 3. Stale Dispatches (MEDIUM RISK)
- **Scenario:** Dispatch in "Dispatched" status for months never updated to "Delivered"
- **Result:** No follow-up reminder ever created
- **Mitigation:** Could add manual followup creation or status audit task

#### 4. Manual Follow-up Creation Still Possible
- **Status:** ✅ **No change** — Staff can still manually create follow-ups via POST /api/followups
- **Impact:** Provides fallback mechanism for edge cases

---

## 4. Implementation Checklist

### Backend Changes Required

- [ ] **api/dispatch/index.php**
  - Remove follow-up creation from `scanAndDispatch()` (lines 57-62)
  - Add follow-up creation logic to `updateDispatch()` (when status="Delivered")
  - Add duplicate check before creating follow-up

- [ ] **api/dispatch/router.php**
  - Same changes as above (verify if code is duplicated or referenced)

- [ ] **Database Migration** (optional)
  - Could add index on (dispatch_id, followup_level) for faster uniqueness checks
  - Could add check constraint on delivered_date vs delivered_status

### Frontend Changes Required

- [ ] **dispatch/page.tsx**
  - Update ScanResult modal to remove or modify follow-up reminder message
  - Add confirmation when updating dispatch to "Delivered"
  - Add visual feedback that follow-up will be created

- [ ] **UpdateDispatchModal**
  - Add notification that follow-up will be created when marking as "Delivered"
  - Handle response confirmation

### Testing Checklist

- [ ] Create dispatch (verify NO follow-up created)
- [ ] Update dispatch to "Delivered" (verify follow-up IS created with delivered_date + 10 days)
- [ ] Update dispatch twice (verify NO duplicate follow-ups)
- [ ] Manually create follow-up via API (verify still works)
- [ ] Verify followups page shows correct follow-ups
- [ ] Verify dispatch with manual status update to "Returned" (no follow-up)

### Operational Checklist

- [ ] Train staff on new workflow difference
- [ ] Communicate: "Scan doesn't trigger follow-up; delivery confirmation does"
- [ ] Monitor initial deployments for missed delivery confirmations
- [ ] Create runbook for manual follow-up creation if needed

---

## 5. Database State Before & After

### Current State (Example)
```
Dispatch ID=1:
├─ Created: 2026-03-01 10:00
├─ Status: Dispatched (via scan)
├─ Delivered Date: NULL
└─ Followup Level 1:
   ├─ Created: 2026-03-01 10:05 (AUTO)
   ├─ Reminder: 2026-03-11
   └─ Status: Pending ← FIRES 10 DAYS LATER
   
Dispatch ID=2:
├─ Created: 2026-03-02 10:00
├─ Status: Delivered (manually updated)
├─ Delivered Date: 2026-03-05
└─ Followup Level 1:
   ├─ Created: 2026-03-02 10:05 (AUTO, but ideally 2026-03-05)
   └─ Reminder: 2026-03-12 (SHOULD BE 2026-03-15)
```

### After Change (Example)
```
Dispatch ID=1:
├─ Created: 2026-03-01 10:00
├─ Status: Dispatched (via scan)
├─ Delivered Date: NULL
└─ Followup Level 1: NONE ← KEY DIFFERENCE
   
Dispatch ID=2:
├─ Created: 2026-03-02 10:00
├─ Status: Delivered (manually updated to Delivered)
├─ Delivered Date: 2026-03-05
└─ Followup Level 1:
   ├─ Created: 2026-03-05 14:30 (AUTO on status update)
   ├─ Reminder: 2026-03-15 (delivered_date + 10 days)
   └─ Status: Pending ← FIRES 10 DAYS AFTER DELIVERY
```

---

## 6. Questions to Address Before Implementation

1. **Existing Data:**
   - What should we do with existing follow-ups created from already-dispatched materials?
   - Keep them? Delete them? Mark as completed?

2. **Backward Compatibility:**
   - Are there any integrations or third-party systems expecting follow-ups immediately after dispatch?
   - Any scheduled jobs relying on follow-up creation timing?

3. **Operator Discipline:**
   - Will operators consistently mark dispatches as "Delivered"?
   - Should we add status update validation/enforcement?

4. **Fallback Plan:**
   - If delivery status isn't updated, how do we ensure follow-ups still happen?
   - Should we add a manual cleanup task or override mechanism?

5. **Reminder Timing:**
   - Should reminder = delivered_date + 10 days OR delivered_date + some other period?
   - Currently hardcoded to 10 days; is this correct?

---

## 7. Risk Assessment Matrix

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|-----------|
| Lost follow-ups (forgotten delivery update) | MEDIUM | HIGH | Manual override, audit reports |
| Duplicate follow-ups | LOW | LOW | Database uniqueness check |
| Operator confusion | MEDIUM | MEDIUM | Training, UI indicators |
| Existing data inconsistency | HIGH | MEDIUM | Data migration plan |
| Reporting confusion | LOW | MEDIUM | Documentation update |

---

## 8. Recommendation

**PROCEED WITH CAUTION** — The change is logically sound and improves follow-up accuracy, but requires:

1. **Clear Data Migration Plan** for existing follow-ups
2. **Operator Training** on the new workflow
3. **Monitoring Period** (1-2 weeks) to catch missed delivery confirmations
4. **Fallback Process** for manual follow-up creation
5. **Comprehensive Testing** before production deployment

**Suggested Rollout:**
- Week 1-2: Testing in development
- Week 3: DEV review & UAT with selected operators
- Week 4: Monitor closely after production deployment
- Ongoing: Track follow-up creation rates to identify issues

---

## 9. Implementation Files to Modify

```
✏️  teachers-bank-api/api/dispatch/index.php
✏️  teachers-bank-api/api/dispatch/router.php (if code is duplicated)
✏️  teachers-bank-frontend/src/app/dispatch/page.tsx
📊 OPTIONAL: Database migration for indexes/constraints
📚 DOCUMENTATION: Update ANALYSIS.md with new workflow
```

---

## Sign-off Checklist

- [ ] Product Owner review & approval
- [ ] Operations Manager review & approval  
- [ ] QA Test Plan prepared
- [ ] Rollback plan documented
- [ ] Operator training completed
- [ ] Data backup taken (pre-deployment)
