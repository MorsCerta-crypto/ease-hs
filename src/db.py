import json
import sqlite3
from dataclasses import dataclass
from typing import Optional, Dict, Any, List, Union
from fasthtml.common import database

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