<?php
// middleware/barcode.php
// Barcode format: <DT_CODE>|<FIRST_SUB>|<MED>|<STD_RANGE>|<ID>
// Example: ARL|MAT|TM|6-8|000012

function generateBarcodeString($teacher): string {
    $dt  = strtoupper($teacher['dt_code'] ?? 'XX');

    // sub_code may be CSV — use first value only for barcode brevity
    $subRaw = $teacher['sub_code'] ?? '';
    $sub    = strtoupper(explode(',', $subRaw)[0] ?: 'XX');

    // medium may be CSV — use first value
    $medRaw = $teacher['medium'] ?? '';
    $med    = strtoupper(explode(',', $medRaw)[0] ?: 'XX');

    // std may be CSV — show as range if multiple, e.g. "6,7,8" → "6-8"
    $stdRaw = $teacher['std'] ?? '';
    $stds   = array_filter(explode(',', $stdRaw));
    if (count($stds) > 1) {
        $std = min($stds) . '-' . max($stds);
    } else {
        $std = $stds[0] ?? '00';
    }

    $id = str_pad($teacher['id'], 6, '0', STR_PAD_LEFT);

    return "{$dt}|{$sub}|{$med}|{$std}|{$id}";
}

function generateBarcode($teacher): string {
    return generateBarcodeString($teacher);
}