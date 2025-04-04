import json
import sqlite3
from dataclasses import dataclass
from typing import Optional, Dict, Any, Union, List
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
    id: Optional[int] = None

@dataclass
class FloorPlan:
    user_id: int
    name: str
    width: float
    height: float
    data: Union[str, Dict[str, Any]]  # Can be JSON string or dict
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    id: Optional[int] = None

@dataclass
class Document:
    floorplan_id: int
    element_id: str
    filename: str
    s3_key: str
    upload_date: Optional[str] = None
    id: Optional[int] = None

@dataclass
class Element:
    floorplan_id: int
    element_id: str
    element_type: str
    name: str
    description: str
    dangers: str
    safety_instructions: str
    trained_employees: str  # JSON string with employee IDs or names
    maintenance_schedule: str
    last_maintenance: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    id: Optional[int] = None

@dataclass
class RiskAssessment:
    element_id: int
    description: str
    frequency: int
    severity: int
    probability: int
    risk_score: int
    technical_measures: str  # JSON string with measures
    organizational_measures: str  # JSON string with measures
    personal_measures: str  # JSON string with measures
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    id: Optional[int] = None

@dataclass
class OperatingInstruction:
    element_id: int
    hazard_symbols: str  # JSON string with symbols and text
    protection_measures: str  # JSON string with measures and symbols
    first_aid: str  # JSON string with advice and symbols
    emergency_procedures: str  # JSON string with procedures and symbols
    maintenance_disposal: str  # Text
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    id: Optional[int] = None

@dataclass
class TrainingRecord:
    element_id: int
    employee_name: str
    training_name: str
    training_date: str
    document_ids: str  # JSON string with document IDs
    created_at: Optional[str] = None
    id: Optional[int] = None


# Create tables if they don't exist
users = db.t.users
if users not in db.t or modify: users = db.create(User,name='users',pk='id',transform=True)
floorplans = db.t.floorplans
if floorplans not in db.t or modify: floorplans = db.create(FloorPlan,name='floorplans',pk='id',transform=True)
documents = db.t.documents
if documents not in db.t or modify: documents = db.create(Document,name='documents',pk='id',transform=True)
elements = db.t.elements
if elements not in db.t or modify: elements = db.create(Element,name='elements',pk='id',transform=True)
risk_assessments = db.t.risk_assessments
if risk_assessments not in db.t or modify: risk_assessments = db.create(RiskAssessment,name='risk_assessments',pk='id',transform=True)
operating_instructions = db.t.operating_instructions
if operating_instructions not in db.t or modify: operating_instructions = db.create(OperatingInstruction,name='operating_instructions',pk='id',transform=True)
training_records = db.t.training_records
if training_records not in db.t or modify: training_records = db.create(TrainingRecord,name='training_records',pk='id',transform=True)
