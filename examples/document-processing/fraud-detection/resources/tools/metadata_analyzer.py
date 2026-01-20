import os
from datetime import datetime
from typing import Dict, List, Any
from strands import tool

try:
    from PIL import Image
    from PIL.ExifTags import TAGS
except ImportError:
    Image = None
    TAGS = None

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None


@tool
def analyze_metadata(file_path: str) -> Dict[str, Any]:
    """Analyze document metadata for fraud indicators
    
    Extracts and analyzes metadata from financial documents including EXIF data
    from images, PDF metadata (timestamps, software signatures), and detects
    suspicious indicators such as timestamp mismatches, missing metadata, or
    unusual software signatures.
    
    Args:
        file_path (str): Local path to the document file
        
    Returns:
        dict: A structured dictionary containing:
            - exif_data: EXIF data extracted from images (if applicable)
            - timestamps: Creation and modification timestamps
            - software_signature: Software used to create the document
            - suspicious_indicators: List of detected suspicious indicators
    """
    result = {
        "exif_data": {},
        "timestamps": {
            "creation": None,
            "modification": None
        },
        "software_signature": None,
        "suspicious_indicators": []
    }
    
    if not os.path.exists(file_path):
        result["suspicious_indicators"].append({
            "type": "file_not_found",
            "description": f"File not found at path: {file_path}",
            "severity": "critical"
        })
        return result
    
    file_ext = os.path.splitext(file_path)[1].lower()
    
    # Handle image files
    if file_ext in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp']:
        result = _analyze_image_metadata(file_path, result)
    
    # Handle PDF files
    elif file_ext == '.pdf':
        result = _analyze_pdf_metadata(file_path, result)
    
    else:
        result["suspicious_indicators"].append({
            "type": "unsupported_format",
            "description": f"Unsupported file format: {file_ext}",
            "severity": "low"
        })
    
    # Detect suspicious indicators based on metadata
    result = _detect_suspicious_indicators(result)
    
    return result


def _analyze_image_metadata(file_path: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Extract EXIF data from image files"""
    if Image is None:
        result["suspicious_indicators"].append({
            "type": "missing_library",
            "description": "PIL/Pillow library not available for image analysis",
            "severity": "medium"
        })
        return result
    
    try:
        image = Image.open(file_path)
        exif_data = image._getexif()
        
        if exif_data:
            for tag_id, value in exif_data.items():
                tag_name = TAGS.get(tag_id, tag_id)
                # Convert bytes to string for JSON serialization
                if isinstance(value, bytes):
                    try:
                        value = value.decode('utf-8', errors='ignore')
                    except:
                        value = str(value)
                result["exif_data"][tag_name] = value
            
            # Extract timestamps from EXIF
            if 'DateTime' in result["exif_data"]:
                result["timestamps"]["creation"] = result["exif_data"]["DateTime"]
            if 'DateTimeOriginal' in result["exif_data"]:
                result["timestamps"]["modification"] = result["exif_data"]["DateTimeOriginal"]
            
            # Extract software signature
            if 'Software' in result["exif_data"]:
                result["software_signature"] = result["exif_data"]["Software"]
        else:
            result["suspicious_indicators"].append({
                "type": "missing_metadata",
                "description": "No EXIF data found in image file",
                "severity": "medium"
            })
    
    except Exception as e:
        result["suspicious_indicators"].append({
            "type": "metadata_extraction_error",
            "description": f"Error extracting image metadata: {str(e)}",
            "severity": "medium"
        })
    
    return result


def _analyze_pdf_metadata(file_path: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Extract metadata from PDF files"""
    if PyPDF2 is None:
        result["suspicious_indicators"].append({
            "type": "missing_library",
            "description": "PyPDF2 library not available for PDF analysis",
            "severity": "medium"
        })
        return result
    
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            metadata = pdf_reader.metadata
            
            if metadata:
                # Extract creation and modification timestamps
                if metadata.get('/CreationDate'):
                    result["timestamps"]["creation"] = str(metadata.get('/CreationDate'))
                if metadata.get('/ModDate'):
                    result["timestamps"]["modification"] = str(metadata.get('/ModDate'))
                
                # Extract software signature
                if metadata.get('/Producer'):
                    result["software_signature"] = str(metadata.get('/Producer'))
                elif metadata.get('/Creator'):
                    result["software_signature"] = str(metadata.get('/Creator'))
                
                # Store all metadata for reference
                for key, value in metadata.items():
                    result["exif_data"][key] = str(value)
            else:
                result["suspicious_indicators"].append({
                    "type": "missing_metadata",
                    "description": "No metadata found in PDF file",
                    "severity": "medium"
                })
    
    except Exception as e:
        result["suspicious_indicators"].append({
            "type": "metadata_extraction_error",
            "description": f"Error extracting PDF metadata: {str(e)}",
            "severity": "medium"
        })
    
    return result


def _detect_suspicious_indicators(result: Dict[str, Any]) -> Dict[str, Any]:
    """Detect suspicious indicators based on extracted metadata"""
    
    # Check for timestamp mismatches
    creation = result["timestamps"].get("creation")
    modification = result["timestamps"].get("modification")
    
    if creation and modification:
        try:
            # Parse timestamps (handling various formats)
            creation_time = _parse_timestamp(creation)
            modification_time = _parse_timestamp(modification)
            
            if creation_time and modification_time:
                # Check if modification is before creation
                if modification_time < creation_time:
                    result["suspicious_indicators"].append({
                        "type": "timestamp_mismatch",
                        "description": "Modification timestamp is before creation timestamp",
                        "severity": "high"
                    })
                
                # Check if modification is significantly after creation (potential tampering)
                time_diff = abs((modification_time - creation_time).days)
                if time_diff > 365:
                    result["suspicious_indicators"].append({
                        "type": "timestamp_anomaly",
                        "description": f"Large time gap between creation and modification: {time_diff} days",
                        "severity": "medium"
                    })
        except:
            pass
    
    # Check for missing metadata (suspicious for financial documents)
    if not result["timestamps"]["creation"] and not result["timestamps"]["modification"]:
        if not any(ind["type"] == "missing_metadata" for ind in result["suspicious_indicators"]):
            result["suspicious_indicators"].append({
                "type": "missing_timestamps",
                "description": "No timestamp information found in document",
                "severity": "medium"
            })
    
    # Check for unusual software signatures
    if result["software_signature"]:
        suspicious_software = [
            "photoshop", "gimp", "paint", "editor", "modified"
        ]
        software_lower = result["software_signature"].lower()
        for suspicious in suspicious_software:
            if suspicious in software_lower:
                result["suspicious_indicators"].append({
                    "type": "unusual_software",
                    "description": f"Document created/modified with image editing software: {result['software_signature']}",
                    "severity": "high"
                })
                break
    
    return result


def _parse_timestamp(timestamp_str: str) -> datetime:
    """Parse timestamp from various formats"""
    if not timestamp_str:
        return None
    
    # Common timestamp formats
    formats = [
        "%Y:%m:%d %H:%M:%S",  # EXIF format
        "%Y-%m-%d %H:%M:%S",
        "%Y%m%d%H%M%S",
        "D:%Y%m%d%H%M%S",  # PDF format
    ]
    
    # Clean up PDF timestamp format
    if timestamp_str.startswith("D:"):
        timestamp_str = timestamp_str[2:16]  # Extract just the datetime part
    
    for fmt in formats:
        try:
            return datetime.strptime(timestamp_str[:len(fmt.replace("%", ""))], fmt)
        except:
            continue
    
    return None
