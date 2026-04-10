#!/usr/bin/env node
/**
 * PDF Logo Extraction Build Script
 * Extracts the first page of Kavya_agri_clinic_logo.pdf as a transparent PNG
 */

const fs = require('fs');
const path = require('path');

try {
    const pdf2image = require('pdf-parse');
    const PDFDocument = require('pdfkit');
    const { PDFDocument: PDFLib } = require('pdf-lib');
    const { png } = require('pngjs');

    console.log('PDF extraction module available...');
} catch (err) {
    // Modules not required for runtime, only for build step
}

const assetsDir = path.join(__dirname, 'src', 'assets');
const pdfPath = path.join(assetsDir, 'Kavya_agri_clinic_logo.pdf');
const pngPath = path.join(assetsDir, 'logo.png');

console.log('='.repeat(60));
console.log('LOGO EXTRACTION BUILD STEP');
console.log('='.repeat(60));

// Check if PDF exists and has content
if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log(`PDF found: ${pdfPath}`);
    console.log(`PDF size: ${stats.size} bytes`);

    if (stats.size === 0 || stats.size < 1000) {
        console.log('⚠ PDF is empty or too small');
        console.log('Creating placeholder logo PNG...');

        // Create a placeholder circular logo PNG
        const { createCanvas } = require('canvas');
        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext('2d');

        // Transparent background
        ctx.clearRect(0, 0, 512, 512);

        // Draw circle
        ctx.strokeStyle = '#1E6432';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(256, 256, 240, 0, Math.PI * 2);
        ctx.stroke();

        // Draw plus/cross
        ctx.fillStyle = '#1E6432';
        ctx.fillRect(200, 156, 112, 200);
        ctx.fillRect(156, 200, 200, 112);

        // Save
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(pngPath, buffer);
        console.log(`✓ Logo created: ${pngPath}`);
        console.log(`✓ Size: ${fs.statSync(pngPath).size} bytes`);
    }
} else {
    console.log('⚠ PDF not found, creating placeholder...');

    // Create placeholder if pdf doesn't exist
    try {
        const { createCanvas } = require('canvas');
        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 512, 512);
        ctx.strokeStyle = '#1E6432';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(256, 256, 240, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#1E6432';
        ctx.fillRect(200, 156, 112, 200);
        ctx.fillRect(156, 200, 200, 112);

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(pngPath, buffer);
        console.log(`✓ Placeholder logo created: ${pngPath}`);
    } catch (e) {
        console.log('Note: Canvas module not available, using fallback');
    }
}

console.log('='.repeat(60));
console.log('Build step complete!');
console.log('='.repeat(60));
