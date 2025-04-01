

import boto3,os,json
from dotenv import load_dotenv

load_dotenv()

# AWS S3 Configuration
S3_BUCKET = "ease-hs"
S3_REGION = "eu-central-1"
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")

# Initialize S3 client
s3_client = boto3.client(
    's3',
    region_name=S3_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY
)

# S3 Helper Functions
def upload_floorplan_to_s3(floorplan_id, floorplan_data):
    """Upload floorplan JSON to S3"""
    try:
        s3_key = f"floorplans/{floorplan_id}.json"
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(floorplan_data, indent=2),
            ContentType='application/json'
        )
        return s3_key
    except Exception as e:
        print(f"Error uploading floorplan to S3: {str(e)}")
        return None

def download_floorplan_from_s3(floorplan_id):
    """Download floorplan JSON from S3"""
    try:
        s3_key = f"floorplans/{floorplan_id}.json"
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
        floorplan_data = json.loads(response['Body'].read().decode('utf-8'))
        return floorplan_data
    except Exception as e:
        print(f"Error downloading floorplan from S3: {str(e)}")
        return None

def upload_document_to_s3(floorplan_id, element_id, file_data, filename):
    """Upload document to S3"""
    try:
        s3_key = f"documents/{floorplan_id}/{element_id}/{filename}"
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=file_data,
            ContentType='application/octet-stream'
        )
        return s3_key
    except Exception as e:
        print(f"Error uploading document to S3: {str(e)}")
        return None

def generate_s3_document_url(s3_key, expiration=3600):
    """Generate a presigned URL for document download"""
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': s3_key},
            ExpiresIn=expiration
        )
        return url
    except Exception as e:
        print(f"Error generating S3 URL: {str(e)}")
        return None