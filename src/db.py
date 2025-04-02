import json
import sqlite3
from dataclasses import dataclass
from typing import Optional, Dict, Any, Union
from fasthtml.common import database

# Initialize database
db = database('data/floorplan.db')
modify = True
@dataclass
class User:
    username: str
    email: str
    password_hash: str
    company_name: Optional[str] = None
    created_at: Optional[str] = None
    id: int = None

@dataclass
class FloorPlan:
    user_id: int
    name: str
    width: float
    height: float
    data: Union[str, Dict[str, Any]]  # Can be JSON string or dict
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    id: int = None

@dataclass
class Document:
    floorplan_id: int
    element_id: str
    filename: str
    s3_key: str
    upload_date: Optional[str] = None
    id: int = None

@dataclass
class ElementProperty:
    floorplan_id: int
    element_id: str
    element_type: str
    width: float
    properties: Union[str, Dict[str, Any]]  # Can be JSON string or dict
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    id: int = None


# Create tables if they don't exist
users = db.t.users
if users not in db.t or modify: users = db.create(User,name='users',pk='id',transform=True)
floorplans = db.t.floorplans
if floorplans not in db.t or modify: floorplans = db.create(FloorPlan,name='floorplans',pk='id',transform=True)
documents = db.t.documents
if documents not in db.t or modify: documents = db.create(Document,name='documents',pk='id',transform=True)
element_properties = db.t.element_properties
if element_properties not in db.t or modify: element_properties = db.create(ElementProperty,name='element_properties',pk='id',transform=True)
