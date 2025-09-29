#!/usr/bin/env python3
"""
DataLoader Lambda Function

This Lambda function processes individual files from S3 and loads them into the database.
It's called by Step Functions for each file that needs to be processed.
"""

import json
import os
import logging
import boto3
import pymysql
import psycopg2
from typing import Dict, Any, Optional
import tempfile
import re

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')
secrets_client = boto3.client('secretsmanager')

class DatabaseConnection:
    """Handles database connections for MySQL and PostgreSQL"""
    
    def __init__(self, engine: str, connection_params: Dict[str, Any]):
        self.engine = engine.lower()
        self.connection_params = connection_params
        self.connection = None
    
    def connect(self):
        """Establish database connection"""
        try:
            if self.engine == 'mysql':
                self.connection = pymysql.connect(
                    host=self.connection_params['host'],
                    port=self.connection_params.get('port', 3306),
                    user=self.connection_params['username'],
                    password=self.connection_params['password'],
                    database=self.connection_params['database'],
                    charset='utf8mb4',
                    autocommit=False
                )
            elif self.engine == 'postgresql':
                self.connection = psycopg2.connect(
                    host=self.connection_params['host'],
                    port=self.connection_params.get('port', 5432),
                    user=self.connection_params['username'],
                    password=self.connection_params['password'],
                    database=self.connection_params['database']
                )
                self.connection.autocommit = False
            else:
                raise ValueError(f"Unsupported database engine: {self.engine}")
            
            logger.info(f"Successfully connected to {self.engine} database")
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {str(e)}")
            raise
    
    def execute_sql_file(self, file_content: str) -> Dict[str, Any]:
        """Execute SQL content from file against the database as a single operation"""
        if not self.connection:
            raise RuntimeError("Database connection not established")
        
        results = {
            'success': True,
            'file_executed': True,
            'errors': []
        }
        
        try:            
            if not file_content.strip():
                logger.info("No SQL content to execute after cleaning")
                return results
            
            logger.info("Executing entire SQL file content as a single transaction")
            
            # Execute the entire file content at once using the appropriate method for each database
            if self.engine == 'postgresql':
                self._execute_postgresql_file(file_content)
            elif self.engine == 'mysql':
                self._execute_mysql_file(file_content)
            
            logger.info("Successfully executed SQL file content")
            
        except Exception as e:
            logger.error(f"Failed to execute SQL file: {str(e)}")
            results['success'] = False
            results['file_executed'] = False
            results['errors'].append(str(e))
            raise
        
        return results
    
    def _execute_postgresql_file(self, sql_content: str):
        """Execute PostgreSQL file content as a single operation"""
        cursor = self.connection.cursor()
        try:
            # PostgreSQL can handle multiple statements in a single execute call
            cursor.execute(sql_content)
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise
        finally:
            cursor.close()
    
    def _execute_mysql_file(self, sql_content: str):
        """Execute MySQL file content as a single transaction"""
        cursor = self.connection.cursor()
        try:
            # For MySQL, we need to split statements but execute them all in one transaction
            statements = self._split_sql_statements(sql_content)
            
            # Execute all statements in a single transaction
            for statement in statements:
                statement = statement.strip()
                if statement and not statement.startswith('--'):
                    cursor.execute(statement)
            
            # Commit all changes as one transaction
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise
        finally:
            cursor.close()
    
    def _split_sql_statements(self, sql_content: str) -> list:
        """Split SQL content into individual statements"""
        # Remove comments
        sql_content = re.sub(r'--.*?\n', '\n', sql_content)
        sql_content = re.sub(r'/\*.*?\*/', '', sql_content, flags=re.DOTALL)
        
        # Split by semicolon, but be careful with strings and functions
        statements = []
        current_statement = ""
        in_string = False
        string_char = None
        
        i = 0
        while i < len(sql_content):
            char = sql_content[i]
            
            if not in_string and char in ["'", '"']:
                in_string = True
                string_char = char
            elif in_string and char == string_char:
                # Check if it's escaped
                if i > 0 and sql_content[i-1] != '\\':
                    in_string = False
                    string_char = None
            elif not in_string and char == ';':
                current_statement += char
                if current_statement.strip():
                    statements.append(current_statement.strip())
                current_statement = ""
                i += 1
                continue
            
            current_statement += char
            i += 1
        
        # Add the last statement if it doesn't end with semicolon
        if current_statement.strip():
            statements.append(current_statement.strip())
        
        return statements
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")

def get_database_credentials(secret_arn: str) -> Dict[str, Any]:
    """Retrieve database credentials from AWS Secrets Manager"""
    try:
        response = secrets_client.get_secret_value(SecretId=secret_arn)
        secret_data = json.loads(response['SecretString'])
        
        return {
            'host': secret_data.get('host'),
            'port': secret_data.get('port'),
            'username': secret_data.get('username'),
            'password': secret_data.get('password'),
            'database': os.environ.get('DATABASE_NAME')
        }
    
    except Exception as e:
        logger.error(f"Failed to retrieve database credentials: {str(e)}")
        raise

def download_file_from_s3(bucket_name: str, s3_key: str) -> str:
    """Download file from S3 and return its content"""
    try:
        logger.info(f"Downloading file s3://{bucket_name}/{s3_key}")
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.sql')
        temp_file_path = temp_file.name
        temp_file.close()
        
        # Download file
        s3_client.download_file(bucket_name, s3_key, temp_file_path)
        
        # Read file content
        with open(temp_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        logger.info(f"Successfully downloaded and read file {s3_key}")
        return content
        
    except Exception as e:
        logger.error(f"Failed to download file {s3_key}: {str(e)}")
        raise

def handler(event, context):
    """Lambda function handler"""
    logger.info(f"Processing event: {json.dumps(event)}")
    
    try:
        # Extract parameters from event
        s3_key = event.get('s3Key')
        bucket_name = event.get('bucketName') or os.environ.get('S3_BUCKET')
        
        if not s3_key:
            raise ValueError("s3Key is required in the event payload")
        
        if not bucket_name:
            raise ValueError("bucketName is required in the event payload or S3_BUCKET environment variable")
        
        logger.info(f"Processing file: s3://{bucket_name}/{s3_key}")
        
        # Download file content from S3
        file_content = download_file_from_s3(bucket_name, s3_key)
        
        # Get database credentials
        secret_arn = os.environ['DATABASE_SECRET_ARN']
        db_credentials = get_database_credentials(secret_arn)
        
        # Create database connection
        engine = os.environ['DATABASE_ENGINE']
        db_connection = DatabaseConnection(engine, db_credentials)
        db_connection.connect()
        
        try:
            # Execute the SQL file
            result = db_connection.execute_sql_file(file_content)
            
            logger.info(f"File processing completed successfully: {result}")
            
            return {
                'statusCode': 200,
                'body': {
                    'message': 'SQL file executed successfully',
                    's3Key': s3_key,
                    'result': result
                }
            }
        
        finally:
            db_connection.close()
    
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return {
            'statusCode': 500,
            'body': {
                'error': str(e),
                's3Key': event.get('s3Key', 'unknown')
            }
        }
