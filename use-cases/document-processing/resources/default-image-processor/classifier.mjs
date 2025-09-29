import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { readFile } from 'fs/promises';

/**
 * Document classifier for Amazon Textract
 * Helps determine which Textract API to use based on document content
 */
class TextractDocumentClassifier {
  constructor() {
    this.documentTypes = {
      IDENTITY_DOCUMENT: 'IDENTITY_DOCUMENT',
      INVOICE: 'INVOICE',
      RECEIPT: 'RECEIPT',
      TAX_FORM: 'TAX_FORM',
      BANK_STATEMENT: 'BANK_STATEMENT',
      PAYSLIP: 'PAYSLIP',
      UTILITY_BILL: 'UTILITY_BILL',
      MORTGAGE_DOCUMENT: 'MORTGAGE_DOCUMENT',
      GENERIC_DOCUMENT: 'GENERIC_DOCUMENT',
    };

    // Keywords that strongly indicate document types
    this.documentKeywords = {
      [this.documentTypes.IDENTITY_DOCUMENT]: [
        'identity card', 'id card', 'passport', 'driver license', 'driver\'s license',
        'identification', 'national id', 'identity number', 'id no', 'nric'
      ],
      [this.documentTypes.INVOICE]: [
        'invoice', 'bill to', 'invoice number', 'invoice no', 'invoice date',
        'payment terms', 'due date', 'total due', 'subtotal', 'tax amount'
      ],
      [this.documentTypes.RECEIPT]: [
        'receipt', 'total', 'cash', 'change', 'payment', 'item', 'qty', 'quantity',
        'thank you for your purchase', 'merchant', 'transaction'
      ],
      [this.documentTypes.TAX_FORM]: [
        'tax', 'income tax', 'tax return', 'tax year', 'irs', 'w-2', 'w-4',
        '1040', '1099', 'tax form'
      ],
      [this.documentTypes.BANK_STATEMENT]: [
        'bank statement', 'account number', 'account summary', 'balance',
        'withdrawal', 'deposit', 'transaction history', 'beginning balance',
        'ending balance', 'available balance'
      ],
      [this.documentTypes.PAYSLIP]: [
        'pay slip', 'payslip', 'salary', 'wage', 'earnings', 'deductions',
        'net pay', 'gross pay', 'pay period', 'employee id', 'year to date'
      ],
      [this.documentTypes.UTILITY_BILL]: [
        'utility', 'electricity', 'water', 'gas', 'internet', 'phone bill',
        'service address', 'meter reading', 'usage', 'kilowatt', 'therms'
      ],
      [this.documentTypes.MORTGAGE_DOCUMENT]: [
        'mortgage', 'loan', 'property', 'interest rate', 'principal', 'amortization',
        'escrow', 'lender', 'borrower', 'closing date', 'loan number'
      ]
    };

    // Regular expressions for specific document types from various countries
    this.idPatterns = {
      // Singapore
      singaporeNRIC: /[STFG]\d{7}[A-Z]/i,
      
      // United States
      usSSN: /\d{3}-\d{2}-\d{4}/,
      usDL: /([A-Z]{1,2}[-\s]?)?\d{2,3}[-\s]?\d{2,3}[-\s]?\d{3,4}/i,
      
      // United Kingdom
      ukNI: /[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]/i, // National Insurance number
      ukDL: /[A-Z9]{5}\d{6}[A-Z9]{2}\d[A-Z]{2}/i, // Driver's License
      
      // European Union
      euPassport: /[A-Z]{1,2}\d{6,9}/i, // Generic EU passport format
      euID: /ID\s*\d{6,10}/i, // Generic EU ID card format
      
      // Germany
      germanID: /[0-9A-Z]{9}/i, // Personalausweis
      
      // France
      frenchID: /\d{12}/i, // National ID number
      
      // Spain
      spanishDNI: /\d{8}[A-Z]/i, // DNI (Documento Nacional de Identidad)
      spanishNIE: /[XYZ]\d{7}[A-Z]/i, // NIE (Número de Identidad de Extranjero)
      
      // Italy
      italianFC: /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i, // Fiscal Code
      
      // China
      chineseID: /\d{17}[\dX]/i, // Resident Identity Card
      
      // India
      indianAadhaar: /\d{4}\s?\d{4}\s?\d{4}/i, // Aadhaar number
      indianPAN: /[A-Z]{5}\d{4}[A-Z]/i, // PAN (Permanent Account Number)
      
      // Japan
      japaneseMyNumber: /\d{4}\s?\d{4}\s?\d{4}/i, // My Number
      
      // South Korea
      koreanRRN: /\d{6}[-\s]?\d{7}/i, // Resident Registration Number
      
      // Australia
      australianTFN: /\d{3}\s?\d{3}\s?\d{3}/i, // Tax File Number
      
      // Canada
      canadianSIN: /\d{3}[-\s]?\d{3}[-\s]?\d{3}/i, // Social Insurance Number
      
      // Brazil
      brazilianCPF: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/i, // CPF (Cadastro de Pessoas Físicas)
      
      // Generic patterns
      passport: /passport\s+no[.:]\s*[A-Z0-9]+/i,
      driverLicense: /driver'?s?\s+licen[sc]e\s+no[.:]\s*[A-Z0-9]+/i,
      nationalID: /national\s+id\s+no[.:]\s*[A-Z0-9]+/i,
      identityCard: /identity\s+card\s+no[.:]\s*[A-Z0-9]+/i
    };

    // Layout patterns that suggest document types
    this.layoutPatterns = {
      // ID cards often have a specific aspect ratio and layout
      idCardLayout: (stats) => {
        // ID cards typically have 1:1.5 to 1:2 aspect ratio
        if (stats.width && stats.height) {
          const ratio = stats.width / stats.height;
          return (ratio >= 1.5 && ratio <= 2.1);
        }
        return false;
      },
      // Invoices and receipts often have tables
      tableDocument: (stats) => {
        return stats.table_count > 0;
      }
    };
  }

  /**
   * Classify a document based on Textract DetectDocumentText results
   * @param {Object} detectTextResult - Result from Textract DetectDocumentText API
   * @returns {Object} Classification result with document type and confidence
   */
  classifyFromDetectText(detectTextResult) {
    // Extract all text from the document
    const allText = this._extractTextFromDetectTextResult(detectTextResult);
    
    // Get document dimensions if available
    const dimensions = this._extractDocumentDimensions(detectTextResult);
    
    // Count tables (if any)
    const tableCount = this._countTablesFromLines(detectTextResult);
    
    return this._classifyText(allText, { 
      width: dimensions.width, 
      height: dimensions.height,
      table_count: tableCount
    });
  }

  /**
   * Classify document based on extracted text and statistics
   * @param {string} text - All text extracted from the document
   * @param {Object} stats - Document statistics (tables, dimensions, etc.)
   * @returns {Object} Classification result
   */
  _classifyText(text, stats = {}) {
    const normalizedText = text.toLowerCase();
    const scores = {};
    
    // Initialize scores for all document types
    Object.values(this.documentTypes).forEach(type => {
      scores[type] = 0;
    });
    
    // Check for keyword matches
    Object.entries(this.documentKeywords).forEach(([docType, keywords]) => {
      keywords.forEach(keyword => {
        if (normalizedText.includes(keyword.toLowerCase())) {
          scores[docType] += 2;
        }
      });
    });
    
    // Check for ID patterns
    Object.entries(this.idPatterns).forEach(([patternName, pattern]) => {
      if (pattern.test(text)) {
        if (patternName.includes('passport') || patternName.includes('ID') || 
            patternName.includes('License') || patternName.includes('NRIC')) {
          scores[this.documentTypes.IDENTITY_DOCUMENT] += 10;
        } else {
          scores[this.documentTypes.IDENTITY_DOCUMENT] += 8;
        }
      }
    });
    
    // Check layout patterns
    if (this.layoutPatterns.idCardLayout(stats)) {
      scores[this.documentTypes.IDENTITY_DOCUMENT] += 5;
    }
    if (this.layoutPatterns.tableDocument(stats)) {
      scores[this.documentTypes.INVOICE] += 3;
      scores[this.documentTypes.RECEIPT] += 3;
      scores[this.documentTypes.BANK_STATEMENT] += 3;
    }
    
    // Check for specific phrases that strongly indicate document types
    if (/republic of singapore identity card/i.test(text)) {
      scores[this.documentTypes.IDENTITY_DOCUMENT] += 15;
    }
    if (/invoice\s+#|invoice\s+number|invoice\s+no/i.test(text)) {
      scores[this.documentTypes.INVOICE] += 10;
    }
    if (/receipt\s+#|receipt\s+number|receipt\s+no/i.test(text)) {
      scores[this.documentTypes.RECEIPT] += 10;
    }
    
    // Find the document type with the highest score
    let maxScore = 0;
    let classifiedType = this.documentTypes.GENERIC_DOCUMENT;
    
    Object.entries(scores).forEach(([type, score]) => {
      if (score > maxScore) {
        maxScore = score;
        classifiedType = type;
      }
    });
    
    // Calculate confidence (normalize to 0-100%)
    const confidence = Math.min(100, Math.max(0, maxScore * 5));
    
    return {
      documentType: classifiedType,
      confidence: confidence,
      scores: scores,
      recommendedApi: this._getRecommendedApi(classifiedType)
    };
  }

  /**
   * Get the recommended Textract API based on document type
   * @param {string} documentType - Classified document type
   * @returns {string} Recommended Textract API
   */
  _getRecommendedApi(documentType) {
    switch (documentType) {
      case this.documentTypes.IDENTITY_DOCUMENT:
        return 'AnalyzeID';
      case this.documentTypes.INVOICE:
      case this.documentTypes.RECEIPT:
        return 'AnalyzeExpense';
      case this.documentTypes.MORTGAGE_DOCUMENT:
      case this.documentTypes.BANK_STATEMENT:
      case this.documentTypes.TAX_FORM:
        return 'AnalyzeLending';
      default:
        return 'AnalyzeDocument';
    }
  }

  /**
   * Extract text from Textract DetectDocumentText result
   * @param {Object} result - Textract DetectDocumentText result
   * @returns {string} Extracted text
   */
  _extractTextFromDetectTextResult(result) {
    let text = '';
    if (result.Blocks) {
      result.Blocks.forEach(block => {
        if (block.BlockType === 'LINE' && block.Text) {
          text += ' ' + block.Text;
        }
      });
    }
    return text;
  }

  /**
   * Extract document dimensions from Textract result
   * @param {Object} result - Textract result
   * @returns {Object} Document dimensions
   */
  _extractDocumentDimensions(result) {
    const dimensions = { width: 0, height: 0 };
    
    if (result.DocumentMetadata && result.DocumentMetadata.Pages) {
      dimensions.width = result.DocumentMetadata.Pages[0]?.Width || 0;
      dimensions.height = result.DocumentMetadata.Pages[0]?.Height || 0;
    }
    
    return dimensions;
  }

  /**
   * Count tables based on line patterns in Textract DetectDocumentText result
   * @param {Object} result - Textract DetectDocumentText result
   * @returns {number} Estimated table count
   */
  _countTablesFromLines(result) {
    let horizontalLines = 0;
    let verticalLines = 0;
    
    if (result.Blocks) {
      result.Blocks.forEach(block => {
        if (block.BlockType === 'LINE') {
          if (block.Geometry && block.Geometry.BoundingBox) {
            const box = block.Geometry.BoundingBox;
            if (box.Width > box.Height * 5) {
              horizontalLines++;
            } else if (box.Height > box.Width * 5) {
              verticalLines++;
            }
          }
        }
      });
    }
    
    return Math.min(horizontalLines, verticalLines) > 3 ? 1 : 0;
  }
}

/**
 * Classify document using Amazon Bedrock GenAI
 * @param {string} text - Extracted text from document
 * @param {Object} genaiConfig - GenAI configuration
 * @returns {Promise<Object>} Classification result with confidence
 */
async function classifyWithGenAI(text, genaiConfig) {
  const bedrock = new BedrockRuntimeClient({ 
    region: genaiConfig.region || process.env.AWS_REGION || 'us-east-1' 
  });
  
  // Truncate text to stay within token limits
  const maxTokens = genaiConfig.maxTokens || 50000;
  const truncatedText = text.substring(0, maxTokens);
  
  const prompt = `You are a document classification expert. Analyze the following document text and classify it.

IMPORTANT: Respond with ONLY valid JSON. Do not include any explanatory text before or after the JSON.

Required JSON format:
{
  "documentType": "one of: IDENTITY_DOCUMENT, INVOICE, RECEIPT, TAX_FORM, BANK_STATEMENT, PAYSLIP, UTILITY_BILL, MORTGAGE_DOCUMENT, GENERIC_DOCUMENT",
  "confidence": number between 0-100,
  "reasoning": "brief explanation of classification decision",
  "recommendedApi": "one of: AnalyzeID, AnalyzeExpense, AnalyzeLending, AnalyzeDocument"
}

Document text to analyze:
${truncatedText}`;

  const modelId = genaiConfig.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  
  try {
    const command = new InvokeModelCommand({
      modelId: modelId,
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        temperature: 0.1,
        messages: [{
          role: "user",
          content: prompt
        }]
      })
    });
    
    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract the text response from Claude
    const rawText = responseBody.content[0].text;
    console.log('Raw GenAI response:', rawText);
    
    // Try to extract JSON from the response (Claude sometimes adds extra text)
    let result;
    try {
      // First try to parse the entire response as JSON
      result = JSON.parse(rawText);
    } catch (error) {
      // If that fails, try to extract JSON from within the text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`GenAI response is not valid JSON: ${rawText}`);
      }
    }
    
    if (!result.documentType || !result.confidence || !result.recommendedApi) {
      throw new Error(`GenAI returned incomplete classification result: ${JSON.stringify(result)}`);
    }
    
    const confidence = Math.max(0, Math.min(100, Number(result.confidence)));
    
    return {
      documentType: result.documentType,
      confidence: confidence,
      reasoning: result.reasoning || 'GenAI classification',
      recommendedApi: result.recommendedApi,
      method: 'genai',
      modelUsed: modelId
    };
    
  } catch (error) {
    console.error('GenAI classification error:', error);
    throw new Error(`GenAI classification failed: ${error.message}`);
  }
}

/**
 * Classify document using traditional rule-based approach
 * @param {Object} detectResult - Textract DetectDocumentText result
 * @returns {Object} Classification result
 */
function classifyWithRules(detectResult) {
  const classifier = new TextractDocumentClassifier();
  const result = classifier.classifyFromDetectText(detectResult);
  return {
    ...result,
    method: 'rule-based'
  };
}

/**
 * Helper function to extract text from DetectDocumentText result
 * @param {Object} result - Textract DetectDocumentText result
 * @returns {string} Extracted text
 */
function extractTextFromDetectText(result) {
  let text = '';
  if (result.Blocks) {
    result.Blocks.forEach(block => {
      if (block.BlockType === 'LINE' && block.Text) {
        text += ' ' + block.Text;
      }
    });
  }
  return text;
}

/**
 * Process a document using Textract and classification
 * @param {string} bucketName - S3 bucket name
 * @param {string} objectKey - S3 object key
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
async function processDocument(bucketName, objectKey, options = {}) {
  const textract = new TextractClient({ 
    region: options.region || process.env.AWS_REGION || 'us-east-1' 
  });
  
  try {
    const detectCommand = new DetectDocumentTextCommand({
      Document: {
        S3Object: {
          Bucket: bucketName,
          Name: objectKey
        }
      }
    });
    
    const detectResult = await textract.send(detectCommand);
    const extractedText = extractTextFromDetectText(detectResult);
    
    let classificationResult;
    
    if (options.genaiConfig && options.genaiConfig.enabled) {
      try {
        classificationResult = await classifyWithGenAI(extractedText, options.genaiConfig);
      } catch (genaiError) {
        console.warn('GenAI classification failed, falling back to rules:', genaiError.message);
        classificationResult = classifyWithRules(detectResult);
      }
    } else {
      classificationResult = classifyWithRules(detectResult);
    }
    
    return {
      success: true,
      bucketName,
      objectKey,
      extractedText: extractedText.substring(0, 1000),
      extractedEntities: extractedText, // Full extracted text as entities
      classification: classificationResult,
      classificationMethod: classificationResult.method,
      genaiUsed: classificationResult.method === 'genai',
      apiUsed: 'DetectDocumentText', // The Textract API that was used
      textractResult: {
        blockCount: detectResult.Blocks?.length || 0,
        documentMetadata: detectResult.DocumentMetadata
      }
    };
    
  } catch (error) {
    console.error('Document processing error:', error);
    throw new Error(`Document processing failed: ${error.message}`);
  }
}

/**
 * Process Bedrock output and extract structured data
 * @param {Object} bedrockOutput - Output from Bedrock document analysis
 * @returns {Object} Processed result with extracted data
 */
function processBedrockOutput(bedrockOutput) {
  try {
    const result = {
      success: true,
      documentType: 'UNKNOWN',
      extractedData: {},
      metadata: bedrockOutput.metadata || {},
      confidence: 0
    };

    if (bedrockOutput.elements && Array.isArray(bedrockOutput.elements)) {
      const extractedData = {};
      let totalConfidence = 0;
      let confidenceCount = 0;

      bedrockOutput.elements.forEach(element => {
        if (element.category && element.text) {
          const category = element.category.toLowerCase();
          if (!extractedData[category]) {
            extractedData[category] = [];
          }
          
          extractedData[category].push({
            text: element.text,
            confidence: element.confidence || 0,
            boundingBox: element.boundingBox || null
          });

          if (element.confidence) {
            totalConfidence += element.confidence;
            confidenceCount++;
          }
        }
      });

      result.extractedData = extractedData;
      result.confidence = confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0;

      const categories = Object.keys(extractedData);
      if (categories.includes('invoice_number') || categories.includes('total_amount')) {
        result.documentType = 'INVOICE';
      } else if (categories.includes('receipt_total') || categories.includes('merchant_name')) {
        result.documentType = 'RECEIPT';
      } else if (categories.includes('account_number') || categories.includes('statement_date')) {
        result.documentType = 'BANK_STATEMENT';
      } else if (categories.includes('tax_year') || categories.includes('tax_form')) {
        result.documentType = 'TAX_FORM';
      } else if (categories.includes('pay_period') || categories.includes('gross_pay')) {
        result.documentType = 'PAYSLIP';
      } else if (categories.includes('utility_type') || categories.includes('service_address')) {
        result.documentType = 'UTILITY_BILL';
      } else if (categories.includes('loan_amount') || categories.includes('property_address')) {
        result.documentType = 'MORTGAGE_DOCUMENT';
      } else if (categories.includes('document_number') || categories.includes('issue_date')) {
        result.documentType = 'IDENTITY_DOCUMENT';
      } else {
        result.documentType = 'GENERIC_DOCUMENT';
      }
    }

    return result;

  } catch (error) {
    console.error('Error processing Bedrock output:', error);
    return {
      success: false,
      error: error.message,
      documentType: 'UNKNOWN',
      extractedData: {},
      confidence: 0
    };
  }
}

/**
 * AWS Lambda handler function
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Lambda response
 */
export const handler = async (event) => {
  try {
    if (event.body && typeof event.body === 'string') {
      const body = JSON.parse(event.body);
      if (body.metadata && body.elements) {
        return {
          statusCode: 200,
          body: JSON.stringify(processBedrockOutput(body))
        };
      }
    }
    
    const bucket = event.bucket || (event.Records && event.Records[0]?.s3?.bucket?.name);
    const key = event.key || (event.Records && event.Records[0]?.s3?.object?.key);
    const region = event.region || process.env.AWS_REGION || 'us-east-1';
    const processWithRecommendedApi = event.processWithRecommendedApi !== false;
    
    if (!bucket || !key) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Missing bucket or key parameter'
        })
      };
    }
    
    try {
      const result = await processDocument(bucket, key, { 
        region, 
        processWithRecommendedApi,
        genaiConfig: event.genaiConfig
      });
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          ...result
        })
      };
    } catch (processingError) {
      console.error('Document processing error:', processingError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: processingError.message,
          message: 'Document processing failed'
        })
      };
    }
  } catch (error) {
    console.error('Lambda execution error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Lambda execution failed'
      })
    };
  }
};

// Export classes and functions for use in other modules
export { TextractDocumentClassifier, processDocument, processBedrockOutput };

// For local testing when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log('Testing with Bedrock output...');
    const bedrockOutput = JSON.parse(
      await readFile(new URL('./StandardOutputDocument.json', import.meta.url), 'utf8')
    );
    
    const result = processBedrockOutput(bedrockOutput);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error during local testing:', error);
  }
}
