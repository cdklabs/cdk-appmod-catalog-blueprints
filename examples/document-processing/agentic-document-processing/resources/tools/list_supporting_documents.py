import boto3
from strands import tool

s3 = boto3.client('s3')

@tool
def list_supporting_documents(bucket_name: str, policy_number: str) -> dict:
    """List all supporting documents for a policy without downloading them
    
    Args:
        bucket_name (str): The name of the bucket
        policy_number (str): The insurance policy number
        
    Returns:
        dict: Information about available documents
    """
    s3_supporting_doc_prefix = f"supporting_documents/{policy_number}/"
    response = s3.list_objects_v2(Bucket=bucket_name, Prefix=s3_supporting_doc_prefix)
    
    documents = []
    if 'Contents' in response:
        for obj in response['Contents']:
            filename = obj['Key'].split('/')[-1]
            if filename:
                documents.append({
                    "filename": filename,
                    "s3_key": obj['Key']
                })
    
    return {
        "total_documents": len(documents),
        "documents": documents
    }