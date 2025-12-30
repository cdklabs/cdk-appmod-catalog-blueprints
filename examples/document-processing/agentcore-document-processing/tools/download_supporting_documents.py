import boto3
from strands import tool

s3 = boto3.client('s3')

@tool
def download_supporting_documents(bucket_name: str, policy_number: str) -> list[str]:
    """Given a policy number, download all the supporting documents that the customer has attached as part of their claim

    Args:
        bucket_name (str): The name of the bucket where the insurance policy is stored
        policy_number (str): The insurance policy number

    Returns:
        array: full local path of supporting documents
    """
    print(f"Found the following policy number: {policy_number}")
    s3_supporting_doc_prefix = f"supporting_documents/{policy_number}/"
    
    # List objects in the S3 prefix
    response = s3.list_objects_v2(Bucket=bucket_name, Prefix=s3_supporting_doc_prefix)
    
    result = []
    
    if 'Contents' in response:
        for obj in response['Contents']:
            s3_key = obj['Key']
            filename = s3_key.split('/')[-1]  # Extract filename from S3 key
            
            if filename:  # Skip empty filenames (directories)
                local_file = f"/tmp/{filename}"
                s3.download_file(bucket_name, s3_key, local_file)
                result.append(local_file)                
                   
    return result
