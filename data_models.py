# data_models.py
from fastlite import *
from fasthtml.common import * # For Path, etc.
from dataclasses import dataclass, field

db = database('data/layout_app.db') # Or ':memory:' for testing

@dataclass
class Building:
    name: str
    id: int = None # Auto-incrementing primary key

@dataclass
class LayoutElement:
    building_id: int # Foreign key to Building
    element_type: str # 'rect', 'line', 'circle', 'symbol'
    x: float
    y: float
    id: int = None
    width: float = None # For rect, symbol
    height: float = None # For rect, symbol
    x2: float = None # For line
    y2: float = None # For line
    radius: float = None # For circle
    stroke: str = 'black'
    fill: str = 'transparent' # or color, or none for lines
    symbol_kind: str = None # e.g., 'machine_type_a', 'closet_small'

@dataclass
class MachineInfo:
    element_id: int # Foreign key to the LayoutElement representing the machine/closet
    id: int = None
    name: str = "Default Name"
    description: str = ""
    documents: list[str] = field(default_factory=list) # List of filenames/paths

# Create tables if they don't exist
buildings = db.create(Building, transform=True, name='buildings')
layout_elements = db.create(LayoutElement, transform=True, name='layout_elements', foreign_keys=[('building_id','buildings','id')])
machine_infos = db.create(MachineInfo, transform=True, name='machine_infos', foreign_keys=[('element_id','layout_elements','id')]) # Cascade delete info if element is deleted

upload_dir = Path("uploads")
upload_dir.mkdir(exist_ok=True)