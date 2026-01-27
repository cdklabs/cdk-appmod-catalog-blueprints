"""
Unit tests for the default-bedrock-invoke Lambda handler.

Tests chunk-aware classification and processing functionality including:
- Parsing chunk metadata from events
- Building chunk context prompts
- Backward compatibility with non-chunked documents
- Processing with chunk metadata
- Processing without chunk metadata (backward compatibility)
"""

import pytest
from unittest.mock import patch, MagicMock
import json
import os

# Set required environment variables before importing the module
os.environ['INVOKE_TYPE'] = 'classification'
os.environ['PROMPT'] = 'Test prompt'
os.environ['MODEL_ID'] = 'test-model'

# Import after setting environment variables
from index import parse_chunk_metadata, build_chunk_context_prompt, handler


class TestParseChunkMetadata:
    """Tests for parse_chunk_metadata function."""
    
    def test_returns_none_when_no_chunk_metadata(self):
        """Test that None is returned when no chunk metadata is present."""
        event = {
            'documentId': 'doc-123',
            'contentType': 'file',
            'content': {'bucket': 'test', 'key': 'test.pdf'}
        }
        result = parse_chunk_metadata(event)
        assert result is None
    
    def test_parses_direct_chunk_metadata(self):
        """Test parsing direct chunkMetadata field."""
        event = {
            'documentId': 'doc-123',
            'chunkMetadata': {
                'chunkIndex': 2,
                'totalChunks': 5,
                'startPage': 100,
                'endPage': 149,
                'pageCount': 50,
                'estimatedTokens': 75000,
                'overlapPages': 5
            }
        }
        result = parse_chunk_metadata(event)
        
        assert result is not None
        assert result['chunkIndex'] == 2
        assert result['totalChunks'] == 5
        assert result['startPage'] == 100
        assert result['endPage'] == 149
        assert result['pageCount'] == 50
        assert result['estimatedTokens'] == 75000
        assert result['overlapPages'] == 5
    
    def test_parses_chunk_object_from_map_state(self):
        """Test parsing chunk object from Step Functions Map State iteration."""
        event = {
            'documentId': 'doc-123',
            'chunk': {
                'chunkId': 'doc-123_chunk_1',
                'chunkIndex': 1,
                'startPage': 50,
                'endPage': 99,
                'pageCount': 50,
                'estimatedTokens': 80000,
                'bucket': 'test-bucket',
                'key': 'chunks/doc-123_chunk_1.pdf'
            },
            'chunkIndex': 1,
            'totalChunks': 3
        }
        result = parse_chunk_metadata(event)
        
        assert result is not None
        assert result['chunkIndex'] == 1
        assert result['totalChunks'] == 3
        assert result['startPage'] == 50
        assert result['endPage'] == 99
    
    def test_handles_missing_optional_fields(self):
        """Test that missing optional fields default to 0."""
        event = {
            'documentId': 'doc-123',
            'chunk': {
                'chunkId': 'doc-123_chunk_0',
                'startPage': 0,
                'endPage': 49
            },
            'totalChunks': 2
        }
        result = parse_chunk_metadata(event)
        
        assert result is not None
        assert result['chunkIndex'] == 0
        assert result['overlapPages'] == 0
        assert result['estimatedTokens'] == 0


class TestBuildChunkContextPrompt:
    """Tests for build_chunk_context_prompt function."""
    
    def test_returns_empty_string_when_no_metadata(self):
        """Test that empty string is returned when no metadata is provided."""
        result = build_chunk_context_prompt(None)
        assert result == ""
    
    def test_builds_basic_chunk_context(self):
        """Test building basic chunk context without overlap."""
        chunk_metadata = {
            'chunkIndex': 0,
            'totalChunks': 3,
            'startPage': 0,
            'endPage': 49,
            'overlapPages': 0
        }
        result = build_chunk_context_prompt(chunk_metadata)
        
        assert "You are analyzing chunk 1 of 3" in result
        assert "from pages 1 to 50" in result
        assert "overlapping" not in result
    
    def test_builds_chunk_context_with_overlap(self):
        """Test building chunk context with overlap information."""
        chunk_metadata = {
            'chunkIndex': 1,
            'totalChunks': 3,
            'startPage': 45,
            'endPage': 99,
            'overlapPages': 5
        }
        result = build_chunk_context_prompt(chunk_metadata)
        
        assert "You are analyzing chunk 2 of 3" in result
        assert "from pages 46 to 100" in result
        assert "5 overlapping pages" in result
    
    def test_no_overlap_message_for_first_chunk(self):
        """Test that first chunk doesn't mention overlap even if overlapPages > 0."""
        chunk_metadata = {
            'chunkIndex': 0,  # First chunk
            'totalChunks': 3,
            'startPage': 0,
            'endPage': 49,
            'overlapPages': 5  # Has overlap config but is first chunk
        }
        result = build_chunk_context_prompt(chunk_metadata)
        
        assert "You are analyzing chunk 1 of 3" in result
        assert "overlapping" not in result  # First chunk shouldn't mention overlap
    
    def test_format_matches_design_spec(self):
        """Test that format matches the design specification."""
        chunk_metadata = {
            'chunkIndex': 2,
            'totalChunks': 5,
            'startPage': 100,
            'endPage': 149,
            'overlapPages': 0
        }
        result = build_chunk_context_prompt(chunk_metadata)
        
        # Format should be: "You are analyzing chunk {N} of {total} from pages {start} to {end}"
        expected_format = "You are analyzing chunk 3 of 5 from pages 101 to 150"
        assert expected_format in result


class TestHandlerChunkAwareness:
    """Tests for handler function chunk awareness."""
    
    @patch('index.bedrock')
    @patch('index.s3')
    @patch('index.tracer')
    @patch('index.metrics')
    def test_handler_without_chunk_metadata(self, mock_metrics, mock_tracer, mock_s3, mock_bedrock):
        """Test handler processes non-chunked documents correctly (backward compatibility)."""
        # Setup mocks
        mock_bedrock.invoke_model.return_value = {
            'body': MagicMock(read=lambda: json.dumps({
                'content': [{'text': '{"documentClassification": "INVOICE"}'}]
            }).encode())
        }
        mock_s3.download_file = MagicMock()
        mock_tracer.put_annotation = MagicMock()
        mock_tracer.capture_lambda_handler = lambda f: f
        mock_metrics.log_metrics = lambda f: f
        mock_metrics.add_dimension = MagicMock()
        mock_metrics.add_metric = MagicMock()
        
        event = {
            'documentId': 'doc-123',
            'contentType': 'data',
            'content': {'data': 'Test document content'}
        }
        
        # Call handler
        with patch.dict(os.environ, {'INVOKE_TYPE': 'classification', 'PROMPT': 'Classify this:', 'MODEL_ID': 'test-model'}):
            result = handler(event, None)
        
        # Verify result
        assert result == {'documentClassification': 'INVOICE'}
        
        # Verify is_chunked dimension is set to false
        mock_metrics.add_dimension.assert_any_call(name="is_chunked", value="false")
    
    @patch('index.bedrock')
    @patch('index.s3')
    @patch('index.tracer')
    @patch('index.metrics')
    def test_handler_with_chunk_metadata(self, mock_metrics, mock_tracer, mock_s3, mock_bedrock):
        """Test handler processes chunked documents with context."""
        # Setup mocks
        mock_bedrock.invoke_model.return_value = {
            'body': MagicMock(read=lambda: json.dumps({
                'content': [{'text': '{"documentClassification": "CONTRACT"}'}]
            }).encode())
        }
        mock_s3.download_file = MagicMock()
        mock_tracer.put_annotation = MagicMock()
        mock_tracer.capture_lambda_handler = lambda f: f
        mock_metrics.log_metrics = lambda f: f
        mock_metrics.add_dimension = MagicMock()
        mock_metrics.add_metric = MagicMock()
        
        event = {
            'documentId': 'doc-123',
            'contentType': 'data',
            'content': {'data': 'Test document content'},
            'chunkMetadata': {
                'chunkIndex': 1,
                'totalChunks': 3,
                'startPage': 50,
                'endPage': 99,
                'overlapPages': 5
            }
        }
        
        # Call handler
        with patch.dict(os.environ, {'INVOKE_TYPE': 'classification', 'PROMPT': 'Classify this:', 'MODEL_ID': 'test-model'}):
            result = handler(event, None)
        
        # Verify result
        assert result == {'documentClassification': 'CONTRACT'}
        
        # Verify is_chunked dimension is set to true
        mock_metrics.add_dimension.assert_any_call(name="is_chunked", value="true")
        
        # Verify chunk annotations are set
        mock_tracer.put_annotation.assert_any_call(key="chunkIndex", value="1")
        mock_tracer.put_annotation.assert_any_call(key="totalChunks", value="3")
    
    @patch('index.bedrock')
    @patch('index.s3')
    @patch('index.tracer')
    @patch('index.metrics')
    def test_prompt_includes_chunk_context(self, mock_metrics, mock_tracer, mock_s3, mock_bedrock):
        """Test that the prompt sent to Bedrock includes chunk context."""
        captured_body = None
        
        def capture_invoke(modelId, body):
            nonlocal captured_body
            captured_body = json.loads(body)
            return {
                'body': MagicMock(read=lambda: json.dumps({
                    'content': [{'text': '{"documentClassification": "INVOICE"}'}]
                }).encode())
            }
        
        mock_bedrock.invoke_model = capture_invoke
        mock_s3.download_file = MagicMock()
        mock_tracer.put_annotation = MagicMock()
        mock_tracer.capture_lambda_handler = lambda f: f
        mock_metrics.log_metrics = lambda f: f
        mock_metrics.add_dimension = MagicMock()
        mock_metrics.add_metric = MagicMock()
        
        event = {
            'documentId': 'doc-123',
            'contentType': 'data',
            'content': {'data': 'Test document content'},
            'chunkMetadata': {
                'chunkIndex': 2,
                'totalChunks': 5,
                'startPage': 100,
                'endPage': 149,
                'overlapPages': 0
            }
        }
        
        # Call handler
        with patch.dict(os.environ, {'INVOKE_TYPE': 'classification', 'PROMPT': 'Classify this document:', 'MODEL_ID': 'test-model'}):
            handler(event, None)
        
        # Verify the prompt includes chunk context
        assert captured_body is not None
        prompt_text = captured_body['messages'][0]['content'][0]['text']
        assert "You are analyzing chunk 3 of 5" in prompt_text
        assert "from pages 101 to 150" in prompt_text
        assert "Classify this document:" in prompt_text


if __name__ == '__main__':
    pytest.main([__file__, '-v'])


class TestProcessingChunkAwareness:
    """Tests for handler function chunk awareness in processing mode."""
    
    @patch('index.bedrock')
    @patch('index.s3')
    @patch('index.tracer')
    @patch('index.metrics')
    def test_processing_without_chunk_metadata(self, mock_metrics, mock_tracer, mock_s3, mock_bedrock):
        """Test processing handler processes non-chunked documents correctly (backward compatibility)."""
        # Setup mocks
        mock_bedrock.invoke_model.return_value = {
            'body': MagicMock(read=lambda: json.dumps({
                'content': [{'text': '{"documentClassification": "INVOICE", "result": {"entities": [{"type": "AMOUNT", "value": "$100.00"}]}}'}]
            }).encode())
        }
        mock_s3.download_file = MagicMock()
        mock_tracer.put_annotation = MagicMock()
        mock_tracer.capture_lambda_handler = lambda f: f
        mock_metrics.log_metrics = lambda f: f
        mock_metrics.add_dimension = MagicMock()
        mock_metrics.add_metric = MagicMock()
        
        event = {
            'documentId': 'doc-123',
            'contentType': 'data',
            'content': {'data': 'Test document content'},
            'classificationResult': {'documentClassification': 'INVOICE'}
        }
        
        # Call handler with processing mode
        with patch.dict(os.environ, {
            'INVOKE_TYPE': 'processing',
            'PROMPT': 'Extract entities from this [ACTUAL_CLASSIFICATION]:',
            'MODEL_ID': 'test-model'
        }):
            result = handler(event, None)
        
        # Verify result
        assert result['documentClassification'] == 'INVOICE'
        assert 'result' in result
        assert 'entities' in result['result']
        
        # Verify is_chunked dimension is set to false
        mock_metrics.add_dimension.assert_any_call(name="is_chunked", value="false")
    
    @patch('index.bedrock')
    @patch('index.s3')
    @patch('index.tracer')
    @patch('index.metrics')
    def test_processing_with_chunk_metadata(self, mock_metrics, mock_tracer, mock_s3, mock_bedrock):
        """Test processing handler processes chunked documents with context."""
        # Setup mocks
        mock_bedrock.invoke_model.return_value = {
            'body': MagicMock(read=lambda: json.dumps({
                'content': [{'text': '{"documentClassification": "CONTRACT", "result": {"entities": [{"type": "PARTY", "value": "Acme Corp", "page": 51}]}}'}]
            }).encode())
        }
        mock_s3.download_file = MagicMock()
        mock_tracer.put_annotation = MagicMock()
        mock_tracer.capture_lambda_handler = lambda f: f
        mock_metrics.log_metrics = lambda f: f
        mock_metrics.add_dimension = MagicMock()
        mock_metrics.add_metric = MagicMock()
        
        event = {
            'documentId': 'doc-123',
            'contentType': 'data',
            'content': {'data': 'Test document content'},
            'classificationResult': {'documentClassification': 'CONTRACT'},
            'chunkMetadata': {
                'chunkIndex': 1,
                'totalChunks': 3,
                'startPage': 50,
                'endPage': 99,
                'overlapPages': 5
            }
        }
        
        # Call handler with processing mode
        with patch.dict(os.environ, {
            'INVOKE_TYPE': 'processing',
            'PROMPT': 'Extract entities from this [ACTUAL_CLASSIFICATION]:',
            'MODEL_ID': 'test-model'
        }):
            result = handler(event, None)
        
        # Verify result
        assert result['documentClassification'] == 'CONTRACT'
        assert 'result' in result
        
        # Verify is_chunked dimension is set to true
        mock_metrics.add_dimension.assert_any_call(name="is_chunked", value="true")
        
        # Verify chunk annotations are set
        mock_tracer.put_annotation.assert_any_call(key="chunkIndex", value="1")
        mock_tracer.put_annotation.assert_any_call(key="totalChunks", value="3")
    
    @patch('index.bedrock')
    @patch('index.s3')
    @patch('index.tracer')
    @patch('index.metrics')
    def test_processing_prompt_includes_chunk_context(self, mock_metrics, mock_tracer, mock_s3, mock_bedrock):
        """Test that the processing prompt sent to Bedrock includes chunk context."""
        captured_body = None
        
        def capture_invoke(modelId, body):
            nonlocal captured_body
            captured_body = json.loads(body)
            return {
                'body': MagicMock(read=lambda: json.dumps({
                    'content': [{'text': '{"documentClassification": "INVOICE", "result": {"entities": []}}'}]
                }).encode())
            }
        
        mock_bedrock.invoke_model = capture_invoke
        mock_s3.download_file = MagicMock()
        mock_tracer.put_annotation = MagicMock()
        mock_tracer.capture_lambda_handler = lambda f: f
        mock_metrics.log_metrics = lambda f: f
        mock_metrics.add_dimension = MagicMock()
        mock_metrics.add_metric = MagicMock()
        
        event = {
            'documentId': 'doc-123',
            'contentType': 'data',
            'content': {'data': 'Test document content'},
            'classificationResult': {'documentClassification': 'INVOICE'},
            'chunkMetadata': {
                'chunkIndex': 2,
                'totalChunks': 5,
                'startPage': 100,
                'endPage': 149,
                'overlapPages': 0
            }
        }
        
        # Call handler with processing mode
        with patch.dict(os.environ, {
            'INVOKE_TYPE': 'processing',
            'PROMPT': 'Extract entities from this [ACTUAL_CLASSIFICATION]:',
            'MODEL_ID': 'test-model'
        }):
            handler(event, None)
        
        # Verify the prompt includes chunk context
        assert captured_body is not None
        prompt_text = captured_body['messages'][0]['content'][0]['text']
        assert "You are analyzing chunk 3 of 5" in prompt_text
        assert "from pages 101 to 150" in prompt_text
        assert "Extract entities from this INVOICE:" in prompt_text
    
    @patch('index.bedrock')
    @patch('index.s3')
    @patch('index.tracer')
    @patch('index.metrics')
    def test_processing_prompt_includes_overlap_info(self, mock_metrics, mock_tracer, mock_s3, mock_bedrock):
        """Test that the processing prompt includes overlap information when applicable."""
        captured_body = None
        
        def capture_invoke(modelId, body):
            nonlocal captured_body
            captured_body = json.loads(body)
            return {
                'body': MagicMock(read=lambda: json.dumps({
                    'content': [{'text': '{"documentClassification": "CONTRACT", "result": {"entities": []}}'}]
                }).encode())
            }
        
        mock_bedrock.invoke_model = capture_invoke
        mock_s3.download_file = MagicMock()
        mock_tracer.put_annotation = MagicMock()
        mock_tracer.capture_lambda_handler = lambda f: f
        mock_metrics.log_metrics = lambda f: f
        mock_metrics.add_dimension = MagicMock()
        mock_metrics.add_metric = MagicMock()
        
        event = {
            'documentId': 'doc-123',
            'contentType': 'data',
            'content': {'data': 'Test document content'},
            'classificationResult': {'documentClassification': 'CONTRACT'},
            'chunkMetadata': {
                'chunkIndex': 2,  # Not first chunk
                'totalChunks': 4,
                'startPage': 95,
                'endPage': 144,
                'overlapPages': 5
            }
        }
        
        # Call handler with processing mode
        with patch.dict(os.environ, {
            'INVOKE_TYPE': 'processing',
            'PROMPT': 'Extract entities from this [ACTUAL_CLASSIFICATION]:',
            'MODEL_ID': 'test-model'
        }):
            handler(event, None)
        
        # Verify the prompt includes overlap information
        assert captured_body is not None
        prompt_text = captured_body['messages'][0]['content'][0]['text']
        assert "You are analyzing chunk 3 of 4" in prompt_text
        assert "5 overlapping pages" in prompt_text
    
    @patch('index.bedrock')
    @patch('index.s3')
    @patch('index.tracer')
    @patch('index.metrics')
    def test_processing_uses_chunk_s3_location(self, mock_metrics, mock_tracer, mock_s3, mock_bedrock):
        """Test that processing uses chunk-specific S3 location when available."""
        captured_bucket = None
        captured_key = None
        
        def capture_download(bucket, key, local_path):
            nonlocal captured_bucket, captured_key
            captured_bucket = bucket
            captured_key = key
            # Create a dummy file
            with open(local_path, 'wb') as f:
                f.write(b'%PDF-1.4 dummy content')
        
        mock_bedrock.invoke_model.return_value = {
            'body': MagicMock(read=lambda: json.dumps({
                'content': [{'text': '{"documentClassification": "INVOICE", "result": {"entities": []}}'}]
            }).encode())
        }
        mock_s3.download_file = capture_download
        mock_tracer.put_annotation = MagicMock()
        mock_tracer.capture_lambda_handler = lambda f: f
        mock_metrics.log_metrics = lambda f: f
        mock_metrics.add_dimension = MagicMock()
        mock_metrics.add_metric = MagicMock()
        
        event = {
            'documentId': 'doc-123',
            'contentType': 'file',
            'content': {
                'location': 's3',
                'bucket': 'original-bucket',
                'key': 'raw/document.pdf'
            },
            'classificationResult': {'documentClassification': 'INVOICE'},
            'chunkMetadata': {
                'chunkIndex': 1,
                'totalChunks': 3,
                'startPage': 50,
                'endPage': 99,
                'bucket': 'chunk-bucket',
                'key': 'chunks/doc-123_chunk_1.pdf'
            }
        }
        
        # Call handler with processing mode
        with patch.dict(os.environ, {
            'INVOKE_TYPE': 'processing',
            'PROMPT': 'Extract entities from this [ACTUAL_CLASSIFICATION]:',
            'MODEL_ID': 'test-model'
        }):
            handler(event, None)
        
        # Verify chunk-specific S3 location was used
        assert captured_bucket == 'chunk-bucket'
        assert captured_key == 'chunks/doc-123_chunk_1.pdf'
    
    @patch('index.bedrock')
    @patch('index.s3')
    @patch('index.tracer')
    @patch('index.metrics')
    def test_processing_classification_replacement(self, mock_metrics, mock_tracer, mock_s3, mock_bedrock):
        """Test that [ACTUAL_CLASSIFICATION] placeholder is replaced in processing prompt."""
        captured_body = None
        
        def capture_invoke(modelId, body):
            nonlocal captured_body
            captured_body = json.loads(body)
            return {
                'body': MagicMock(read=lambda: json.dumps({
                    'content': [{'text': '{"documentClassification": "RECEIPT", "result": {"entities": []}}'}]
                }).encode())
            }
        
        mock_bedrock.invoke_model = capture_invoke
        mock_s3.download_file = MagicMock()
        mock_tracer.put_annotation = MagicMock()
        mock_tracer.capture_lambda_handler = lambda f: f
        mock_metrics.log_metrics = lambda f: f
        mock_metrics.add_dimension = MagicMock()
        mock_metrics.add_metric = MagicMock()
        
        event = {
            'documentId': 'doc-123',
            'contentType': 'data',
            'content': {'data': 'Test document content'},
            'classificationResult': {'documentClassification': 'RECEIPT'}
        }
        
        # Call handler with processing mode
        with patch.dict(os.environ, {
            'INVOKE_TYPE': 'processing',
            'PROMPT': 'The document is classified as [ACTUAL_CLASSIFICATION]. Extract entities:',
            'MODEL_ID': 'test-model'
        }):
            handler(event, None)
        
        # Verify the classification was replaced in the prompt
        assert captured_body is not None
        prompt_text = captured_body['messages'][0]['content'][0]['text']
        assert "[ACTUAL_CLASSIFICATION]" not in prompt_text
        assert "RECEIPT" in prompt_text
