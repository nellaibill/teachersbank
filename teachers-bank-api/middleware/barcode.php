<?php
// middleware/barcode.php

/**
 * Generate barcode string for a teacher
 * Format: ARL|<DT_CODE>|<SUB_CODE>|<MEDIUM>|<STD>|<AUTO_ID>
 * Example: ARL|EN6|X|EM|01 -> barcode image
 */
function generateBarcodeString($teacher) {
    $dt   = strtoupper($teacher['dt_code']   ?? 'XX');
    $sub  = strtoupper($teacher['sub_code']  ?? 'XX');
    $med  = strtoupper($teacher['medium']    ?? 'EM');
    $std  = str_pad($teacher['std'] ?? '00', 2, '0', STR_PAD_LEFT);
    $id   = str_pad($teacher['id'],           6, '0', STR_PAD_LEFT);

    return "ARL|{$dt}|{$sub}|{$med}|{$std}|{$id}";
}

/**
 * Generate a barcode image as base64 PNG using pure PHP (no external lib needed)
 * Returns the barcode string; the frontend renders it visually using a JS barcode lib
 */
function generateBarcode($teacher) {
    return generateBarcodeString($teacher);
}
