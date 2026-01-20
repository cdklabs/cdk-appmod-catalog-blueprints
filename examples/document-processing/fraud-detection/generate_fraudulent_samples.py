#!/usr/bin/env python3
"""
Generate fraudulent sample PDF documents for fraud detection testing.
Each document demonstrates a different type of fraud:
1. Metadata tampering (modified timestamps)
2. Pattern fraud (duplicate invoice numbers, rounded amounts)
3. Anomaly fraud (statistical outliers)
"""

import os
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from PyPDF2 import PdfReader, PdfWriter
import io

# Ensure sample-files directory exists
os.makedirs('sample-files', exist_ok=True)

def create_fraudulent_tampered_invoice():
    """
    Create an invoice with tampered metadata (timestamps don't match content).
    This demonstrates metadata fraud - the document claims to be from 2024 but
    metadata shows it was created very recently with suspicious software.
    """
    filename = 'sample-files/fraudulent_tampered_invoice.pdf'
    
    doc = SimpleDocTemplate(filename, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2C3E50'),
        spaceAfter=30,
    )
    story.append(Paragraph("INVOICE", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Company info - using a vendor from the blacklist
    company_style = styles['Normal']
    story.append(Paragraph("<b>QuickCash Enterprises LLC</b>", company_style))
    story.append(Paragraph("999 Suspicious Lane", company_style))
    story.append(Paragraph("Miami, FL 33101", company_style))
    story.append(Paragraph("Tax ID: 12-9999999", company_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Invoice details - claiming to be from 6 months ago
    # But the PDF metadata will show it was created today
    old_date = datetime.now() - timedelta(days=180)
    story.append(Paragraph(f"<b>Invoice Number:</b> INV-2023-009876", styles['Normal']))
    story.append(Paragraph(f"<b>Date:</b> {old_date.strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Paragraph(f"<b>Due Date:</b> {(old_date + timedelta(days=30)).strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Bill to
    story.append(Paragraph("<b>Bill To:</b>", styles['Normal']))
    story.append(Paragraph("Target Corporation", styles['Normal']))
    story.append(Paragraph("789 Victim Street", styles['Normal']))
    story.append(Paragraph("Boston, MA 02101", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Items table - suspicious high-value items
    data = [
        ['Item', 'Description', 'Qty', 'Unit Price', 'Total'],
        ['CONS-001', 'Consulting Services', '1', '$15,000.00', '$15,000.00'],
        ['CONS-002', 'Additional Consulting', '1', '$8,500.00', '$8,500.00'],
    ]
    
    table = Table(data, colWidths=[1*inch, 2.5*inch, 0.7*inch, 1*inch, 1*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(table)
    story.append(Spacer(1, 0.3*inch))
    
    # Totals
    totals_data = [
        ['', '', '', 'Subtotal:', '$23,500.00'],
        ['', '', '', 'Tax (0%):', '$0.00'],
        ['', '', '', '<b>Total:</b>', '<b>$23,500.00</b>'],
    ]
    totals_table = Table(totals_data, colWidths=[1*inch, 2.5*inch, 0.7*inch, 1*inch, 1*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (3, 2), (-1, 2), 'Helvetica-Bold'),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.5*inch))
    
    # Payment terms
    story.append(Paragraph("<b>Payment Terms:</b> Due immediately", styles['Normal']))
    story.append(Paragraph("Wire transfer preferred", styles['Normal']))
    
    # Build PDF - metadata will show recent creation date
    doc.build(story)
    
    # Note: The PDF metadata will automatically have today's creation date,
    # which conflicts with the invoice date from 6 months ago - this is the fraud indicator
    
    print(f"✓ Created {filename} (metadata tampering - recent creation date vs old invoice date)")

def create_fraudulent_duplicate_invoice():
    """
    Create an invoice with duplicate invoice number and all rounded amounts.
    This demonstrates pattern fraud.
    """
    filename = 'sample-files/fraudulent_duplicate_invoice.pdf'
    
    doc = SimpleDocTemplate(filename, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2C3E50'),
        spaceAfter=30,
    )
    story.append(Paragraph("INVOICE", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Company info
    company_style = styles['Normal']
    story.append(Paragraph("<b>Global Services International</b>", company_style))
    story.append(Paragraph("555 Commerce Drive", company_style))
    story.append(Paragraph("Houston, TX 77001", company_style))
    story.append(Paragraph("Tax ID: 76-5555555", company_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Invoice details - using a duplicate invoice number that might exist elsewhere
    invoice_date = datetime.now() - timedelta(days=10)
    # This invoice number is intentionally similar to the legitimate one (INV-2024-001234)
    story.append(Paragraph(f"<b>Invoice Number:</b> INV-2024-001234", styles['Normal']))
    story.append(Paragraph(f"<b>Date:</b> {invoice_date.strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Paragraph(f"<b>Due Date:</b> {(invoice_date + timedelta(days=15)).strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Bill to
    story.append(Paragraph("<b>Bill To:</b>", styles['Normal']))
    story.append(Paragraph("Enterprise Solutions Corp", styles['Normal']))
    story.append(Paragraph("321 Business Plaza", styles['Normal']))
    story.append(Paragraph("Seattle, WA 98101", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Items table - ALL AMOUNTS ARE ROUNDED (fraud indicator)
    data = [
        ['Item', 'Description', 'Qty', 'Unit Price', 'Total'],
        ['SRV-100', 'Professional Services', '10', '$500.00', '$5,000.00'],
        ['SRV-200', 'Maintenance Package', '5', '$400.00', '$2,000.00'],
        ['SRV-300', 'Support Services', '8', '$300.00', '$2,400.00'],
        ['SRV-400', 'Training Services', '4', '$600.00', '$2,400.00'],
    ]
    
    table = Table(data, colWidths=[1*inch, 2.5*inch, 0.7*inch, 1*inch, 1*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(table)
    story.append(Spacer(1, 0.3*inch))
    
    # Totals - all rounded
    totals_data = [
        ['', '', '', 'Subtotal:', '$11,800.00'],
        ['', '', '', 'Tax (0%):', '$0.00'],
        ['', '', '', '<b>Total:</b>', '<b>$11,800.00</b>'],
    ]
    totals_table = Table(totals_data, colWidths=[1*inch, 2.5*inch, 0.7*inch, 1*inch, 1*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (3, 2), (-1, 2), 'Helvetica-Bold'),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.5*inch))
    
    # Payment terms
    story.append(Paragraph("<b>Payment Terms:</b> Net 15 days", styles['Normal']))
    
    doc.build(story)
    print(f"✓ Created {filename} (pattern fraud - duplicate invoice number, all rounded amounts)")

def create_fraudulent_outlier_receipt():
    """
    Create a receipt with statistical outliers (unusually high amounts).
    This demonstrates anomaly fraud.
    """
    filename = 'sample-files/fraudulent_outlier_receipt.pdf'
    
    doc = SimpleDocTemplate(filename, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1A5490'),
        spaceAfter=20,
    )
    story.append(Paragraph("RECEIPT", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Store info - using a vendor from verified list but with suspicious amounts
    story.append(Paragraph("<b>Office Supplies Plus</b>", styles['Normal']))
    story.append(Paragraph("789 Commerce Boulevard", styles['Normal']))
    story.append(Paragraph("Chicago, IL 60601", styles['Normal']))
    story.append(Paragraph("Phone: (312) 555-0123", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Receipt details - weekend transaction (suspicious)
    receipt_date = datetime.now() - timedelta(days=2)
    # Make sure it's a Sunday
    while receipt_date.weekday() != 6:  # 6 = Sunday
        receipt_date -= timedelta(days=1)
    
    story.append(Paragraph(f"<b>Receipt #:</b> RCP-{receipt_date.strftime('%Y%m%d')}-9999", styles['Normal']))
    story.append(Paragraph(f"<b>Date:</b> {receipt_date.strftime('%B %d, %Y %I:%M %p')} (Sunday)", styles['Normal']))
    story.append(Paragraph("<b>Cashier:</b> Unknown", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Items - STATISTICAL OUTLIERS (way too expensive for office supplies)
    data = [
        ['Item', 'Qty', 'Price'],
        ['Copy Paper (Case)', '50', '$2,500.00'],  # Normal: ~$16/case
        ['Ballpoint Pens (Box)', '100', '$5,000.00'],  # Normal: ~$8/box
        ['Stapler', '25', '$1,250.00'],  # Normal: ~$13 each
        ['File Folders (Pack)', '75', '$3,750.00'],  # Normal: ~$8/pack
    ]
    
    table = Table(data, colWidths=[3.5*inch, 1*inch, 1.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(table)
    story.append(Spacer(1, 0.2*inch))
    
    # Totals - extremely high for office supplies
    story.append(Paragraph("<b>Subtotal: $12,500.00</b>", styles['Normal']))
    story.append(Paragraph("<b>Tax: $1,125.00</b>", styles['Normal']))
    story.append(Paragraph("<b>Total: $13,625.00</b>", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Payment method
    story.append(Paragraph("<b>Payment Method:</b> Cash", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Thank you for your business!", styles['Normal']))
    
    doc.build(story)
    print(f"✓ Created {filename} (anomaly fraud - statistical outliers, weekend transaction)")

if __name__ == '__main__':
    print("Generating fraudulent sample documents...")
    print("Each document demonstrates a different type of fraud:\n")
    create_fraudulent_tampered_invoice()
    create_fraudulent_duplicate_invoice()
    create_fraudulent_outlier_receipt()
    print("\nAll fraudulent sample documents created successfully!")
    print("\nFraud indicators:")
    print("1. fraudulent_tampered_invoice.pdf - Metadata shows recent creation but invoice claims old date")
    print("2. fraudulent_duplicate_invoice.pdf - Duplicate invoice number + all rounded amounts")
    print("3. fraudulent_outlier_receipt.pdf - Statistical outliers (prices 100x normal) + weekend transaction")
