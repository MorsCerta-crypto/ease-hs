import json
from datetime import datetime
from dataclasses import dataclass
from typing import Optional, Dict, Any, List, Union
from fasthtml.common import database
from s3 import generate_s3_document_url

# Initialize database
db = database('data/floorplan.db')

# Define tables for our application
users = db.t.users
floorplans = db.t.floorplans
documents = db.t.documents

# Create tables if they don't exist
if users not in db.t:
    users.create(
        username=str,
        email=str,
        password_hash=str,
        company_name=str,
        created_at=str,
        pk='id'
    )

if floorplans not in db.t:
    floorplans.create(
        user_id=int,
        name=str,
        width=float,
        height=float,
        data=str, # JSON string with elements
        created_at=str,
        updated_at=str,
        pk='id'
    )

if documents not in db.t:
    documents.create(
        floorplan_id=int,
        element_id=str,
        filename=str,
        s3_key=str,
        upload_date=str,
        pk='id'
    )

# Define dataclasses for type hints and structure
@dataclass
class UserDB:
    id: int
    username: str
    email: str
    password_hash: str
    company_name: Optional[str] = None
    created_at: Optional[str] = None

@dataclass
class FloorPlanDB:
    id: int
    user_id: int
    name: str
    width: float
    height: float
    data: Union[str, Dict[str, Any]]  # Can be JSON string or dict
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@dataclass
class DocumentDB:
    id: int
    floorplan_id: int
    element_id: str
    filename: str
    s3_key: str
    upload_date: Optional[str] = None

# Set dataclasses for tables
User = users.dataclass()
FloorPlan = floorplans.dataclass()
Document = documents.dataclass()


# User Management Functions
def create_user(username, email, password_hash, company_name=None):
    """Create a new user in the database"""
    try:
        now = datetime.now().isoformat()
        user_id = users.insert({
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "company_name": company_name,
            "created_at": now
        })
        return user_id
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return None

def get_user_by_username(username):
    """Get user by username"""
    try:
        return users.fetchone(where='username = ?',where_args=(username,))
    except Exception as e:
        print(f"Error getting user: {str(e)}")
        return None

# Database Floor Plan Functions
def create_floorplan_in_db(user_id, name, width, height, data=None)->FloorPlanDB|None:
    """Create a new floorplan in the database"""
    try:
        now = datetime.now().isoformat()
        floorplan_id = floorplans.insert({
            "user_id": user_id,
            "name": name,
            "width": width,
            "height": height,
            "data": json.dumps(data or {"elements": []}),
            "created_at": now,
            "updated_at": now
        })
        return floorplan_id
    except Exception as e:
        print(f"Error creating floorplan: {str(e)}")
        return None

def update_floorplan_in_db(floorplan_id, data):
    """Update a floorplan in the database"""
    try:
        now = datetime.now().isoformat()
        floorplans.update({
            "id": floorplan_id,
            "data": json.dumps(data),
            "updated_at": now
        })
        return True
    except Exception as e:
        print(f"Error updating floorplan: {str(e)}")
        return False

def get_floorplan_from_db(floorplan_id, user_id=None):
    """Get a floorplan from the database"""
    try:
        if user_id:
            floorplan = floorplans.fetchone(where='id = ? AND user_id = ?', where_args=(floorplan_id, user_id))
        else:
            floorplan = floorplans.fetchone(where='id = ?', where_args=(floorplan_id,))
        
        if floorplan:
            floorplan.data = json.loads(floorplan.data)
        return floorplan
    except Exception as e:
        print(f"Error getting floorplan: {str(e)}")
        return None

def get_user_floorplans(user_id):
    """Get all floorplans for a user"""
    try:
        return floorplans(where='user_id = ?', where_args=(user_id,))
    except Exception as e:
        print(f"Error getting user floorplans: {str(e)}")
        return []

def add_document_to_db(floorplan_id, element_id, filename, s3_key):
    """Add document metadata to database"""
    try:
        now = datetime.now().isoformat()
        doc_id = documents.insert({
            "floorplan_id": floorplan_id,
            "element_id": element_id,
            "filename": filename,
            "s3_key": s3_key,
            "upload_date": now
        })
        return doc_id
    except Exception as e:
        print(f"Error adding document to database: {str(e)}")
        return None

def get_element_documents(floorplan_id, element_id, user_id=None):
    """Get all documents for an element"""
    try:
        if user_id:
            # First verify that this floorplan belongs to the user
            floorplan = get_floorplan_from_db(floorplan_id, user_id)
            if not floorplan:
                return []
                
        docs = documents(where='floorplan_id = ? AND element_id = ?', where_args=(floorplan_id, element_id))
        for doc in docs:
            doc['url'] = generate_s3_document_url(doc['s3_key'])
        return docs
    except Exception as e:
        print(f"Error getting element documents: {str(e)}")
        return []