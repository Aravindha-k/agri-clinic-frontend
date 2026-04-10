#!/usr/bin/env python3
"""
Convert Kavya Agri Clinic Logo from PDF to Transparent PNG
Maintains aspect ratio and creates high-quality output
"""

import os
from pathlib import Path
from PIL import Image
import fitz  # PyMuPDF


def convert_pdf_to_png_transparent(pdf_path, output_path, dpi=300):
    """
    Convert PDF to transparent PNG with high quality

    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output PNG file
        dpi: Resolution in dots per inch (higher = better quality)
    """
    try:
        print(f"Converting: {pdf_path}")
        print(f"DPI: {dpi}")

        # Open PDF
        pdf_document = fitz.open(pdf_path)
        first_page = pdf_document[0]

        # Get page dimensions
        rect = first_page.rect
        pix = first_page.get_pixmap(matrix=fitz.Matrix(dpi / 72, dpi / 72), alpha=True)

        # Convert to PNG with transparency
        img_data = pix.tobytes("png")
        img = Image.open(fitz.Pixmap(first_page, alpha=True).tobytes("ppm"))

        # Better approach: use fitz to render with transparency
        pix = first_page.get_pixmap(matrix=fitz.Matrix(dpi / 72, dpi / 72), alpha=True)
        pix.save(output_path)

        # Clean up
        pdf_document.close()

        # Verify output
        if os.path.exists(output_path):
            size = os.path.getsize(output_path)
            print(f"✓ Successfully converted to PNG")
            print(f"Output: {output_path}")
            print(f"File size: {size} bytes")

            # Display image info
            img = Image.open(output_path)
            print(f"Image dimensions: {img.size[0]} x {img.size[1]} pixels")
            print(
                f"Image mode: {img.mode} (supports transparency: {img.mode == 'RGBA'})"
            )
            return True
        else:
            print("✗ Conversion failed - output file not created")
            return False

    except Exception as e:
        print(f"✗ Error during conversion: {str(e)}")
        return False


if __name__ == "__main__":
    # Set paths
    workspace_root = r"d:\agri-admin-enterprise\agri-admin-enterprise"
    pdf_file = os.path.join(
        workspace_root, "src", "assets", "Kavya_agri_clinic_logo.pdf"
    )
    png_file = os.path.join(
        workspace_root, "src", "assets", "Kavya_agri_clinic_logo.png"
    )

    # Verify PDF exists
    if not os.path.exists(pdf_file):
        print(f"✗ PDF file not found: {pdf_file}")
        exit(1)

    print("=" * 60)
    print("LOGO CONVERSION: PDF to Transparent PNG")
    print("=" * 60)

    # Convert with high quality
    success = convert_pdf_to_png_transparent(pdf_file, png_file, dpi=300)

    print("=" * 60)
    if success:
        print("✓ Conversion completed successfully!")
    else:
        print("✗ Conversion failed!")
    print("=" * 60)
