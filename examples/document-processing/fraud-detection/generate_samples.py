#!/usr/bin/env python3
"""
Generate sample PDF documents for fraud detection testing.
This script creates both legitimate and fraudulent sample documents.
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

def create_legitimate_invoice():
    """Create a legitimate invoice with realistic metadata and content"""
    filename = 'sample-files/legitimate_invoice_1.pdf'
    
    # Create PDF
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
    story.append(Paragraph("<b>TechSupply Solutions Inc.</b>", company_style))
    story.append(Paragraph("123 Business Park Drive", company_style))
    story.append(Paragraph("San Francisco, CA 94105", company_style))
    story.append(Paragraph("Tax ID: 94-1234567", company_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Invoice details
    invoice_date = datetime.now() - timedelta(days=15)
    story.append(Paragraph(f"<b>Invoice Number:</b> INV-2024-001234", styles['Normal']))
    story.append(Paragraph(f"<b>Date:</b> {invoice_date.strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Paragraph(f"<b>Due Date:</b> {(invoice_date + timedelta(days=30)).strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Bill to
    story.append(Paragraph("<b>Bill To:</b>", styles['Normal']))
    story.append(Paragraph("Acme Corporation", styles['Normal']))
    story.append(Paragraph("456 Client Street", styles['Normal']))
    story.append(Paragraph("New York, NY 10001", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Items table
    data = [
        ['Item', 'Description', 'Qty', 'Unit Price', 'Total'],
        ['SW-001', 'Software License - Annual', '5', '$299.00', '$1,495.00'],
        ['SUP-002', 'Technical Support Package', '1', '$850.00', '$850.00'],
        ['TRN-003', 'Training Session (4 hours)', '2', '$175.00', '$350.00'],
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
        ['', '', '', 'Subtotal:', '$2,695.00'],
        ['', '', '', 'Tax (8.5%):', '$229.08'],
        ['', '', '', '<b>Total:</b>', '<b>$2,924.08</b>'],
    ]
    totals_table = Table(totals_data, colWidths=[1*inch, 2.5*inch, 0.7*inch, 1*inch, 1*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (3, 2), (-1, 2), 'Helvetica-Bold'),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.5*inch))
    
    # Payment terms
    story.append(Paragraph("<b>Payment Terms:</b> Net 30 days", styles['Normal']))
    story.append(Paragraph("Please make checks payable to TechSupply Solutions Inc.", styles['Normal']))
    
    # Build PDF
    doc.build(story)
    print(f"✓ Created {filename}")

def create_legitimate_receipt():
    """Create a legitimate receipt with realistic metadata and content"""
    filename = 'sample-files/legitimate_receipt_1.pdf'
    temp_filename = 'sample-files/temp_receipt.pdf'
    
    doc = SimpleDocTemplate(temp_filename, pagesize=letter)
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
    
    # Store info
    story.append(Paragraph("<b>Office Supplies Plus</b>", styles['Normal']))
    story.append(Paragraph("789 Commerce Boulevard", styles['Normal']))
    story.append(Paragraph("Chicago, IL 60601", styles['Normal']))
    story.append(Paragraph("Phone: (312) 555-0123", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Receipt details
    receipt_date = datetime.now() - timedelta(days=7)
    story.append(Paragraph(f"<b>Receipt #:</b> RCP-{receipt_date.strftime('%Y%m%d')}-4567", styles['Normal']))
    story.append(Paragraph(f"<b>Date:</b> {receipt_date.strftime('%B %d, %Y %I:%M %p')}", styles['Normal']))
    story.append(Paragraph("<b>Cashier:</b> Sarah Johnson", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Items
    data = [
        ['Item', 'Qty', 'Price'],
        ['Copy Paper (Case)', '3', '$47.97'],
        ['Ballpoint Pens (Box)', '2', '$15.98'],
        ['Stapler', '1', '$12.99'],
        ['File Folders (Pack)', '1', '$8.49'],
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
    
    # Totals
    story.append(Paragraph("<b>Subtotal: $85.43</b>", styles['Normal']))
    story.append(Paragraph("<b>Tax: $7.69</b>", styles['Normal']))
    story.append(Paragraph("<b>Total: $93.12</b>", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Payment method
    story.append(Paragraph("<b>Payment Method:</b> Credit Card (****1234)", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Thank you for your business!", styles['Normal']))
    
    doc.build(story)
    
    # Update PDF metadata to match transaction date
    reader = PdfReader(temp_filename)
    writer = PdfWriter()
    
    # Copy all pages
    for page in reader.pages:
        writer.add_page(page)
    
    # Set metadata with transaction date
    metadata_date = receipt_date.strftime("D:%Y%m%d%H%M%S")
    writer.add_metadata({
        '/CreationDate': metadata_date,
        '/ModDate': metadata_date,
        '/Creator': 'Office Supplies Plus POS System',
        '/Producer': 'Receipt Printer v2.1',
        '/Title': 'Receipt',
    })
    
    # Write final PDF with correct metadata
    with open(filename, 'wb') as output_file:
        writer.write(output_file)
    
    # Clean up temp file
    os.remove(temp_filename)
    
    print(f"✓ Created {filename}")

def create_legitimate_bank_statement():
    """Create a legitimate bank statement with realistic metadata and content"""
    filename = 'sample-files/legitimate_bank_statement_1.pdf'
    
    doc = SimpleDocTemplate(filename, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Bank header
    header_style = ParagraphStyle(
        'BankHeader',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#003366'),
        spaceAfter=20,
    )
    story.append(Paragraph("First National Bank", header_style))
    story.append(Paragraph("Monthly Statement", styles['Heading2']))
    story.append(Spacer(1, 0.3*inch))
    
    # Account info
    statement_date = datetime.now() - timedelta(days=5)
    story.append(Paragraph("<b>Account Holder:</b> John Smith", styles['Normal']))
    story.append(Paragraph("<b>Account Number:</b> ****5678", styles['Normal']))
    story.append(Paragraph(f"<b>Statement Period:</b> {(statement_date - timedelta(days=30)).strftime('%m/%d/%Y')} - {statement_date.strftime('%m/%d/%Y')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Summary
    story.append(Paragraph("<b>Account Summary</b>", styles['Heading3']))
    summary_data = [
        ['Beginning Balance', '$5,234.56'],
        ['Total Deposits', '$3,500.00'],
        ['Total Withdrawals', '$2,187.43'],
        ['Ending Balance', '$6,547.13'],
    ]
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('LINEABOVE', (0, 3), (-1, 3), 1, colors.black),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Transactions
    story.append(Paragraph("<b>Transaction History</b>", styles['Heading3']))
    trans_data = [
        ['Date', 'Description', 'Amount', 'Balance'],
        [(statement_date - timedelta(days=28)).strftime('%m/%d'), 'Payroll Deposit', '+$2,500.00', '$7,734.56'],
        [(statement_date - timedelta(days=25)).strftime('%m/%d'), 'Rent Payment', '-$1,200.00', '$6,534.56'],
        [(statement_date - timedelta(days=22)).strftime('%m/%d'), 'Grocery Store', '-$87.43', '$6,447.13'],
        [(statement_date - timedelta(days=18)).strftime('%m/%d'), 'Electric Company', '-$125.00', '$6,322.13'],
        [(statement_date - timedelta(days=14)).strftime('%m/%d'), 'Payroll Deposit', '+$1,000.00', '$7,322.13'],
        [(statement_date - timedelta(days=10)).strftime('%m/%d'), 'Gas Station', '-$45.00', '$7,277.13'],
        [(statement_date - timedelta(days=7)).strftime('%m/%d'), 'Restaurant', '-$65.00', '$7,212.13'],
        [(statement_date - timedelta(days=3)).strftime('%m/%d'), 'ATM Withdrawal', '-$200.00', '$7,012.13'],
    ]
    trans_table = Table(trans_data, colWidths=[1*inch, 2.5*inch, 1.5*inch, 1.5*inch])
    trans_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
    ]))
    story.append(trans_table)
    
    doc.build(story)
    print(f"✓ Created {filename}")

if __name__ == '__main__':
    print("Generating legitimate sample documents...")
    create_legitimate_invoice()
    create_legitimate_receipt()
    create_legitimate_bank_statement()
    print("\nAll legitimate sample documents created successfully!")
