import boto3
from strands import tool

s3 = boto3.client('s3')

@tool
def download_policy(bucket_name: str, policy_number: str) -> str:
    """Download the insurance policy associated with the given policy number

    Args:
        bucket_name (str): The name of the bucket where the insurance policy is stored
        policy_number (str): The insurance policy number
    Return:
        str: returns the full path where the file is stored
    """
    print(f"Found the following policy number: {policy_number}")
    s3_key = f"policies/{policy_number}.pdf"
    local_file = f"/tmp/{policy_number}.pdf"
    s3.download_file(bucket_name, s3_key, local_file)
        
    return local_file
