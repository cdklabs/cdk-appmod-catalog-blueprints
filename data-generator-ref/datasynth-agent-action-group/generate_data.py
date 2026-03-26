import json
from datetime import datetime
import boto3
import re
import os
import logging
import importlib.util
import sys
import io
import pandas as pd
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Amazon Bedrock Client
bedrock_client = boto3.client('bedrock-runtime', region_name='us-east-1')

# Initialize S3 client
s3_client = boto3.client('s3')

# Create a DynamoDB resource
dynamodb = boto3.resource('dynamodb')

# S3 bucket name and DynamoDB table name
S3_BUCKET = os.getenv('S3_BUCKET')
DYNAMODB_TABLE = os.getenv('DYNAMODB_TABLE')


# Use the DynamoDB object to select our table
table = dynamodb.Table(DYNAMODB_TABLE)

PRESIGNED_URL_EXPIRATION = 3600  # 1 hour

def create_module_from_code(python_code):
    """
    Dynamically create a Python module from a code string
    """
    module_name = 'generated_module'
    spec = importlib.util.spec_from_loader(module_name, loader=None)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    exec(python_code, module.__dict__)
    logger.info(f"Module contents: {dir(module)}")
    return module

def upload_to_s3(bucket, key, body):
    """
    Helper function to upload an object to S3 and return the presigned URL.
    """
    try:
        s3_client.put_object(Bucket=bucket, Key=key, Body=body)
        return generate_presigned_url(bucket, key)
    except Exception as e:
        logger.error(f"Error uploading to S3 (key: {key}): {str(e)}")
        raise

def generate_presigned_url(bucket, key, expiration=PRESIGNED_URL_EXPIRATION):
    """
    Generate a presigned URL for the given S3 object.
    """
    return s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': key},
        ExpiresIn=expiration
    )

def store_presigned_urls(session_id, timestamp, script_url, explanation_url, schema_url, csv_urls, json_urls):
    """
    Store all presigned URLs in a single row in DynamoDB.
    """
    try:
        table.put_item(
            Item={
                'SessionID': session_id,
                'Timestamp': timestamp,
                'ScriptURL': script_url,
                'ExplanationURL': explanation_url,
                'SchemaURL': schema_url,
                'CsvURL': [url for url in csv_urls],
                'JsonURL': [url for url in json_urls]
            }
        )
        logger.info("Stored all presigned URLs in DynamoDB.")
    except Exception as e:
        logger.error(f"Error storing URLs in DynamoDB: {str(e)}")
        raise


def handle_generation(use_case, field_definitions, num_files, session_id):
    logger.info("Entering handle_generation function")
    logger.info(f"Received data request for (session_id {session_id}): {use_case}")

    try:
        # Generate timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_path = f'{timestamp}_{session_id}'

        # Call the function to generate the script and explanation
        logger.info("Calling generate_synthetic_data_script")
        text_explanation, generated_python_script = generate_synthetic_data_script(use_case, field_definitions, num_files)
        logger.info("Successfully generated script and explanation")

        # Upload script to S3
        script_key = f'{base_path}/script/generated_script.py'
        script_url = upload_to_s3(S3_BUCKET, script_key, generated_python_script)

        # Upload full text explanation to S3
        explanation_key = f'{base_path}/text/generated_explanation.txt'
        explanation_url = upload_to_s3(S3_BUCKET, explanation_key, text_explanation)

        # Execute the generated script
        generated_module = create_module_from_code(generated_python_script)
        generator = generated_module.DataGenerator()

        # Generate datasets
        dataframes = generator.generate_datasets()
        logger.info(f"Dataframes: {dataframes}")
        for i, df in enumerate(dataframes):
            if isinstance(df, pd.DataFrame):
                logger.info(df.head())
            else:
                logger.error(f"Dataset {i} is not a DataFrame. Skipping...")
                continue

        # Prepare for parallelized uploads
        csv_urls = []
        json_urls = []
        futures = []

        with ThreadPoolExecutor(max_workers=10) as executor:  # Adjust max_workers as needed
            for i, df in enumerate(dataframes):
                if not isinstance(df, pd.DataFrame):
                    logger.error(f"Skipping invalid dataset at index {i}, type: {type(df)}")
                    continue

                # Convert DataFrame to CSV
                csv_key = f'{base_path}/data_csv/dataset_{i+1}.csv'
                csv_buffer = io.StringIO()
                df.to_csv(csv_buffer, index=False)
                futures.append(executor.submit(upload_to_s3, S3_BUCKET, csv_key, csv_buffer.getvalue()))
                
                # Convert DataFrame to JSON
                json_key = f'{base_path}/data_json/dataset_{i+1}.json'
                futures.append(executor.submit(upload_to_s3, S3_BUCKET, json_key, df.head(100).to_json(orient='records')))

            # Wait for all uploads to complete and collect results
            for future in futures:
                try:
                    url = future.result()
                    if 'data_csv' in url:
                        csv_urls.append(url)
                    elif 'data_json' in url:
                        json_urls.append(url)
                except Exception as e:
                    logger.error(f"Error during upload: {str(e)}")

        # Generate and upload schema
        schema_json = generator.generate_schema()
        schema_key = f'{base_path}/schema_json/data_schema.json'
        schema_url = upload_to_s3(S3_BUCKET, schema_key, json.dumps(schema_json))

        # Store all presigned URLs in DynamoDB
        store_presigned_urls(
            session_id=session_id,
            timestamp=timestamp,
            script_url=script_url,
            explanation_url=explanation_url,
            schema_url=schema_url,
            csv_urls=csv_urls,
            json_urls=json_urls
        )

        # Return generated result
        result = {
            'text_explanation': text_explanation,
            'generated_python_script': generated_python_script,
            'script_s3_key': script_key,
            'script_url': script_url,
            'explanation_s3_key': explanation_key,
            'explanation_url': explanation_url,
            'schema_s3_key': schema_key,
            'schema_url': schema_url,
            'csv_urls': csv_urls,
            'json_urls': json_urls
        }

        logger.info("Exiting handle_generation function successfully")
        return result
    except Exception as e:
        logger.error(f"Error in handle_generation: {str(e)}")
        raise
# Function to Generate Python Script with Bedrock
def generate_synthetic_data_script(use_case, field_definitions, num_files):
    logger.info("Entered handle_generation function successfully")
    # Define the prompt template to request Bedrock to create a Python script
    prompt = f"""
    You are a synthetic dataset generator. The user has provided a storyline or use case to guide data generation, and you are to respond by creating a Python script that generates synthetic data files according to the user's specifications.

    Here's the user's storyline and requirements:
    Use Case: {use_case}
    
    The dataset fields are:
    {', '.join([field['Field Name'] for field in field_definitions])}

    Please generate a Python script that:
    1. Uses synthetic data libraries like Faker, Mimesis, or FauxFactory based on the use case.
    2. Allows creation of {num_files} CSV file(s) containing realistic synthetic data.
    3. Creates fields based on each field's data type and constraints.
    4. Outputs data following any required distributions or dependencies between fields.
    5. Generate 10000 records

    Additionally, the script should:
    - Generate the JSON equivalent of the CSV data for each dataset created.
    - Generate the Data Schema in JSON format, with the following column details: columnName, dataType, description, and constraint.
    See example data schema in JSON format below:
    {{
  "columns": [
    {{
      "columnName": "Transaction_ID",
      "dataType": "Integer",
      "description": "Unique identifier for each transaction.",
      "constraint": "100 - 100000"
    }},
    {{
      "columnName": "Amount",
      "dataType": "Float",
      "description": "Monetary value of the transaction in USD.",
      "constraint": "0 - 9999999"
    }},
    {{
      "columnName": "Transaction_Type",
      "dataType": "String",
      "description": "Type of transaction (e.g., Transfer, Deposit, Withdrawal).",
      "constraint": "N/A"
    }},
    {{
      "columnName": "Originating_Country",
      "dataType": "String",
      "description": "Country where the transaction originated.",
      "constraint": "N/A"
    }},
    {{
      "columnName": "Destination_Country",
      "dataType": "String",
      "description": "Country where the transaction is headed.",
      "constraint": "N/A"
    }}
  ]
}}

    Note:
    - The script should include imports and comments explaining each step.
    - For reproducibility, include a random seed.
    - Example fields: ID, date, transaction amount, location, etc., if relevant to the use case.
    - Make the code efficient and ensure it can scale for large datasets.
    - Generated script should follow the script template written below. ALWAYS make sure to stick to the class name and function names written below.

    import required libraries (pandas, numpy, faker, random, json, StringIO from io)
    set random seeds for reproducibility

    ```python
    import required libraries (pandas, numpy, faker, random, json, StringIO from io)
    set random seeds for reproducibility

    Note: ALWAYS make sure to stick to the class name and function names. You are allowed to add functions but DO NOT MODIFY THE NAMES OF THE CLASS/FUNCTIONS BELOW
    class DataGenerator:
        def __init__(self, ...):
            - initialize 

        def generate_datasets(self):
            # Generates a dataset based on the provided schema and returns it as a pandas DataFrame.
            - create records
            - convert list of records to DataFrame(s) (ENSURE it is a pandas dataframe)
            return a LIST of pandas DataFrame(s)

        def generate_schema(self):
            # Generates a generic JSON schema template with field details.
            schema_template = {{
            "columns": [
                {{
                    "columnName": "Field_Name",
                    "dataType": "Data_Type",
                    "description": "Description of the field.",
                    "constraint": "Optional constraints like range, values, etc."
                }}
                # Modify and add more fields here
            ]
            }}

            return schema_template

        def process_dataframes(dataframes):
            results = []    
            for df in dataframes:
                # Convert DataFrame to JSON
                json_data = json.loads(df.head(100).to_json(orient='records'))
                # Convert DataFrame to CSV buffer
                csv_buffer = StringIO()
                df.to_csv(csv_buffer, index=False)
                csv_buffer.seek(0)  # Reset the buffer's position
                # Append JSON and CSV buffer to results
                results.append((json_data, csv_buffer))
            return results


    def main():
        generator = DataGenerator(all_relevant_params)

        df_list = generator.generate_datasets()
        schema_json = generator.generate_schema()

    if __name__ == "__main__":
        main()
    ```
    """

    kwargs = {
        "modelId": "us.anthropic.claude-3-5-haiku-20241022-v1:0",  
        "contentType": "application/json",
        "accept": "application/json",
        "body": json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 200000,
            "top_k": 250,
            "temperature": 1,
            "top_p": 0.999,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt  
                        }
                    ]
                }
            ]
        })
    }
    logger.info("Exiting handle_generation function successfully")
    response = bedrock_client.invoke_model(**kwargs)
    full_text = json.loads(response['body'].read())['content'][0]['text']

    code_match = re.search(r'```python\n(.*?)\n```', full_text, re.DOTALL)
    python_code = code_match.group(1) if code_match else None
    
    return full_text, python_code
