/**
 * Extractors for different document types from Textract API results
 */

/**
 * Extract key information from identity documents (AnalyzeID results)
 * @param {Object} analyzeIdResult - Result from Textract AnalyzeID API
 * @returns {Object} Extracted identity information
 */
export function extractIdentityDocumentInfo(analyzeIdResult) {
  const extractedInfo = {
    documentType: 'IDENTITY_DOCUMENT',
    identityDocumentFields: {},
    identityDocumentType: null
  };
  
  if (!analyzeIdResult || !analyzeIdResult.IdentityDocuments || analyzeIdResult.IdentityDocuments.length === 0) {
    return extractedInfo;
  }
  
  const idDoc = analyzeIdResult.IdentityDocuments[0];
  extractedInfo.identityDocumentType = idDoc.DocumentType || null;
  
  // Process identity document fields
  if (idDoc.IdentityDocumentFields) {
    idDoc.IdentityDocumentFields.forEach(field => {
      if (field.Type && field.Type.Text && field.ValueDetection && field.ValueDetection.Text) {
        const fieldName = field.Type.Text;
        const fieldValue = field.ValueDetection.Text;
        const fieldConfidence = field.ValueDetection.Confidence;
        
        extractedInfo.identityDocumentFields[fieldName] = {
          value: fieldValue,
          confidence: fieldConfidence
        };
      }
    });
  }
  
  // Extract common fields for easier access
  const commonFields = {
    'FIRST_NAME': 'firstName',
    'LAST_NAME': 'lastName',
    'MIDDLE_NAME': 'middleName',
    'FULL_NAME': 'fullName',
    'DATE_OF_BIRTH': 'dateOfBirth',
    'DATE_OF_ISSUE': 'dateOfIssue',
    'DATE_OF_EXPIRY': 'dateOfExpiry',
    'DOCUMENT_NUMBER': 'documentNumber',
    'DOCUMENT_ID': 'documentId',
    'ADDRESS': 'address',
    'ISSUED_BY': 'issuedBy',
    'GENDER': 'gender',
    'NATIONALITY': 'nationality',
    'COUNTRY': 'country',
    'PLACE_OF_BIRTH': 'placeOfBirth'
  };
  
  Object.entries(commonFields).forEach(([apiField, normalizedField]) => {
    if (extractedInfo.identityDocumentFields[apiField]) {
      extractedInfo[normalizedField] = extractedInfo.identityDocumentFields[apiField].value;
    }
  });
  
  return extractedInfo;
}

/**
 * Extract key information from expense documents (AnalyzeExpense results)
 * @param {Object} analyzeExpenseResult - Result from Textract AnalyzeExpense API
 * @returns {Object} Extracted expense information
 */
export function extractExpenseInfo(analyzeExpenseResult) {
  const extractedInfo = {
    documentType: 'EXPENSE_DOCUMENT',
    expenseDocumentType: null, // INVOICE or RECEIPT
    summaryFields: {},
    lineItems: [],
    vendor: null,
    total: null,
    subtotal: null,
    tax: null,
    paymentInfo: {},
    dates: {}
  };
  
  if (!analyzeExpenseResult || !analyzeExpenseResult.ExpenseDocuments || analyzeExpenseResult.ExpenseDocuments.length === 0) {
    return extractedInfo;
  }
  
  const expenseDoc = analyzeExpenseResult.ExpenseDocuments[0];
  
  // Determine if it's an invoice or receipt
  if (expenseDoc.Type) {
    extractedInfo.expenseDocumentType = expenseDoc.Type.Text;
  }
  
  // Process summary fields
  if (expenseDoc.SummaryFields) {
    expenseDoc.SummaryFields.forEach(field => {
      if (field.Type && field.Type.Text && field.ValueDetection) {
        const fieldName = field.Type.Text;
        const fieldValue = field.ValueDetection.Text;
        const fieldConfidence = field.ValueDetection.Confidence;
        
        extractedInfo.summaryFields[fieldName] = {
          value: fieldValue,
          confidence: fieldConfidence
        };
        
        // Extract common fields for easier access
        switch (fieldName) {
          case 'TOTAL':
            extractedInfo.total = fieldValue;
            break;
          case 'SUBTOTAL':
            extractedInfo.subtotal = fieldValue;
            break;
          case 'TAX':
          case 'TOTAL_TAX':
            extractedInfo.tax = fieldValue;
            break;
          case 'VENDOR_NAME':
            extractedInfo.vendor = fieldValue;
            break;
          case 'INVOICE_RECEIPT_DATE':
          case 'RECEIPT_DATE':
          case 'INVOICE_DATE':
            extractedInfo.dates.documentDate = fieldValue;
            break;
          case 'PAYMENT_DATE':
          case 'DUE_DATE':
            extractedInfo.dates.dueDate = fieldValue;
            break;
          case 'PAYMENT_TERMS':
            extractedInfo.paymentInfo.terms = fieldValue;
            break;
          case 'PAYMENT_METHOD':
            extractedInfo.paymentInfo.method = fieldValue;
            break;
        }
      }
    });
  }
  
  // Process line items
  if (expenseDoc.LineItemGroups) {
    expenseDoc.LineItemGroups.forEach(group => {
      if (group.LineItems) {
        group.LineItems.forEach(item => {
          const lineItem = {};
          
          if (item.LineItemExpenseFields) {
            item.LineItemExpenseFields.forEach(field => {
              if (field.Type && field.Type.Text && field.ValueDetection) {
                const fieldName = field.Type.Text.toLowerCase().replace(/\s+/g, '_');
                lineItem[fieldName] = field.ValueDetection.Text;
              }
            });
          }
          
          if (Object.keys(lineItem).length > 0) {
            extractedInfo.lineItems.push(lineItem);
          }
        });
      }
    });
  }
  
  return extractedInfo;
}

/**
 * Extract key information from lending documents (AnalyzeLending results)
 * @param {Object} analyzeLendingResult - Result from Textract AnalyzeLending API
 * @returns {Object} Extracted lending information
 */
export function extractLendingInfo(analyzeLendingResult) {
  const extractedInfo = {
    documentType: 'LENDING_DOCUMENT',
    lendingType: null,
    extractedFields: {},
    signatures: [],
    paymentInfo: {},
    loanInfo: {},
    propertyInfo: {},
    borrowerInfo: {},
    lenderInfo: {}
  };
  
  if (!analyzeLendingResult || !analyzeLendingResult.LendingDocuments || analyzeLendingResult.LendingDocuments.length === 0) {
    return extractedInfo;
  }
  
  const lendingDoc = analyzeLendingResult.LendingDocuments[0];
  
  // Get lending type
  if (lendingDoc.Type) {
    extractedInfo.lendingType = lendingDoc.Type.Text;
  }
  
  // Process extracted fields
  if (lendingDoc.ExtractedFields) {
    lendingDoc.ExtractedFields.forEach(field => {
      if (field.Type && field.Type.Text && field.ValueDetection) {
        const fieldName = field.Type.Text;
        const fieldValue = field.ValueDetection.Text;
        const fieldConfidence = field.ValueDetection.Confidence;
        
        extractedInfo.extractedFields[fieldName] = {
          value: fieldValue,
          confidence: fieldConfidence
        };
        
        // Categorize fields into appropriate sections
        if (fieldName.includes('LOAN')) {
          extractedInfo.loanInfo[fieldName] = fieldValue;
        } else if (fieldName.includes('PROPERTY')) {
          extractedInfo.propertyInfo[fieldName] = fieldValue;
        } else if (fieldName.includes('BORROWER')) {
          extractedInfo.borrowerInfo[fieldName] = fieldValue;
        } else if (fieldName.includes('LENDER')) {
          extractedInfo.lenderInfo[fieldName] = fieldValue;
        } else if (fieldName.includes('PAYMENT')) {
          extractedInfo.paymentInfo[fieldName] = fieldValue;
        }
      }
    });
  }
  
  // Process signatures
  if (lendingDoc.Signatures) {
    lendingDoc.Signatures.forEach(signature => {
      if (signature.ValueDetection) {
        extractedInfo.signatures.push({
          value: signature.ValueDetection.Text,
          confidence: signature.ValueDetection.Confidence,
          page: signature.Page
        });
      }
    });
  }
  
  return extractedInfo;
}

/**
 * Extract key information from generic documents (AnalyzeDocument results)
 * @param {Object} analyzeDocumentResult - Result from Textract AnalyzeDocument API
 * @returns {Object} Extracted document information
 */
export function extractDocumentInfo(analyzeDocumentResult) {
  const extractedInfo = {
    documentType: 'GENERIC_DOCUMENT',
    formFields: {},
    tables: [],
    text: '',
    pages: 0
  };
  
  if (!analyzeDocumentResult || !analyzeDocumentResult.Blocks) {
    return extractedInfo;
  }
  
  const blocks = analyzeDocumentResult.Blocks;
  
  // Get page count
  const pageBlocks = blocks.filter(block => block.BlockType === 'PAGE');
  extractedInfo.pages = pageBlocks.length;
  
  // Extract form fields (key-value pairs)
  const keyMap = {};
  const valueMap = {};
  
  blocks.forEach(block => {
    if (block.BlockType === 'KEY_VALUE_SET') {
      if (block.EntityTypes && block.EntityTypes.includes('KEY')) {
        keyMap[block.Id] = { id: block.Id };
      } else if (block.EntityTypes && block.EntityTypes.includes('VALUE')) {
        valueMap[block.Id] = { id: block.Id, value: '' };
      }
    }
  });
  
  // Get relationships between keys and values
  blocks.forEach(block => {
    if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes && block.EntityTypes.includes('KEY')) {
      if (block.Relationships) {
        block.Relationships.forEach(relationship => {
          if (relationship.Type === 'VALUE') {
            relationship.Ids.forEach(valueId => {
              keyMap[block.Id].valueId = valueId;
            });
          }
        });
      }
    }
  });
  
  // Get key texts
  blocks.forEach(block => {
    if (block.BlockType === 'WORD') {
      Object.values(keyMap).forEach(key => {
        if (key.childIds && key.childIds.includes(block.Id)) {
          key.text = (key.text || '') + ' ' + block.Text;
        }
      });
      
      Object.values(valueMap).forEach(value => {
        if (value.childIds && value.childIds.includes(block.Id)) {
          value.value = (value.value || '') + ' ' + block.Text;
        }
      });
    }
  });
  
  // Get child IDs for keys and values
  blocks.forEach(block => {
    if (block.BlockType === 'KEY_VALUE_SET') {
      if (block.Relationships) {
        block.Relationships.forEach(relationship => {
          if (relationship.Type === 'CHILD') {
            if (block.EntityTypes && block.EntityTypes.includes('KEY')) {
              keyMap[block.Id].childIds = relationship.Ids;
            } else if (block.EntityTypes && block.EntityTypes.includes('VALUE')) {
              valueMap[block.Id].childIds = relationship.Ids;
            }
          }
        });
      }
    }
  });
  
  // Extract text from keys and values
  blocks.forEach(block => {
    if (block.BlockType === 'WORD') {
      Object.values(keyMap).forEach(key => {
        if (key.childIds && key.childIds.includes(block.Id)) {
          key.text = (key.text || '') + ' ' + block.Text;
        }
      });
      
      Object.values(valueMap).forEach(value => {
        if (value.childIds && value.childIds.includes(block.Id)) {
          value.value = (value.value || '') + ' ' + block.Text;
        }
      });
    }
  });
  
  // Map keys to values
  Object.values(keyMap).forEach(key => {
    if (key.text && key.valueId && valueMap[key.valueId]) {
      const keyText = key.text.trim();
      const valueText = valueMap[key.valueId].value ? valueMap[key.valueId].value.trim() : '';
      
      if (keyText && valueText) {
        extractedInfo.formFields[keyText] = valueText;
      }
    }
  });
  
  // Extract tables
  const tableBlocks = blocks.filter(block => block.BlockType === 'TABLE');
  
  tableBlocks.forEach(tableBlock => {
    const table = {
      rows: [],
      rowCount: tableBlock.RowCount || 0,
      columnCount: tableBlock.ColumnCount || 0,
      page: tableBlock.Page || 1
    };
    
    if (tableBlock.Relationships) {
      const cellIds = tableBlock.Relationships
        .filter(rel => rel.Type === 'CHILD')
        .flatMap(rel => rel.Ids);
      
      const cellBlocks = blocks.filter(block => 
        cellIds.includes(block.Id) && block.BlockType === 'CELL');
      
      // Group cells by row
      const rowMap = {};
      cellBlocks.forEach(cell => {
        const rowIndex = cell.RowIndex - 1; // Convert to 0-based index
        if (!rowMap[rowIndex]) {
          rowMap[rowIndex] = [];
        }
        rowMap[rowIndex].push(cell);
      });
      
      // Sort rows and cells
      const sortedRows = Object.entries(rowMap)
        .sort(([rowA], [rowB]) => parseInt(rowA) - parseInt(rowB))
        .map(([_, cells]) => 
          cells.sort((a, b) => a.ColumnIndex - b.ColumnIndex));
      
      // Extract cell text
      sortedRows.forEach(rowCells => {
        const row = [];
        rowCells.forEach(cell => {
          let cellText = '';
          
          if (cell.Relationships) {
            const wordIds = cell.Relationships
              .filter(rel => rel.Type === 'CHILD')
              .flatMap(rel => rel.Ids);
            
            const wordBlocks = blocks.filter(block => 
              wordIds.includes(block.Id) && block.BlockType === 'WORD');
            
            cellText = wordBlocks
              .map(word => word.Text)
              .join(' ');
          }
          
          row.push(cellText.trim());
        });
        
        table.rows.push(row);
      });
    }
    
    extractedInfo.tables.push(table);
  });
  
  // Extract full text
  const lineBlocks = blocks
    .filter(block => block.BlockType === 'LINE')
    .sort((a, b) => {
      if (a.Page !== b.Page) return a.Page - b.Page;
      return a.Geometry.BoundingBox.Top - b.Geometry.BoundingBox.Top;
    });
  
  extractedInfo.text = lineBlocks.map(block => block.Text).join('\n');
  
  return extractedInfo;
}

/**
 * Process Textract analysis result based on the API used
 * @param {Object} analysisResult - Result from Textract API
 * @param {string} apiUsed - The Textract API that was used
 * @returns {Object} Extracted information
 */
export function processAnalysisResult(analysisResult, apiUsed) {
  if (!analysisResult) {
    return { error: 'No analysis result provided' };
  }
  
  switch (apiUsed) {
    case 'AnalyzeID':
      return extractIdentityDocumentInfo(analysisResult);
    
    case 'AnalyzeExpense':
      return extractExpenseInfo(analysisResult);
    
    case 'AnalyzeLending':
      return extractLendingInfo(analysisResult);
    
    case 'AnalyzeDocument':
    default:
      return extractDocumentInfo(analysisResult);
  }
}