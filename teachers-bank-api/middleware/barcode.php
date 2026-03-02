<?php
// middleware/barcode.php
// Format: DON + zero-padded 5-digit ID
// Examples: DON00001, DON00010, DON00100, DON99999

function generateBarcode($teacher): string {
    $id = (int)($teacher['id'] ?? 0);
    return 'DON' . str_pad($id, 5, '0', STR_PAD_LEFT);
}